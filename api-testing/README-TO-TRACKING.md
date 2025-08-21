# TO Tracking Flow API Testing

This document describes the TO (Turnover) tracking flow testing for the Game Promotion API.

## Overview

The TO tracking flow tests validate the complete turnover tracking functionality, including:

- Creating promotions with turnover multipliers
- Updating total win amounts
- Updating total turnover
- Calculating TO requirements
- Checking TO progress
- Verifying final states
- **Automatic TO requirement calculation after promotion ticket creation**
- **Integration between promotion tickets and TO tracking when remainingBonusItems = 0**

## Test Collections

### Main TO Tracking Flow

**File:** `Game Promotion API - TO Tracking Flow.postman_collection.json`

### TO Requirement After Ticket Creation

**File:** `Game Promotion API - TO Requirement After Ticket Creation.postman_collection.json`

### Test Flow

1. **Create Promotion with Turnover Multiplier**
   - Creates a test promotion with `minTurnoverMultiplier: 25`
   - Validates promotion creation and multiplier setting
   - Saves promotion ID for subsequent tests

2. **Claim Promotion**
   - Claims the created promotion for a test player
   - Validates TO tracking fields are initialized correctly
   - Verifies `totalTurnover`, `totalWinAmount`, `minRequiredTurnover`, and `turnoverMultiplier`

3. **Create Promotion Ticket (Triggers Total Win Update)**
   - Creates a promotion ticket with `winAmount: 100.50`
   - **Automatically triggers total win amount update** (Single Source of Truth)
   - Validates ticket creation and automatic total win update

4. **Update Total Turnover**
   - Updates the player's total turnover to `500.75`
   - Validates successful update and response structure

5. **Check TO Progress**
   - Retrieves current TO progress
   - Validates remaining turnover calculation: `2512.50 - 500.75 = 2011.75`
   - Verifies all TO tracking fields

6. **Update Turnover to Meet Requirements**
   - Updates turnover to `2600.00` to meet requirements
   - Validates successful update

7. **Create Promotion Ticket**
   - Creates ticket with `winAmount: 50.25` and validates automatic total win update
   - Tests integration between promotion tickets and TO tracking

8. **Verify Final TO Progress**
   - Confirms TO requirements recalculated with new total win amount
   - Validates remaining turnover calculation with updated requirements

## Running the Tests

### Option 1: Run All Collections (CI/CD)

```bash
cd api-testing
npm test
```

### Option 2: Run TO Tracking Flow Only

```bash
cd api-testing
node test-to-tracking.js
```

### Option 3: Run TO Requirement After Ticket Creation Flow Only

```bash
cd api-testing
node test-to-requirement-after-ticket.js
```

### Option 4: Run with Specific Environment

```bash
cd api-testing
TRANSFORM_CONFIG=LOCAL STACK_NAME=l1 node index.js
```

## Test Data

### Sample Values Used

- **Turnover Multiplier:** 25
- **Initial Win Amount:** 100.50
- **Initial Turnover:** 500.75
- **Required Turnover:** 2512.50 (calculated)
- **Promotion Ticket Win Amount:** 50.25
- **Updated Total Win Amount:** 150.75 (100.50 + 50.25)
- **Updated Required Turnover:** 3768.75 (150.75 \* 25)
- **Final Turnover:** 2600.00
- **Final Remaining Turnover:** 1168.75 (3768.75 - 2600.00)

### Calculations Validated

- `minRequiredTurnover = totalWinAmount * turnoverMultiplier`
- `remainingTurnover = minRequiredTurnover - totalTurnover`
- Requirements met when `remainingTurnover <= 0`

## API Endpoints Tested

### Main TO Tracking Flow

1. `POST /promotions` - Create promotion with turnover multiplier
2. `POST /player-promotions/claim-promotion` - Claim promotion
3. `POST /promotion-tickets` - Create promotion ticket (triggers automatic total win update)
4. `POST /bonus-wins/update-total-turnover` - Update total turnover
5. `POST /bonus-wins/get-to-progress` - Get TO progress
6. `POST /bonus-wins/update-total-turnover` - Update turnover to meet requirements
7. `POST /promotion-tickets` - Create promotion ticket (triggers automatic total win update)
8. `POST /bonus-wins/get-to-progress` - Verify final TO progress

### TO Requirement After Ticket Creation Flow

1. `POST /promotions` - Create promotion with turnover multiplier
2. `POST /player-promotions/claim-promotion` - Claim promotion
3. `POST /player-promotions/deduct-bonus-item` - Deduct bonus items (set remainingBonusItems to 0)
4. `POST /promotion-tickets` - Create promotion ticket (triggers automatic TO requirement calculation)
5. `POST /bonus-wins/get-to-progress` - Check TO progress with updated requirements

## Expected Results

### Positive Test Cases

- ✅ All API calls return 201 status codes
- ✅ TO calculations are mathematically correct
- ✅ Response structures match expected schemas
- ✅ State transitions work correctly
- ✅ Requirements are properly validated

### Key Validations

- Turnover multiplier is stored and used correctly
- TO requirements are calculated accurately
- Progress tracking works as expected
- Promotion ticket creation automatically updates total win amount (Single Source of Truth)
- TO requirements are recalculated when total win amount changes
- **Automatic TO requirement calculation when remainingBonusItems = 0**
- **Integration between promotion tickets and TO tracking based on bonus item status**
- **Single entry point through promotion tickets for total win updates**
- All required fields are present in responses

## Environment Variables

The tests use environment variables from the Postman environment files:

- `baseUrl` - API base URL
- `operatorId` - Test operator ID
- `siteName` - Test site name
- `currencyGroup` - Test currency group
- `gameId` - Test game ID

## Troubleshooting

### Common Issues

1. **Environment not found** - Ensure environment file exists in `environments/` directory
2. **API not running** - Start the Game Promotion API server
3. **Database connection** - Ensure MongoDB is running and accessible
4. **Invalid test data** - Check environment variables are set correctly

### Debug Mode

To run with verbose output:

```bash
cd api-testing
DEBUG=* node test-to-tracking.js
```

## Integration with CI/CD

The TO tracking flow is automatically included in the main test suite and runs:

- In GitLab CI pipelines
- With different environments (LOCAL, LOCAL_1, LOCAL_2, LOCAL_3)
- For different markets (SG, VG)
- As part of the complete API testing workflow
