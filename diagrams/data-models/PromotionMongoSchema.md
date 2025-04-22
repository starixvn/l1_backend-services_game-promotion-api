# MongoDB Schema for FreeSpin Promotions

## Collections

### 1. Promotions Collection
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
    gameIds: [Number],              // List of eligible games, not null
    createdAt: ISODate,
    updatedAt: ISODate,
    betLevels: [                    // List of bet levels apply for this promotion
        {
            currencyGroup : ObjectId, 
            betLevel: Number
        } 
    ]
}
```

### 2. PlayerPromotions Collection
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
    lastUsedDate: ISODate,
    createdAt: ISODate,
    updatedAt: ISODate
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
    gameIds: [1001, 1002],
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
    createdAt: ISODate("2024-05-15T10:00:00Z"),
    updatedAt: ISODate("2024-05-15T10:00:00Z")
}

// Example player promotion document
{
    _id: ObjectId("65f1a2b3c4d5e6f7g8h9i0j2"),
    playerId: "player123",
    operatorId: "op123",
    siteId: "site456",
    promotionId: ObjectId("65f1a2b3c4d5e6f7g8h9i0j1"),
    promotionCode: "summer-classic-free-spins",
    currencyGroup: ObjectId("EUR_123"),
    remainingBonusItems: 50,
    lastUsedDate: null,
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
    gameIds: [1001],
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
    createdAt: ISODate("2024-06-10T10:00:00Z"),
    updatedAt: ISODate("2024-06-10T10:00:00Z")
}

// Example player promotion document
{
    _id: ObjectId("65f1a2b3c4d5e6f7g8h9i0j4"),
    playerId: "player123",
    operatorId: "op123",
    siteId: "site456",
    promotionId: ObjectId("65f1a2b3c4d5e6f7g8h9i0j3"),
    promotionCode: "vip-classic-free-spins",
    currencyGroup: ObjectId("USD_456"),
    remainingBonusItems: 100,
    lastUsedDate: null,
    createdAt: ISODate("2024-06-15T00:00:00Z"),
    updatedAt: ISODate("2024-06-15T00:00:00Z")
}
```

## Example Queries

### 1. Check Player's Active Promotion
```javascript
db.playerPromotions.findOne({
    operatorId: "op123",
    siteId: "site456",
    playerId: "player123",
    remainingBonusItems: { $gt: 0 }  // Active promotion has remaining bonus items
})
```

### 2. Find Available Promotions
```javascript
db.promotions.find({
    operatorId: "op123",
    offeredSiteNames: { $in: ["site456"] },  // Will match if site456 is in the offeredSiteNames array
    currencyGroups: ObjectId("EUR_123"),  // Will match if EUR_123 is in the currencyGroups array
    startDate: { $lte: new Date() },
    endDate: { $gt: new Date() }
})
```

### 3. Check Player Eligibility
```javascript
// For specific player list promotions
db.promotions.find({
    operatorId: "op123",
    offeredSiteNames: { $in: ["site456"] },  // Will match if site456 is in the offeredSiteNames array
    currencyGroups: ObjectId("EUR_123"),  // Will match if EUR_123 is in the currencyGroups array
    startDate: { $lte: new Date() },
    endDate: { $gt: new Date() },
    offeredPlayerIds: { $in: ["player123"] }  // Will match if player123 is in the offeredPlayerIds array
})

// For all players promotions
db.promotions.find({
    operatorId: "op123",
    offeredSiteNames: { $in: ["site456"] },  // Will match if site456 is in the offeredSiteNames array
    currencyGroups: ObjectId("EUR_123"),  // Will match if EUR_123 is in the currencyGroups array
    startDate: { $lte: new Date() },
    endDate: { $gt: new Date() },
    offeredPlayerIds: []  // Empty array means all players
})
```

### 4. Check Game Availability
```javascript
db.promotions.find({
    operatorId: "op123",
    offeredSiteNames: { $in: ["site456"] },  // Will match if site456 is in the offeredSiteNames array
    currencyGroups: ObjectId("EUR_123"),  // Will match if EUR_123 is in the currencyGroups array
    startDate: { $lte: new Date() },
    endDate: { $gt: new Date() },
    gameIds: 1001  // Will match if 1001 is in the gameIds array
})
``` 