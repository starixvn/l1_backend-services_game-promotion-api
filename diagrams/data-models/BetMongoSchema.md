# MongoDB Schema for Bets

## Collections

### 1. Bets Collection (promotion_bets)
```javascript
{
    _id: ObjectId,                    // BetId
    playerId: String,                 // Player identifier
    siteName: String,                   // Site identifier
    currency: String,
    operatorId: String,               // Operator identifier
    time: ISODate,               // When the bet was placed
    gameRoundId: Number,              // Game round identifier
    gameId: Number,               // Game type identifier
    promotionId: ObjectId,           // Optional reference to Promotions collection
    winningAmount: Number,                // Amount won
    baseWinningAmount: Number,  // Base amount won
}
```

## Example Data

```javascript
{
    _id: ObjectId("65f1a2b3c4d5e6f7g8h9i0j1"),
    playerId: "player123",
    siteId: "site456",
    time: ISODate("2024-06-01T10:00:00Z"),
    gameRoundId: 10001,
    gameId: 1, 
    currency: "EUR",
    operatorId: "op123",
    promotionId: 100,
    winningAmount: 100 + 10000000,
    baseWinningAmount: 100 + 10000000,
}
```


## Example Queries

### 1. Find Player's Bets for a Specific Promotion
```javascript
db.bets.find({
    playerId: "player123",
    operatorId: "op123",
    siteId: "site456",
    promotionId: ObjectId("65f1a2b3c4d5e6f7g8h9i0j1"),  // Summer Classic Free Spins
    isFreeSpin: true
})
```

### 2. Find All Free Spin Bets
```javascript
db.bets.find({
    playerId: "player123",
    operatorId: "op123",
    siteId: "site456",
    isFreeSpin: true,
    timestamp: { 
        $gte: ISODate("2024-06-01T00:00:00Z"),
        $lte: ISODate("2024-06-30T23:59:59Z")
    }
})
```

### 3. Calculate Total Free Spin Winnings
```javascript
db.bets.aggregate([
    {
        $match: {
            playerId: "player123",
            operatorId: "op123",
            siteId: "site456",
            promotionId: ObjectId("65f1a2b3c4d5e6f7g8h9i0j1"),
            isFreeSpin: true,
            paid: true
        }
    },
    {
        $group: {
            _id: "$promotionId",
            totalWinAmount: { $sum: "$winAmount" },
            totalBets: { $sum: 1 }
        }
    }
])
```

### 4. Find Unpaid Bets
```javascript
db.bets.find({
    playerId: "player123",
    operatorId: "op123",
    siteId: "site456",
    paid: false
})
``` 