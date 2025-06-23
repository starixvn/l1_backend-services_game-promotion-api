# MongoDB Schema for FreeSpin Promotions

## Collections

### 1. game_promotions Collection

```javascript
{
    _id: ObjectId,                    // PromotionId
    name: String,                     // PromotionName
    code: String,                     // PromotionCode (derived from name, e.g., "VIP Classic Free Spins" => "vip-classic-free-spins")
    operatorId: String,               // Operator identifier
    offeredSiteNames: [String],     // Array of site identifiers, empty value means offer all
    currencyGroups: [ObjectId],         // Array of currency groups (e.g., ["EUR_objid", "USD_objid"]), not allow empty
    startDate: ISODate,              // Start date and time
    endDate: ISODate,                // End date and time
    bonusItemCount: Number,              // Number of free spins per player
    offeredPlayerIds: [String],             // List of eligible player IDs (if not all players), empty means all
    gameConfigType: Number ,        // 2: "ClassicSlot" | 3: "CascadingSlot",
    gameIds: [Number],              // List of eligible games, not null (first game is target for TO calculation)
    createdAt: ISODate,
    updatedAt: ISODate,
    betLevels: [                    // List of bet levels apply for this promotion
        {
            currencyGroup : ObjectId,
            betLevel: Number
        }
    ],
    isGiftCode: Boolean,              // Indicates if this promotion is a gift code
    maxRedemptions: Number,           // Optional: Maximum total redemptions for this gift code
    totalRedemptions: Number,         // Current number of times the gift code has been redeemed
    maxRedemptionsPerPlayer: Number,   // Optional: Maximum redemptions per player (e.g., 1 for single-use)
    minTurnoverMultiplier: Number     // Minimum TO multiplier required (at least 2X) to claim bonus wins
}
```

### 2. game_player_promotions Collection

```javascript
{
    _id: ObjectId,
    playerId: String,
    operatorId: String,              // Operator identifier
    siteName: String,                // Site identifier (single site per player promotion)
    promotionId: ObjectId,           // Reference to Promotions collection
    promotionCode: String,           // Promotion code for quick reference
    currencyGroup: ObjectId,         // Currency group ObjectId for this player's promotion
    remainingBonusItems: Number,     // Number of remaining bonus items (0 means promotion is completed)
    initialBonusItem: Number,        // The initial number of bonus items
    betLevel: Number,                // Bet level for this promotion
    startDate: ISODate,              // Start date and time
    endDate: ISODate,                // End date and time
    lastUsedDate: ISODate,
    isGiftCode: Boolean,             // true if this promotion is from a gift code
    totalTurnover: Number,           // Total bet amount placed on target game (for TO calculation)
    totalWinAmount: Number,          // Total win amount from bonus items
    minRequiredTurnover: Number,     // Minimum TO required (totalWinAmount * minTurnoverMultiplier)
    createdAt: ISODate,
    updatedAt: ISODate
}
```

### 3. Gift Code Promotion

```javascript
// Promotion document for a gift code that can be redeemed multiple times by different players, but only once per player.
{
    _id: ObjectId("65f1a2b3c4d5e6f7g8h9i0j5"),
    name: "Welcome Gift Code",
    code: "WELCOME2024",
    operatorId: "op123",
    offeredSiteNames: [],
    currencyGroups: [ObjectId("USD_456")],
    startDate: ISODate("2024-01-01T00:00:00Z"),
    endDate: ISODate("2024-12-31T23:59:59Z"),
    bonusItemCount: 20,
    offeredPlayerIds: [], // Not player specific, anyone with code can redeem.
    gameConfigType: 3,  // CascadingSlot
    gameIds: [2001], // First game (2001) is target for TO calculation
    betLevels: [
        {
            currencyGroup: ObjectId("USD_456"),
            betLevel: 0.10
        }
    ],
    isGiftCode: true,
    maxRedemptions: 1000, // Can be redeemed 1000 times in total
    totalRedemptions: 450,
    maxRedemptionsPerPlayer: 1, // Each player can only redeem it once
    minTurnoverMultiplier: 3.0, // 3X TO required to claim bonus wins
    createdAt: ISODate("2024-01-01T10:00:00Z"),
    updatedAt: ISODate("2024-05-15T11:00:00Z")
}

// Example player promotion document after redemption
{
    _id: ObjectId("65f1a2b3c4d5e6f7g8h9i0j6"),
    playerId: "player789",
    operatorId: "op123",
    siteName: "site789",
    promotionId: ObjectId("65f1a2b3c4d5e6f7g8h9i0j5"),
    promotionCode: "WELCOME2024",
    currencyGroup: ObjectId("USD_456"),
    remainingBonusItems: 20,
    initialBonusItem: 20,
    betLevel: 0.10,
    startDate: ISODate("2024-01-01T00:00:00Z"),
    endDate: ISODate("2024-12-31T23:59:59Z"),
    lastUsedDate: null,
    isGiftCode: true,
    totalTurnover: 0.00, // Initial TO amount
    totalWinAmount: 0.00, // Initial win amount
    minRequiredTurnover: 0.00, // Will be calculated after bonus completion
    createdAt: ISODate("2024-06-20T14:00:00Z"),
    updatedAt: ISODate("2024-06-20T14:00:00Z")
}
```

## Example Data

### 1. Promotion for All Players

```javascript
// Promotion document
{
    _id: ObjectId("65f1a2b3c4d5e6f7g8h9i0j1"),
    name: "Summer Classic Free Spins",
    code: "summer-classic-free-spins",
    operatorId: "op123",
    offeredSiteNames: [],  // Offer to all sites
    currencyGroups: [ObjectId("EUR_123"), ObjectId("USD_456")],
    startDate: ISODate("2024-06-01T00:00:00Z"),
    endDate: ISODate("2024-06-30T23:59:59Z"),
    bonusItemCount: 50,
    offeredPlayerIds: [],  // Offer to all players
    gameConfigType: 2,  // ClassicSlot
    gameIds: [1001, 1002], // First game (1001) is target for TO calculation
    betLevels: [
        {
            currencyGroup: ObjectId("EUR_123"),
            betLevel: 0.20
        },
        {
            currencyGroup: ObjectId("USD_456"),
            betLevel: 0.25
        }
    ],
    minTurnoverMultiplier: 2.5, // 2.5X TO required
    createdAt: ISODate("2024-05-15T10:00:00Z"),
    updatedAt: ISODate("2024-05-15T10:00:00Z")
}

// Example player promotion document
{
    _id: ObjectId("65f1a2b3c4d5e6f7g8h9i0j2"),
    playerId: "player123",
    operatorId: "op123",
    siteName: "site456",
    promotionId: ObjectId("65f1a2b3c4d5e6f7g8h9i0j1"),
    promotionCode: "summer-classic-free-spins",
    currencyGroup: ObjectId("EUR_123"),
    remainingBonusItems: 50,
    initialBonusItem: 50,
    betLevel: 0.20,
    startDate: ISODate("2024-06-01T00:00:00Z"),
    endDate: ISODate("2024-06-01T00:00:00Z"),
    lastUsedDate: null,
    isGiftCode: false,
    totalTurnover: 0.00, // Initial TO amount
    totalWinAmount: 0.00, // Initial win amount
    minRequiredTurnover: 0.00, // Will be calculated after bonus completion
    createdAt: ISODate("2024-06-01T00:00:00Z"),
    updatedAt: ISODate("2024-06-01T00:00:00Z")
}
```

### 2. Promotion for Limited Players

```javascript
// Promotion document
{
    _id: ObjectId("65f1a2b3c4d5e6f7g8h9i0j3"),
    name: "VIP Classic Free Spins",
    code: "vip-classic-free-spins",
    operatorId: "op123",
    offeredSiteNames: ["site456"],
    currencyGroups: [ObjectId("USD_456"), ObjectId("GBP_789")],
    startDate: ISODate("2024-06-15T00:00:00Z"),
    endDate: ISODate("2024-06-30T23:59:59Z"),
    bonusItemCount: 100,
    offeredPlayerIds: ["player123", "player456", "player789"],
    gameConfigType: 2,  // ClassicSlot
    gameIds: [1001], // Single game (1001) is target for TO calculation
    betLevels: [
        {
            currencyGroup: ObjectId("USD_456"),
            betLevel: 0.25
        },
        {
            currencyGroup: ObjectId("GBP_789"),
            betLevel: 0.20
        }
    ],
    minTurnoverMultiplier: 2.0, // 2X TO required (minimum)
    createdAt: ISODate("2024-06-10T10:00:00Z"),
    updatedAt: ISODate("2024-06-10T10:00:00Z")
}

// Example player promotion document
{
    _id: ObjectId("65f1a2b3c4d5e6f7g8h9i0j4"),
    playerId: "player123",
    operatorId: "op123",
    siteName: "site456",
    promotionId: ObjectId("65f1a2b3c4d5e6f7g8h9i0j3"),
    promotionCode: "vip-classic-free-spins",
    currencyGroup: ObjectId("USD_456"),
    remainingBonusItems: 100,
    initialBonusItem: 100,
    betLevel: 0.25,
    startDate: ISODate("2024-06-15T00:00:00Z"),
    endDate: ISODate("2024-06-15T00:00:00Z"),
    lastUsedDate: null,
    isGiftCode: false,
    totalTurnover: 0.00, // Initial TO amount
    totalWinAmount: 0.00, // Initial win amount
    minRequiredTurnover: 0.00, // Will be calculated after bonus completion
    createdAt: ISODate("2024-06-15T00:00:00Z"),
    updatedAt: ISODate("2024-06-15T00:00:00Z")
}
```

## Example Queries

### 1. Check Player's Active Promotion

```javascript
db.game_player_promotions.findOne({
  operatorId: 'op123',
  siteName: 'site456',
  playerId: 'player123',
  remainingBonusItems: { $gt: 0 }, // Active promotion has remaining bonus items
});
```

### 2. Find Available Promotions

```javascript
db.game_promotions.find({
  operatorId: 'op123',
  offeredSiteNames: { $in: ['site456'] }, // Will match if site456 is in the offeredSiteNames array
  currencyGroups: ObjectId('EUR_123'), // Will match if EUR_123 is in the currencyGroups array
  startDate: { $lte: new Date() },
  endDate: { $gt: new Date() },
});
```

### 3. Check Player Eligibility

```javascript
// For specific player list promotions
db.game_promotions.find({
  operatorId: 'op123',
  offeredSiteNames: { $in: ['site456'] }, // Will match if site456 is in the offeredSiteNames array
  currencyGroups: ObjectId('EUR_123'), // Will match if EUR_123 is in the currencyGroups array
  startDate: { $lte: new Date() },
  endDate: { $gt: new Date() },
  offeredPlayerIds: { $in: ['player123'] }, // Will match if player123 is in the offeredPlayerIds array
});

// For all players promotions
db.game_promotions.find({
  operatorId: 'op123',
  offeredSiteNames: { $in: ['site456'] }, // Will match if site456 is in the offeredSiteNames array
  currencyGroups: ObjectId('EUR_123'), // Will match if EUR_123 is in the currencyGroups array
  startDate: { $lte: new Date() },
  endDate: { $gt: new Date() },
  offeredPlayerIds: [], // Empty array means all players
});
```

### 4. Check Game Availability

```javascript
db.game_promotions.find({
  operatorId: 'op123',
  offeredSiteNames: { $in: ['site456'] }, // Will match if site456 is in the offeredSiteNames array
  currencyGroups: ObjectId('EUR_123'), // Will match if EUR_123 is in the currencyGroups array
  startDate: { $lte: new Date() },
  endDate: { $gt: new Date() },
  gameIds: 1001, // Will match if 1001 is in the gameIds array
});
```

### 5. Check TO Requirements

```javascript
// Check if player has met minimum TO requirement
db.game_player_promotions.findOne({
  playerId: 'player123',
  operatorId: 'op123',
  siteName: 'site456',
  promotionId: ObjectId('65f1a2b3c4d5e6f7g8h9i0j1'),
  totalTurnover: { $gte: '$minRequiredTurnover' }, // TO requirement met
});

// Calculate remaining TO needed
db.game_player_promotions.aggregate([
  {
    $match: {
      playerId: 'player123',
      operatorId: 'op123',
      siteName: 'site456',
      promotionId: ObjectId('65f1a2b3c4d5e6f7g8h9i0j1'),
    },
  },
  {
    $project: {
      remainingTO: { $subtract: ['$minRequiredTurnover', '$totalTurnover'] },
      totalTurnover: 1,
      minRequiredTurnover: 1,
      totalWinAmount: 1,
    },
  },
]);
```

### 6. Update TO after bet placement

```javascript
// Update player's total TO when they place a bet on the target game
db.game_player_promotions.updateOne(
  {
    playerId: 'player123',
    operatorId: 'op123',
    siteName: 'site456',
    promotionId: ObjectId('65f1a2b3c4d5e6f7g8h9i0j1'),
  },
  {
    $inc: { totalTurnover: 0.5 }, // Add bet amount to total TO
  },
);
```

### 7. Update win amount and calculate TO requirement after bonus completion

```javascript
// After all bonus items are used, update total win amount and calculate TO requirement
db.game_player_promotions.updateOne(
  {
    playerId: 'player123',
    operatorId: 'op123',
    siteName: 'site456',
    promotionId: ObjectId('65f1a2b3c4d5e6f7g8h9i0j1'),
  },
  {
    $set: {
      totalWinAmount: 25.0, // Total win amount from all bonus items
      minRequiredTurnover: 62.5, // 25.00 * 2.5 = 62.50
    },
  },
);
```

### 8. Get target game for TO calculation

```javascript
// Get the target game (first game in gameIds array) for TO calculation
db.game_promotions.aggregate([
  {
    $match: {
      _id: ObjectId('65f1a2b3c4d5e6f7g8h9i0j1'),
    },
  },
  {
    $project: {
      targetGameId: { $arrayElemAt: ['$gameIds', 0] }, // First game is target
      minTurnoverMultiplier: 1,
      gameIds: 1,
    },
  },
]);
```

### 9. Redeem a Gift Code

```javascript
// Step 1: Find the promotion by its code.
const promotion = db.game_promotions.findOne({
  code: 'WELCOME2024',
  isGiftCode: true,
  startDate: { $lte: new Date() },
  endDate: { $gte: new Date() },
});

if (promotion) {
  // Step 2: Check if the promotion has reached its total redemption limit.
  if (promotion.maxRedemptions && promotion.totalRedemptions >= promotion.maxRedemptions) {
    // Handle error: Gift code limit reached
  }

  // Step 3: Check if the player has already redeemed this gift code.
  const playerRedemptions = db.game_player_promotions.count({
    playerId: 'player789',
    promotionId: promotion._id,
    isGiftCode: true,
  });

  if (playerRedemptions >= promotion.maxRedemptionsPerPlayer) {
    // Handle error: Player has already redeemed this code the maximum number of times.
  }

  // Step 4: If all checks pass, redeem the code.
  // - Create a new document in game_player_promotions.
  // - Atomically increment totalRedemptions in the promotion.
  db.game_promotions.updateOne({ _id: promotion._id }, { $inc: { totalRedemptions: 1 } });
  // ... logic to create game_player_promotions document with TO requirements ...
} else {
  // Handle error: Invalid or expired gift code
}
```
