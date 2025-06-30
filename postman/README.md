# Game Promotion API - Postman Test Collections

This directory contains two comprehensive Postman collections for testing different aspects of the Game Promotion API.

## Collections Overview

### 📋 Collection 1: Complete Lifecycle Flow

**File:** `Game-Promotion-API-Complete-Flow.postman_collection.json`

Tests the complete end-to-end promotion lifecycle:

1. **Create Promotion** (50 bonus items)
2. **Claim Promotion**
3. **Check Available Promotions**
4. **Deduct Bonus Item** (1st spin)
5. **Create Promotion Ticket** (1st result)
6. **Deduct Bonus Item** (2nd spin)
7. **Create Promotion Ticket** (2nd result)
8. **Verify Final State** (48 remaining items)

### 🎯 Collection 2: Deduction Verification Flow

**File:** `Game-Promotion-API-Deduction-Verification.postman_collection.json`

Focuses on testing deduction accuracy and state verification:

1. **Create Promotion** (25 bonus items)
2. **Claim Promotion** (record initial state)
3. **Deduct Bonus Item** (first deduction)
4. **Verify Deduction** (claim again to check)
5. **Multiple Deductions Test** (second deduction)
6. **Final Verification** (comprehensive state check)

## Key Features

### ✅ Enhanced Response Validation

Both collections now validate the **new response format**:

- ✅ **Success responses**: Only `{ success: true }` (no unnecessary codes)
- ✅ **Error responses**: Include proper error codes and messages
- ✅ **Field integrity**: All promotion fields maintained correctly

### 🔄 Smart Variable Management

- **Shared variables**: `operatorId`, `siteName`, `currencyGroup`, etc.
- **Unique test runs**: Each collection generates unique player IDs
- **State tracking**: Variables maintain test state across requests
- **Cross-collection compatibility**: Same base configuration

### 📊 Comprehensive Testing

- **State verification**: Before/after comparisons
- **Multiple deductions**: Sequential deduction testing
- **Field integrity**: All promotion fields remain correct
- **Timestamp validation**: `lastUsedDate` updates properly
- **Business logic**: Atomic operations and data consistency

## Collection Variables

Both collections use these configurable variables:

| Variable        | Default Value           | Description         |
| --------------- | ----------------------- | ------------------- |
| `baseUrl`       | `http://localhost:3000` | API base URL        |
| `operatorId`    | `operator123`           | Test operator ID    |
| `siteName`      | `testsite`              | Test site name      |
| `currencyGroup` | `USD`                   | Currency group      |
| `gameId`        | `1001`                  | Game ID for tickets |

### Additional Variables (Deduction Collection)

| Variable                 | Description                      |
| ------------------------ | -------------------------------- |
| `testRunId`              | Unique identifier for test run   |
| `existingPromotionId`    | ID of existing promotion to test |
| `playerId`               | Player ID for deduction tests    |
| `initialRemainingItems`  | Starting bonus item count        |
| `expectedRemainingItems` | Expected count after deductions  |
| `initialBonusItemCount`  | Initial bonus items of promotion |

## How to Use

### Prerequisites

1. Ensure your Game Promotion API is running on `http://localhost:3000`
2. Have MongoDB running with the required collections
3. Import both collections into Postman

### Running the Tests

#### Option 1: Complete Lifecycle Flow

1. Import `Game-Promotion-API-Complete-Flow.postman_collection.json`
2. Click "Run Collection"
3. Select all 8 requests
4. Click "Run" to execute the complete lifecycle
5. Expected result: **48 remaining bonus items** after full flow

#### Option 2: Deduction Verification Flow

1. Import `Game-Promotion-API-Deduction-Verification.postman_collection.json`
2. **Set `existingPromotionId` variable** to an existing promotion ID
3. Click "Run Collection"
4. Select all 6 requests
5. Click "Run" to execute deduction verification
6. Expected result: **2 items deducted** from the existing promotion

#### Option 3: Run Both Collections

1. Import both collections
2. Run them in any order (they use different players)
3. Compare results and verify different scenarios

### Expected Results

#### Complete Lifecycle Flow

- ✅ **16+ test assertions** passing
- ✅ Promotion created with **50 bonus items**
- ✅ Player claims promotion successfully
- ✅ **2 bonus items deducted** and **2 tickets created**
- ✅ Final state: **48 remaining bonus items**
- ✅ All response formats validated

#### Deduction Verification Flow

- ✅ **12+ test assertions** passing
- ✅ Uses **existing promotion** (no creation needed)
- ✅ **Precise deduction tracking** (initial → -1 → -2)
- ✅ **Multiple deduction verification**
- ✅ **Field integrity** maintained throughout
- ✅ **State consistency** verified

## API Response Formats

### ✅ Updated Response Structure

The API now uses **cleaner response formats**:

#### Success Responses (Simplified)

```json
{
  "success": true
}
```

#### Success Responses (With Data)

```json
{
  "success": true,
  "promotion": { ... },
  "ticket": { ... }
}
```

#### Error Responses (Detailed)

```json
{
  "success": false,
  "code": "SB3001",
  "message": "Cannot deduct bonus item"
}
```

### Response Examples

#### Create Promotion Response

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Test Free Spins Promotion",
  "code": "FREE_SPINS_1234567890",
  "operatorId": "operator123",
  "bonusItemCount": 50,
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-12-31T23:59:59.000Z",
  "currencyGroups": ["USD"],
  "offeredSiteNames": ["testsite"],
  "gameIds": [1001]
}
```

#### Claim Promotion Response

```json
{
  "promotion": {
    "playerId": "player456",
    "operatorId": "operator123",
    "siteName": "testsite",
    "promotionId": "507f1f77bcf86cd799439011",
    "promotionCode": "FREE_SPINS_1234567890",
    "remainingBonusItems": 50,
    "initialBonusItem": 50,
    "betLevel": 1,
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-12-31T23:59:59.000Z",
    "lastUsedDate": null
  }
}
```

#### Deduct Bonus Item Response (Success)

```json
{
  "success": true
}
```

#### Create Promotion Ticket Response

```json
{
  "success": true,
  "ticket": {
    "_id": "507f1f77bcf86cd799439013",
    "playerId": "player456",
    "operatorId": "operator123",
    "promotionId": "507f1f77bcf86cd799439011",
    "gameId": 1001,
    "gameRoundId": 789,
    "appType": 1,
    "betAmount": 0.01,
    "winAmount": 15.5,
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

## Test Coverage

### Complete Lifecycle Flow Coverage

- ✅ **End-to-end workflow**: Full promotion lifecycle
- ✅ **Promotion ticket integration**: Complete ticket creation flow
- ✅ **Business logic validation**: Comprehensive state verification
- ✅ **Response format validation**: New simplified success responses

### Deduction Verification Flow Coverage

- ✅ **Deduction accuracy**: Precise item count tracking
- ✅ **State persistence**: Database consistency verification
- ✅ **Multiple operations**: Sequential deduction testing
- ✅ **Field integrity**: All promotion data maintained
- ✅ **Timestamp tracking**: `lastUsedDate` updates correctly

## Benefits of Split Collections

### 🎯 **Focused Testing**

- Each collection targets specific functionality
- Easier to debug specific issues
- Cleaner test organization

### 🔄 **Better Maintainability**

- Smaller, more manageable files
- Independent test execution
- Specific variable scoping

### 📊 **Enhanced Coverage**

- Two different test scenarios
- Complementary validation approaches
- Comprehensive API testing

### 🚀 **Improved Usability**

- Choose the right collection for your needs
- Faster individual test execution
- Clear separation of concerns

## Troubleshooting

### Common Issues

1. **"Promotion not found" errors**

   - Ensure the API is running and accessible
   - Check that MongoDB is running with proper collections

2. **Variable not set errors**

   - Run tests in sequence (variables are set by previous tests)
   - Check that collection variables are properly configured

3. **Deduction failed errors**
   - Verify the promotion has remaining bonus items
   - Check that the promotion is still active (not expired)

### Debug Tips

1. **Check Console Output**: Both collections include detailed console logging
2. **Verify Variables**: Use the Postman console to check variable values
3. **Run Individual Tests**: Execute tests one by one to isolate issues
4. **Compare Collections**: Run both flows to compare different scenarios
