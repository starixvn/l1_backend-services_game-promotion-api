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

## Test Collection

**File:** `Game Promotion API - TO Tracking Flow.postman_collection.json`

### Test Flow

1. **Create Promotion with Turnover Multiplier**
   - Creates a test promotion with `minTurnoverMultiplier: 25`
   - Validates promotion creation and multiplier setting
   - Saves promotion ID for subsequent tests

2. **Claim Promotion**
   - Claims the created promotion for a test player
   - Validates TO tracking fields are initialized correctly
   - Verifies `totalTurnover`, `totalWinAmount`, `minRequiredTurnover`, and `turnoverMultiplier`

3. **Update Total Win Amount**
   - Updates the player's total win amount to `100.50`
   - Validates successful update and response structure

4. **Update Total Turnover**
   - Updates the player's total turnover to `500.75`
   - Validates successful update and response structure

5. **Calculate TO Requirements**
   - Calculates minimum required turnover based on win amount and multiplier
   - Validates calculation: `100.50 * 25 = 2512.50`
   - Verifies response structure and data accuracy

6. **Check TO Progress**
   - Retrieves current TO progress
   - Validates remaining turnover calculation: `2512.50 - 500.75 = 2011.75`
   - Verifies all TO tracking fields

7. **Update Turnover to Meet Requirements**
   - Updates turnover to `2600.00` to meet requirements
   - Validates successful update

8. **Verify Final TO Progress**
   - Verifies TO requirements are met
   - Validates remaining turnover is 0 or negative
   - Confirms final state with excess turnover

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

### Option 3: Run with Specific Environment

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
- **Final Turnover:** 2600.00
- **Remaining Turnover:** -87.50 (requirements met with excess)

### Calculations Validated

- `minRequiredTurnover = totalWinAmount * turnoverMultiplier`
- `remainingTurnover = minRequiredTurnover - totalTurnover`
- Requirements met when `remainingTurnover <= 0`

## API Endpoints Tested

1. `POST /promotions` - Create promotion with turnover multiplier
2. `POST /player-promotions/claim-promotion` - Claim promotion
3. `POST /player-promotions/update-total-win` - Update total win amount
4. `POST /player-promotions/update-total-turnover` - Update total turnover
5. `POST /player-promotions/calculate-to-requirement` - Calculate TO requirements
6. `POST /player-promotions/get-to-progress` - Get TO progress

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
- Final state shows requirements met
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
