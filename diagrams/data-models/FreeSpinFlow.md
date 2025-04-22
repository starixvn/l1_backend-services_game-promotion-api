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

## Flow Diagram

```mermaid
sequenceDiagram
    participant Player
    participant Game
    participant PP as PlayerPromotion
    participant B as Bet
    participant S as System

    Note over PP: Initial State
    Note over PP: remainingBonusItems: 50

    Player->>Game: Open Game
    Game->>PP: Check available bonus items
    PP->>Game: Confirm bonus items available
    
    Player->>Game: Place Free Spin Bet
    Game->>B: Create Bet
    B->>PP: Deduct 1 bonus item
    Note over PP: remainingBonusItems: 49
    B->>PP: Record bet with promotionId
    Note over B: isFreeSpin: true
    Note over B: amount: 0.00
    Note over B: winAmount: 5.00

    alt Win
        B->>PP: Update lastUsedDate
        Note over B: paid: true
    else Loss
        B->>PP: Update lastUsedDate
        Note over B: paid: true
    end

    Note over PP: Check Completion
    alt All bonus items used
        Note over PP: remainingBonusItems: 0
        Note over PP: Promotion completed
    else Bonus items remaining
        Note over PP: Continue promotion
    end
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

### 3. Free Spin Bet States
```mermaid
stateDiagram-v2
    [*] --> Created: Bet placed
    Created --> Paid: Win/Loss determined
    Paid --> [*]
```

## Data Flow

1. **Player to Game**:
   - Player opens game
   - Game checks available bonus items
   - Player places free spin bet

2. **Game to Bet**:
   - Bet is created
   - Bonus item is deducted from PlayerPromotion
   - Bet is recorded with promotion reference

3. **Bet to PlayerPromotion**:
   - Update `lastUsedDate` after spin
   - Check completion when `remainingBonusItems` reaches 0

## Example Scenarios

### 1. Successful Free Spin
```javascript
// Before spin
PlayerPromotion: { remainingBonusItems: 50 }
Bet: { isFreeSpin: true, amount: 0.00 }

// After spin
PlayerPromotion: { remainingBonusItems: 49, lastUsedDate: "2024-06-01T11:00:00Z" }
Bet: { isFreeSpin: true, amount: 0.00, winAmount: 5.00, paid: true }
```

### 2. Last Free Spin
```javascript
// Before spin
PlayerPromotion: { remainingBonusItems: 1 }
Bet: { isFreeSpin: true, amount: 0.00 }

// After spin
PlayerPromotion: { remainingBonusItems: 0, lastUsedDate: "2024-06-01T11:00:00Z" }
Bet: { isFreeSpin: true, amount: 0.00, winAmount: 0.00, paid: true }
```

## Validation Rules

1. **Game Opening**:
   - Check if player has available bonus items
   - Verify game is eligible for promotion
   - Confirm promotion is active

2. **Spin Deduction**:
   - Must have remaining bonus items > 0
   - Must be within promotion dates
   - Must be for eligible game

3. **Bet Creation**:
   - Verify promotion is active
   - Verify player is eligible
   - Set isFreeSpin = true
   - Set amount = 0.00 