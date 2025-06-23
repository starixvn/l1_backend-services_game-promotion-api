# FreeSpin Flow

This document describes the flow for handling free spins in the promotion system.

## Overview

Free spins are bonus items that allow players to play games without placing real money bets. The system tracks the usage of free spins and ensures proper validation and settlement.

## Flow Diagram

```mermaid
sequenceDiagram
    participant Player
    participant Game
    participant PP as PlayerPromotion
    participant B as BetSystem
    participant PT as PromotionTicket
    participant S as Settlement

    Note over PP: Initial State
    Note over PP: remainingBonusItems: 50

    Player->>Game: Open Game
    Game->>PP: Check available bonus items
    PP->>Game: Confirm bonus items available

    Player->>Game: Place Free Spin Bet

    %% Step 1: Deduct free spin BEFORE placing bet
    Game->>PP: Deduct 1 bonus item
    Note over PP: remainingBonusItems: 49
    Note over PP: lastUsedDate: updated
    PP->>Game: Return deduction success + updated state

    %% Step 2: Attempt to place bet
    Game->>B: Create Bet
    Note over B: isFreeSpin: true
    Note over B: amount: 0.00
    Note over B: promotionId: xxx

    alt Bet Placement Successful
        B->>Game: Bet created successfully
        Note over B: betId: generated
        Note over B: status: pending

        %% Step 3: End game and settle
        Game->>S: End Game & Settle
        S->>B: Process settlement
        Note over B: winAmount: calculated
        Note over B: status: settled
        S->>Game: Settlement complete

        %% Step 4: Create promotion ticket (regardless of win/loss)
        Game->>PT: Create Promotion Ticket
        Note over PT: Record:
        Note over PT: - playerId
        Note over PT: - operatorId
        Note over PT: - gameId
        Note over PT: - gameRoundId
        Note over PT: - appType
        Note over PT: - betAmount: 0.00
        Note over PT: - winAmount: from settlement
        PT->>Game: Ticket created

        Game->>Player: Free spin completed successfully

    else Bet Placement Failed
        B->>Game: Bet creation failed
        Game->>PP: Rollback bonus item deduction
        Note over PP: remainingBonusItems: 50 (restored)
        PP->>Game: Rollback successful
        Game->>Player: Free spin failed - bonus item restored
    end
```

## TO Requirement Flow with Stream Messaging

```mermaid
sequenceDiagram
    participant Player
    participant Game
    participant PP as PlayerPromotion
    participant B as BetSystem
    participant PT as PromotionTicket
    participant BonusWinStream
    participant BetSettledStream
    participant BonusWinConsumer
    participant TurnoverConsumer

    Note over PP: Initial State
    Note over PP: remainingBonusItems: 50
    Note over PP: totalTurnover: 0.00
    Note over PP: totalWinAmount: 0.00
    Note over PP: minRequiredTurnover: 0.00

    Player->>Game: Use All Bonus Items
    Game->>PT: Create tickets for each bonus
    Note over PT: Record win amounts
    PT->>BonusWinStream: Push bonusWin event
    Note over BonusWinStream: Event: {playerId, promotionId, winAmount, gameId}

    BonusWinStream->>BonusWinConsumer: Consume bonusWin event
    BonusWinConsumer->>PP: Update totalWinAmount
    Note over PP: totalWinAmount: 25.00
    BonusWinConsumer->>PP: Calculate TO requirement
    Note over PP: minRequiredTurnover: 50.00 (25.00 * 2.0)

    Player->>Game: Place Bet on Target Game (First in gameIds array)
    Game->>B: Create Bet
    B->>Game: Bet created successfully
    Note over B: betAmount: 0.50
    Note over B: gameId: 1001 (first in gameIds)

    B->>BetSettledStream: Push bet.settled event
    Note over BetSettledStream: Event: {playerId, promotionId, betAmount, gameId, isSettled}

    BetSettledStream->>TurnoverConsumer: Consume bet.settled event
    TurnoverConsumer->>PP: Update Total Turnover
    Note over PP: totalTurnover: 0.50
    Note over PP: remainingTO: 49.50
    PP->>Game: TO updated

    Player->>Game: Place Another Bet on Target Game
    Game->>B: Create Bet
    B->>Game: Bet created successfully
    Note over B: betAmount: 1.00
    Note over B: gameId: 1001 (first in gameIds)

    B->>BetSettledStream: Push bet.settled event
    BetSettledStream->>TurnoverConsumer: Consume bet.settled event
    TurnoverConsumer->>PP: Update Total Turnover
    Note over PP: totalTurnover: 1.50
    Note over PP: remainingTO: 48.50
    PP->>Game: TO updated

    Player->>Game: Try to Claim Bonus Win
    Game->>PP: Check TO Requirement
    alt TO Requirement Not Met (1.50 < 50.00)
        PP->>Game: TO requirement not met
        Game->>Player: Cannot claim bonus wins yet
        Note over Player: Need 48.50 more TO
    else TO Requirement Met
        PP->>Game: TO requirement satisfied
        Game->>Player: Bonus win claimed successfully
    end
```

## Stream Event Models

### BonusWin Event

```javascript
{
    eventType: "bonusWin",
    playerId: "player123",
    operatorId: "op123",
    siteName: "site456",
    promotionId: "65f1a2b3c4d5e6f7g8h9i0j1",
    gameId: 1001,
    gameRoundId: 789,
    winAmount: 5.00,
    betAmount: 0.00,
    timestamp: "2024-06-15T10:30:00Z",
    metadata: {
        isFreeSpin: true,
        promotionCode: "vip-classic-free-spins"
    }
}
```

### BetSettled Event

```javascript
{
    eventType: "bet.settled",
    playerId: "player123",
    operatorId: "op123",
    siteName: "site456",
    promotionId: "65f1a2b3c4d5e6f7g8h9i0j1",
    gameId: 1001,
    gameRoundId: 790,
    betAmount: 0.50,
    winAmount: 0.00,
    timestamp: "2024-06-15T10:35:00Z",
    metadata: {
        isFreeSpin: false,
        isTargetGame: true
    }
}
```

## Event Consumer Implementation

### BonusWin Consumer

```javascript
// Consumer for bonusWin events
class BonusWinConsumer {
  async consume(event) {
    const { playerId, operatorId, siteName, promotionId, winAmount } = event;

    // Update totalWinAmount
    await this.playerPromotionService.updateTotalWinAmount(
      playerId,
      operatorId,
      siteName,
      promotionId,
      winAmount,
    );

    // Check if all bonus items are completed
    const playerPromotion = await this.playerPromotionService.findByPromotion(
      playerId,
      operatorId,
      siteName,
      promotionId,
    );

    if (playerPromotion.remainingBonusItems === 0) {
      // Calculate TO requirement
      await this.playerPromotionService.calculateTORequirement(
        playerId,
        operatorId,
        siteName,
        promotionId,
      );
    }
  }
}
```

### Turnover Consumer

```javascript
// Consumer for bet.settled events
class TurnoverConsumer {
  async consume(event) {
    const { playerId, operatorId, siteName, promotionId, betAmount, gameId } = event;

    // Check if this is the target game for TO calculation
    const promotion = await this.promotionService.findById(promotionId);
    const targetGameId = promotion.gameIds[0]; // First game is target

    if (gameId === targetGameId) {
      // Update totalTurnover
      await this.playerPromotionService.updateTotalTurnover(
        playerId,
        operatorId,
        siteName,
        promotionId,
        betAmount,
      );
    }
  }
}
```

## TO Requirement Validation Flow

```mermaid
sequenceDiagram
    participant Player
    participant Game
    participant PP as PlayerPromotion
    participant B as BetSystem
    participant BonusWinStream
    participant BetSettledStream

    Player->>Game: Complete All Bonus Items
    Game->>BonusWinStream: Push bonusWin events
    Note over BonusWinStream: Multiple events for each bonus

    BonusWinStream->>PP: Update totalWinAmount
    Note over PP: totalWinAmount: 25.00
    PP->>PP: Calculate TO requirement
    Note over PP: minRequiredTurnover: 50.00

    Player->>Game: Request Bonus Win Claim
    Game->>PP: Check Promotion Status
    PP->>Game: Return promotion details
    Note over Game: Check:
    Note over Game: - totalWinAmount > 0
    Note over Game: - totalTurnover >= minRequiredTurnover
    Note over Game: - promotion is active
    Note over Game: - game is first in gameIds array

    alt TO Requirement Met
        Game->>PP: Allow bonus win claim
        Game->>Player: Bonus win claimed successfully
    else TO Requirement Not Met
        Game->>Player: TO requirement not met
        Note over Player: Need more bets on target game
    end
```

## Data Models

### Player Promotion State

```javascript
{
    playerId: "player123",
    operatorId: "op123",
    siteName: "site456",
    promotionId: ObjectId("65f1a2b3c4d5e6f7g8h9i0j1"),
    remainingBonusItems: 0, // All bonus items used
    initialBonusItem: 50,
    betLevel: 0.20,
    totalTurnover: 15.50,        // Current TO amount
    totalWinAmount: 25.00,       // Total win from all bonus items
    minRequiredTurnover: 50.00,  // Required TO (25.00 * 2.0)
    lastUsedDate: ISODate("2024-06-15T10:30:00Z"),
    isGiftCode: false
}
```

### Promotion Configuration

```javascript
{
    _id: ObjectId("65f1a2b3c4d5e6f7g8h9i0j1"),
    name: "Summer Classic Free Spins",
    bonusItemCount: 50,
    betLevels: [
        {
            currencyGroup: ObjectId("EUR_123"),
            betLevel: 0.20
        }
    ],
    minTurnoverMultiplier: 2.0,  // 2X TO required
    gameIds: [1001, 1002],       // First game (1001) is target for TO calculation
}
```

## Validation Rules

1. **Bonus Item Availability**:

   - Check if player has available bonus items > 0
   - Verify game is eligible for promotion
   - Confirm promotion is active and within date range

2. **Deduction Validation**:

   - Atomic operation to prevent race conditions
   - Store previous state for rollback capability
   - Update lastUsedDate immediately

3. **Bet Creation Validation**:

   - Verify all game parameters
   - Ensure proper promotion reference
   - Set isFreeSpin = true, amount = 0.00

4. **Rollback Validation**:

   - Only allow rollback within same session
   - Verify rollback data integrity
   - Restore exact previous state

5. **Ticket Creation**:

   - Always create ticket after settlement
   - Record actual win/loss amounts
   - Include all relevant game metadata

6. **TO Requirement Validation**:
   - Check if totalTurnover >= minRequiredTurnover
   - Only count bets on first game in gameIds array
   - Update totalTurnover after each bet placement via stream
   - Calculate minRequiredTurnover after bonus completion via stream
   - Prevent bonus win claim if TO requirement not met

## TO Calculation Examples

### Example 1: Standard Promotion

- **Total Win Amount**: 25.00 (after completing all bonus items)
- **Min Turnover Multiplier**: 2.0X
- **Min Required TO**: 25.00 × 2.0 = 50.00
- **Target Game**: First game in gameIds array (e.g., Game ID 1001)

### Example 2: VIP Promotion

- **Total Win Amount**: 75.00 (after completing all bonus items)
- **Min Turnover Multiplier**: 3.0X
- **Min Required TO**: 75.00 × 3.0 = 225.00
- **Target Game**: First game in gameIds array (e.g., Game ID 1001)

### Example 3: Gift Code

- **Total Win Amount**: 4.00 (after completing all bonus items)
- **Min Turnover Multiplier**: 2.0X (minimum)
- **Min Required TO**: 4.00 × 2.0 = 8.00
- **Target Game**: First game in gameIds array (e.g., Game ID 2001)

## Error Handling

### TO Requirement Not Met

- **Error Code**: `TO_REQUIREMENT_NOT_MET`
- **Message**: "Minimum turnover requirement not met. Need {remainingTO} more bets on target game."
- **Action**: Player must place more bets on target game before claiming bonus wins

### Invalid Target Game

- **Error Code**: `INVALID_TARGET_GAME`
- **Message**: "Bet must be placed on target game {targetGameId} (first in gameIds array) for TO calculation."
- **Action**: Player must place bets on the correct target game

### Promotion Expired

- **Error Code**: `PROMOTION_EXPIRED`
- **Message**: "Promotion has expired. Cannot use remaining bonus items."
- **Action**: Promotion is no longer valid

### Bonus Not Completed

- **Error Code**: `BONUS_NOT_COMPLETED`
- **Message**: "All bonus items must be completed before calculating TO requirement."
- **Action**: Player must complete all bonus items first

### Stream Processing Error

- **Error Code**: `STREAM_PROCESSING_ERROR`
- **Message**: "Error processing stream event. Please try again."
- **Action**: Retry stream processing or manual intervention

## Implementation Notes

1. **TO Tracking**: Total turnover is updated atomically after each bet placement on the target game via stream
2. **Win Amount Tracking**: Total win amount is calculated after all bonus items are completed via stream
3. **TO Calculation**: TO requirement is calculated as totalWinAmount × minTurnoverMultiplier
4. **Game Specificity**: Only bets on the first game in gameIds array count toward TO requirement
5. **Minimum Multiplier**: All promotions must have at least 2.0X TO multiplier
6. **Real-time Updates**: TO progress is updated in real-time as bets are placed via stream
7. **Target Game**: The first game in the gameIds array is always used as the target game for TO calculation
8. **Bonus Completion**: TO requirement is only calculated after all bonus items are used
9. **Stream Resilience**: Implement retry logic and dead letter queues for failed stream processing
10. **Event Ordering**: Ensure proper ordering of events for accurate calculations
