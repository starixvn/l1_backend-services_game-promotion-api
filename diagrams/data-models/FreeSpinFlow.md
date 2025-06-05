# Free Spin Count Deduction Flow

## Player Promotion Insertion Flow

```mermaid
sequenceDiagram
    participant Player
    participant Auth
    participant Promotions
    participant PlayerPromotions
    participant System

    Player->>Auth: Sign In
    Auth->>System: Authenticate Player

    System->>Promotions: Find Running Promotions
    Note over Promotions: Check:
    Note over Promotions: - Current date between startDate and endDate
    Note over Promotions: - Player's site in offeredSiteNames
    Note over Promotions: - Player's currency in currencyGroups
    Note over Promotions: - Player in offeredPlayerIds or all players

    Promotions-->>System: Return Active Promotions

    loop For Each Active Promotion
        System->>PlayerPromotions: Check Existing Record
        Note over PlayerPromotions: Check:
        Note over PlayerPromotions: - Same playerId
        Note over PlayerPromotions: - Same promotionId
        Note over PlayerPromotions: - Same siteName

        alt No Existing Record
            System->>PlayerPromotions: Create New Record
            Note over PlayerPromotions: Set:
            Note over PlayerPromotions: - playerId
            Note over PlayerPromotions: - operatorId
            Note over PlayerPromotions: - siteName
            Note over PlayerPromotions: - promotionId
            Note over PlayerPromotions: - promotionCode
            Note over PlayerPromotions: - currencyGroup
            Note over PlayerPromotions: - remainingBonusItems = bonusItemCount
            Note over PlayerPromotions: - lastUsedDate = null
        else Existing Record Found
            Note over System: Skip - Already has promotion
        end
    end
```

## Updated Free Spin Deduction Flow (Robust with Rollback)

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

        %% Step 2b: Rollback deduction
        Game->>PP: Rollback - Add 1 bonus item back
        Note over PP: remainingBonusItems: 50 (restored)
        Note over PP: lastUsedDate: reverted
        PP->>Game: Rollback successful

        Game->>Player: Free spin failed - bonus restored
    end

    Note over PP: Check Completion
    alt All bonus items used
        Note over PP: remainingBonusItems: 0
        Note over PP: Promotion completed
    else Bonus items remaining
        Note over PP: Continue promotion
    end
```

## New Service Methods Required

### PlayerPromotionService

```typescript
// New method for rollback functionality
async rollbackBonusItemDeduction(
  operatorId: string,
  playerId: string,
  promotionId: string
): Promise<RollbackResponse>

// Enhanced deduct method that returns previous state for rollback
async deductBonusItemWithRollbackData(
  operatorId: string,
  playerId: string,
  promotionId: string
): Promise<DeductWithRollbackResponse>
```

### PromotionTicketService

```typescript
// Create promotion ticket after settlement (uses standard createTicket method)
async createTicket(
  createTicketDto: CreatePromotionTicketDto
): Promise<CreatePromotionTicketResponse>
```

## State Transitions

### 1. Promotion Creation

```mermaid
stateDiagram-v2
    [*] --> PromotionCreated
    PromotionCreated --> Active: Start date reached
    Active --> Ended: End date reached
```

### 2. Player Promotion States

```mermaid
stateDiagram-v2
    [*] --> Available: Promotion assigned
    Available --> InProgress: First free spin used
    InProgress --> Completed: All spins used
    InProgress --> Available: More spins available
    Completed --> [*]
```

### 3. Enhanced Free Spin Bet States

```mermaid
stateDiagram-v2
    [*] --> BonusDeducted: Deduct bonus item
    BonusDeducted --> BetCreated: Bet placement success
    BonusDeducted --> Rollback: Bet placement failed
    Rollback --> [*]: Bonus restored
    BetCreated --> Settled: Game settlement
    Settled --> TicketCreated: Promotion ticket logged
    TicketCreated --> [*]: Process complete
```

## Data Flow

1. **Pre-Bet Phase**:

   - Player opens game
   - Game checks available bonus items
   - Player initiates free spin

2. **Deduction Phase**:

   - Deduct bonus item BEFORE bet creation
   - Store rollback data for potential restoration

3. **Bet Phase**:

   - Attempt to create bet
   - If successful: proceed to settlement
   - If failed: rollback bonus deduction

4. **Settlement Phase**:

   - Process game result
   - Calculate win/loss amounts
   - Update bet status

5. **Tracking Phase**:
   - Create promotion ticket for analytics
   - Record all transaction details

## Example Scenarios

### 1. Successful Free Spin Flow

```javascript
// Step 1: Before deduction
PlayerPromotion: { remainingBonusItems: 50 }

// Step 2: After deduction (before bet)
PlayerPromotion: { remainingBonusItems: 49, lastUsedDate: "2024-06-01T11:00:00Z" }

// Step 3: After successful bet & settlement
Bet: { isFreeSpin: true, amount: 0.00, winAmount: 5.00, status: "settled" }
PromotionTicket: { playerId: "123", betAmount: 0.00, winAmount: 5.00 }
```

### 2. Failed Bet with Rollback

```javascript
// Step 1: Before deduction
PlayerPromotion: { remainingBonusItems: 50 }

// Step 2: After deduction
PlayerPromotion: { remainingBonusItems: 49, lastUsedDate: "2024-06-01T11:00:00Z" }

// Step 3: Bet fails, rollback triggered
PlayerPromotion: { remainingBonusItems: 50, lastUsedDate: null } // Restored
// No bet record created
// No promotion ticket created
```

## Validation Rules

1. **Pre-Deduction Validation**:

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
