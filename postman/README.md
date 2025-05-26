# Game Promotion API - Postman Flow Tests

This Postman collection contains comprehensive positive test scenarios for the complete promotion flow.

## Test Flow Overview

The collection tests the following complete flow:

1. **Create Promotion** → 2. **Claim Promotion** → 3. **Deduct Bonus Item** → 4. **Insert Promotion Ticket**

## Test Scenarios

### 1. Create Promotion

- Creates a new promotion with 50 free spins
- Uses dynamic timestamp for unique promotion codes
- Validates promotion creation response

### 2. Claim Promotion

- Player claims the created promotion (returns 201 Created)
- Verifies initial state (50 remaining bonus items, null lastUsedDate)
- Saves promotion data for subsequent tests

### 3. Check Available Promotions

- Verifies player has no available promotions (already has one active)
- Confirms promotion claiming logic works correctly

### 4-5. First Free Spin Flow

- **Deduct Bonus Item**: Removes 1 bonus item (49 remaining)
- **Create Promotion Ticket**: Records the spin result (bet: $0.01, win: $15.50)

### 6-7. Second Free Spin Flow

- **Deduct Bonus Item**: Removes another bonus item (48 remaining)
- **Create Promotion Ticket**: Records the spin result (bet: $0.01, win: $0.00)

### 8. Final State Verification

- Verifies final promotion state
- Confirms 48 remaining bonus items after successful flow

## Collection Variables

The collection uses the following variables that you can customize:

| Variable        | Default Value           | Description         |
| --------------- | ----------------------- | ------------------- |
| `baseUrl`       | `http://localhost:3000` | API base URL        |
| `operatorId`    | `operator123`           | Test operator ID    |
| `playerId`      | `player456`             | Test player ID      |
| `siteName`      | `testsite`              | Test site name      |
| `currencyGroup` | `USD`                   | Currency group      |
| `gameId`        | `1001`                  | Game ID for tickets |
| `gameRoundId`   | `round789`              | Game round ID       |

## How to Use

### Prerequisites

1. Ensure your Game Promotion API is running on `http://localhost:3000`
2. Have MongoDB running with the required collections
3. Import the collection into Postman

### Running the Tests

#### Option 1: Run Complete Collection

1. Import `Game-Promotion-API-Flow-Tests.postman_collection.json` into Postman
2. Click "Run Collection"
3. Select all requests
4. Click "Run Game Promotion API - Flow Tests"
5. Watch all tests execute in sequence

#### Option 2: Run Individual Requests

1. Execute requests in order (1-8)
2. Each request depends on the previous ones
3. Variables are automatically set between requests

### Expected Results

When all tests pass, you should see:

- ✅ 20+ test assertions passing
- Promotion created with unique code
- Player promotion claimed successfully
- 2 bonus items deducted and tickets created
- Final state: 48 remaining bonus items

## Test Assertions

Each request includes multiple test assertions:

### Status Code Checks

- All requests verify correct HTTP status codes (201)
- All POST endpoints return 201 Created (NestJS default behavior)

### Response Structure Validation

- Validates required fields in responses
- Checks data types and values
- Ensures proper error code responses

### Business Logic Verification

- Confirms bonus item counts decrease correctly
- Validates promotion ticket data accuracy
- Tests rollback restoration logic

### State Management

- Verifies promotion state transitions
- Confirms atomic operations work correctly
- Tests data consistency across requests

## Error Codes Tested

The collection validates these error codes:

- `SB3002`: Bonus item deducted successfully
- `PT3300`: Promotion ticket created successfully

## Customization

### Changing Test Data

Update collection variables to test with different:

- Player IDs
- Operator IDs
- Game configurations
- Win amounts

### Adding More Scenarios

You can extend the collection by:

- Adding more deduction/ticket cycles
- Testing edge cases (0 remaining items)
- Adding negative test scenarios
- Testing different game types

## Troubleshooting

### Common Issues

1. **Connection Refused**: Ensure API is running on correct port
2. **Database Errors**: Verify MongoDB is running and accessible
3. **Validation Errors**: Check request body formats match API expectations
4. **Sequence Errors**: Run requests in order, don't skip steps

### Debug Tips

- Check Postman Console for detailed request/response logs
- Verify collection variables are set correctly
- Ensure database has required test data
- Check API logs for server-side errors

## Integration with CI/CD

This collection can be run in automated environments using Newman:

```bash
# Install Newman
npm install -g newman

# Run collection
newman run Game-Promotion-API-Flow-Tests.postman_collection.json \
  --environment your-environment.json \
  --reporters cli,json \
  --reporter-json-export results.json
```

## Real-World Usage Simulation

This test collection simulates a realistic free spins promotion scenario:

1. Casino creates a 50 free spins promotion
2. Player logs in and automatically gets the promotion
3. Player plays 2 free spins successfully
4. System tracks all spin results for analytics
5. Final state shows accurate remaining spins (48 remaining)

This mirrors the actual game flow where players use free spins and the system tracks everything accurately for proper promotion management.
