# Quickstart: MongoDB Audit Logging for Promotion Cancellation

**Feature**: GL-5286-end-promotion  
**Date**: 2025-10-30  
**Audience**: Developers implementing the MongoDB audit logging enhancement

---

## Overview

This guide provides step-by-step instructions for adding MongoDB persistent audit logging to the existing `cancelPromotion` feature. You'll integrate ActionLogService to complement the existing Sentry logging, creating a dual logging strategy for compliance and queryability.

**What You'll Build**:
- Inject ActionLogService into PromotionService ✅
- Add MongoDB logging call after successful cancellation ✅
- Elevate Sentry log level to 'critical' ✅
- Add unit tests verifying ActionLogService integration ✅
- Create integration test for MongoDB persistence ✅

**Estimated Time**: 2-3 hours

---

## Prerequisites

Before starting, ensure you have:

1. ✅ **Development Environment Setup**:
   - Node.js 18+ installed
   - MongoDB running locally or accessible via connection string
   - Project dependencies installed (`npm install`)

2. ✅ **Existing Feature Implemented**:
   - `PromotionService.cancelPromotion()` method exists
   - `PATCH /promotions/:id/cancel` endpoint working
   - Unit tests for cancelPromotion passing

3. ✅ **MongoDB Logs Connection Configured**:
   - `MONGODB_LOGS_URI` environment variable set
   - ActionLogModule using 'logs' connection
   - Verify: `src/core/action-log/action-log.module.ts` uses `'logs'` connection name

---

## Step 1: Verify Module Dependencies

### 1.1 Check CoreModule Exports

**File**: `src/core/core.module.ts`

**Verify** ActionLogModule is imported and exported:

```typescript
import { ActionLogModule } from './action-log/action-log.module';

@Module({
  imports: [ActionLogModule],
  // ... other imports
  exports: [LoggerService, TracingService, ActionLogModule], // ← Verify this
})
export class CoreModule {}
```

**Expected**: ✅ ActionLogModule should be in the `exports` array.

### 1.2 Check PromotionModule Imports

**File**: `src/promotion/promotion.module.ts`

**Verify** CoreModule is imported:

```typescript
import { CoreModule } from '../core/core.module';

@Module({
  imports: [
    CoreModule, // ← Verify this import exists
    MongooseModule.forFeature([
      { name: Promotion.name, schema: PromotionSchema },
      { name: PlayerPromotion.name, schema: PlayerPromotionSchema },
    ]),
    // ... other imports
  ],
  // ... rest of configuration
})
export class PromotionModule {}
```

**Expected**: ✅ CoreModule should be in the `imports` array.

**If Missing**: Add `CoreModule` to imports array:
```typescript
imports: [
  CoreModule, // ADD THIS
  // ... existing imports
],
```

---

## Step 2: Inject ActionLogService

### 2.1 Update PromotionService Imports

**File**: `src/promotion/services/promotion.service.ts`

**Add** ActionLogService import at the top:

```typescript
import { ActionLogService } from '../../core/action-log/services/action-log.service';
```

**Full Import Section** should look like:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Promotion, PromotionDocument } from '../schemas/promotion.schema';
import { LoggerService } from '../../core/logger/logger.service';
import { ActionLogService } from '../../core/action-log/services/action-log.service'; // ← ADD THIS
import { PROMOTION_ERROR_CODES } from '../../constants/error-codes';
import { PROMOTION_CANCELLED } from '../../constants/api-messages'; // Message constant, not action name
// ... other imports
```

### 2.2 Update Constructor

**Location**: Inside `PromotionService` class

**Before**:
```typescript
constructor(
  @InjectModel(Promotion.name)
  private readonly promotionModel: Model<PromotionDocument>,
  private readonly logger: LoggerService,
) {}
```

**After**:
```typescript
constructor(
  @InjectModel(Promotion.name)
  private readonly promotionModel: Model<PromotionDocument>,
  private readonly logger: LoggerService,
  private readonly actionLogService: ActionLogService, // ← ADD THIS LINE
) {}
```

**Verification**: Run `npm run build` - no compilation errors should occur.

---

## Step 3: Update cancelPromotion Method

### 3.1 Locate Existing Implementation

**File**: `src/promotion/services/promotion.service.ts`

**Find** the `cancelPromotion` method (around line 490-530):

```typescript
async cancelPromotion(promotionId: string, adminUserId: string): Promise<PromotionDocument> {
  const now = new Date();

  // Fetch original promotion to capture original end date for audit trail
  const originalPromotion = await this.promotionModel.findById(promotionId).exec();

  if (!originalPromotion) {
    throw new NotFoundException(`Promotion with ID ${promotionId} not found`);
  }

  const originalEndDate = originalPromotion.endDate;

  // Update promotion dates (atomic operation)
  const promotion = await this.promotionModel
    .findByIdAndUpdate(
      promotionId,
      {
        $set: {
          endDate: now,
          claimExpirationDate: now,
        },
      },
      { new: true, runValidators: false },
    )
    .exec();

  if (!promotion) {
    throw new NotFoundException(`Promotion with ID ${promotionId} not found`);
  }

  // Audit logging (existing Sentry log)
  this.logger.captureMessage(
    'cancel-promotion',
    'fatal', // ← Changed to 'fatal' for critical alerting
    {
      action: 'cancel-promotion',
      promotionId: promotion._id.toString(),
      promotionCode: promotion.code,
      adminUserId,
      timestamp: now.toISOString(),
      originalEndDate: originalEndDate.toISOString(),
      newEndDate: now.toISOString(),
      operatorId: promotion.operatorId,
    },
  );

  return promotion;
}
```

### 3.2 Change Sentry Log Level

**Find** this line (around line 517-521):
```typescript
this.logger.captureMessage(
  'cancel-promotion',
  'info', // ← Current level
  {
    // ... context
  },
);
```

**Change** to:
```typescript
this.logger.captureMessage(
  'cancel-promotion',
  'critical', // ← Change from 'info' to 'critical'
  {
    // ... context (unchanged)
  },
);
```

### 3.3 Add MongoDB Logging

**Add** MongoDB logging call **AFTER** the Sentry logging:

```typescript
// Audit logging with original and new end dates
this.logger.captureMessage(
  'cancel-promotion',
  'critical', // Elevated level for admin actions
  {
    action: 'cancel-promotion',
    promotionId: promotion._id.toString(),
    promotionCode: promotion.code,
    adminUserId,
    timestamp: now.toISOString(),
    originalEndDate: originalEndDate.toISOString(),
    newEndDate: now.toISOString(),
    operatorId: promotion.operatorId,
  },
);

// ↓↓↓ ADD THIS MONGODB LOGGING ↓↓↓
// MongoDB persistent audit trail
await this.actionLogService.saveLog({
  action: 'cancel-promotion',
  operatorId: promotion.operatorId,
  logTimeStamp: now.toISOString(),
  request: {
    playerId: '', // Empty for admin actions
    siteName: '', // Empty for admin actions
    promotionId: promotion._id.toString(),
    promotionCode: promotion.code,
    adminUserId,
    originalEndDate: originalEndDate.toISOString(),
    newEndDate: now.toISOString(),
  },
  response: {
    success: true,
    code: PROMOTION_ERROR_CODES.CANCELLATION_SUCCESS.code,
    message: PROMOTION_CANCELLED,
  },
});
// ↑↑↑ END MONGODB LOGGING ↑↑↑

return promotion;
```

### 3.4 Final cancelPromotion Method

**Complete Method** (after changes):

```typescript
/**
 * Cancel a running promotion by updating its end date and claim expiration date to current timestamp
 * Logs to both Sentry (critical level) and MongoDB (persistent audit trail)
 * @param promotionId - Promotion ID to cancel
 * @param adminUserId - Admin user performing the cancellation
 * @returns Updated promotion document
 * @throws NotFoundException if promotion not found
 */
async cancelPromotion(promotionId: string, adminUserId: string): Promise<PromotionDocument> {
  const now = new Date();

  // Fetch original promotion to capture original end date for audit trail
  const originalPromotion = await this.promotionModel.findById(promotionId).exec();

  if (!originalPromotion) {
    throw new NotFoundException(`Promotion with ID ${promotionId} not found`);
  }

  const originalEndDate = originalPromotion.endDate;

  // Update promotion dates (atomic operation)
  const promotion = await this.promotionModel
    .findByIdAndUpdate(
      promotionId,
      {
        $set: {
          endDate: now,
          claimExpirationDate: now,
        },
      },
      { new: true, runValidators: false },
    )
    .exec();

  if (!originalPromotion) {
    throw new NotFoundException(`Promotion with ID ${promotionId} not found`);
  }

  // Sentry logging (critical level for real-time alerting)
  this.logger.captureMessage(
    'cancel-promotion',
    'critical',
    {
      action: 'cancel-promotion',
      promotionId: promotion._id.toString(),
      promotionCode: promotion.code,
      adminUserId,
      timestamp: now.toISOString(),
      originalEndDate: originalEndDate.toISOString(),
      newEndDate: now.toISOString(),
      operatorId: promotion.operatorId,
    },
  );

  // MongoDB logging (persistent audit trail for compliance and queryability)
  await this.actionLogService.saveLog({
    action: 'cancel-promotion',
    operatorId: promotion.operatorId,
    logTimeStamp: now.toISOString(),
    request: {
      playerId: '', // Empty for admin actions
      siteName: '', // Empty for admin actions
      promotionId: promotion._id.toString(),
      promotionCode: promotion.code,
      adminUserId,
      originalEndDate: originalEndDate.toISOString(),
      newEndDate: now.toISOString(),
    },
    response: {
      success: true,
      code: PROMOTION_ERROR_CODES.CANCELLATION_SUCCESS.code,
      message: PROMOTION_CANCELLED,
    },
  });

  return promotion;
}
```

**Verification**: Run `npm run build` - should compile without errors.

---

## Step 4: Update Unit Tests

### 4.1 Update Test Imports

**File**: `tests/unit/promotion/promotion.service.cancel.spec.ts`

**Add** ActionLogService mock setup:

```typescript
import { ActionLogService } from '../../../src/core/action-log/services/action-log.service';
```

### 4.2 Add ActionLogService to Test Module

**Location**: Inside `beforeEach` block

**Before**:
```typescript
beforeEach(async () => {
  const mockPromotionModel = {
    // ... mock methods
  };

  const mockLoggerService = {
    captureMessage: jest.fn(),
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      PromotionService,
      {
        provide: getModelToken(Promotion.name),
        useValue: mockPromotionModel,
      },
      {
        provide: LoggerService,
        useValue: mockLoggerService,
      },
    ],
  }).compile();

  service = module.get<PromotionService>(PromotionService);
  // ...
});
```

**After** (add ActionLogService mock):
```typescript
beforeEach(async () => {
  const mockPromotionModel = {
    // ... mock methods
  };

  const mockLoggerService = {
    captureMessage: jest.fn(),
  };

  // ↓↓↓ ADD THIS MOCK ↓↓↓
  const mockActionLogService = {
    saveLog: jest.fn().mockResolvedValue({}), // Mock successful save
  };
  // ↑↑↑ END MOCK ↑↑↑

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      PromotionService,
      {
        provide: getModelToken(Promotion.name),
        useValue: mockPromotionModel,
      },
      {
        provide: LoggerService,
        useValue: mockLoggerService,
      },
      // ↓↓↓ ADD THIS PROVIDER ↓↓↓
      {
        provide: ActionLogService,
        useValue: mockActionLogService,
      },
      // ↑↑↑ END PROVIDER ↑↑↑
    ],
  }).compile();

  service = module.get<PromotionService>(PromotionService);
  actionLogService = module.get<ActionLogService>(ActionLogService);
  // ...
});
```

### 4.3 Add New Test: Verify ActionLogService Call

**Add** this test to the test suite:

```typescript
describe('cancelPromotion - MongoDB audit logging', () => {
  it('should call ActionLogService.saveLog with correct audit data (AAA pattern)', async () => {
    // Arrange
    const mockPromotionId = '507f1f77bcf86cd799439011';
    const mockAdminUserId = 'admin123';
    const mockNow = new Date('2025-10-30T14:30:00.000Z');
    const mockOriginalEndDate = new Date('2025-12-31T23:59:59.000Z');

    jest.useFakeTimers().setSystemTime(mockNow);

    const mockOriginalPromotion = {
      _id: mockPromotionId,
      code: 'summer-promo-2025',
      operatorId: 'op123',
      endDate: mockOriginalEndDate,
      claimExpirationDate: mockOriginalEndDate,
    };

    const mockUpdatedPromotion = {
      ...mockOriginalPromotion,
      endDate: mockNow,
      claimExpirationDate: mockNow,
    };

    jest.spyOn(promotionModel, 'findById').mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockOriginalPromotion),
    } as any);

    jest.spyOn(promotionModel, 'findByIdAndUpdate').mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockUpdatedPromotion),
    } as any);

    const saveLogSpy = jest.spyOn(actionLogService, 'saveLog');

    // Act
    await service.cancelPromotion(mockPromotionId, mockAdminUserId);

    // Assert
    expect(saveLogSpy).toHaveBeenCalledWith({
      action: 'cancel-promotion',
      operatorId: 'op123',
      logTimeStamp: mockNow.toISOString(),
      request: {
        playerId: '',
        siteName: '',
        promotionId: mockPromotionId,
        promotionCode: 'summer-promo-2025',
        adminUserId: mockAdminUserId,
        originalEndDate: mockOriginalEndDate.toISOString(),
        newEndDate: mockNow.toISOString(),
      },
      response: {
        success: true,
        code: 'PR3103',
        message: 'Promotion has been successfully cancelled',
      },
    });

    jest.useRealTimers();
  });
});
```

### 4.4 Run Unit Tests

```bash
npm test -- tests/unit/promotion/promotion.service.cancel.spec.ts
```

**Expected Output**: All tests passing ✅

---

## Step 5: Create Integration Test

### 5.1 Create Integration Test File

**Create**: `tests/integration/promotion/cancel-promotion-mongodb.integration.spec.ts`

**Full Implementation**:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { PromotionService } from '../../../src/promotion/services/promotion.service';
import { ActionLogService } from '../../../src/core/action-log/services/action-log.service';
import { LoggerService } from '../../../src/core/logger/logger.service';
import { Promotion, PromotionSchema } from '../../../src/promotion/schemas/promotion.schema';
import { ActionLog, ActionLogSchema } from '../../../src/core/action-log/schemas/action-log.schema';

describe('Promotion Cancellation - MongoDB Integration', () => {
  let promotionService: PromotionService;
  let actionLogService: ActionLogService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test_promotions'),
        MongooseModule.forFeature([
          { name: Promotion.name, schema: PromotionSchema },
        ]),
        MongooseModule.forFeature(
          [{ name: ActionLog.name, schema: ActionLogSchema }],
          'logs',
        ),
      ],
      providers: [
        PromotionService,
        ActionLogService,
        {
          provide: LoggerService,
          useValue: {
            captureMessage: jest.fn(), // Mock Sentry logging
          },
        },
      ],
    }).compile();

    promotionService = module.get<PromotionService>(PromotionService);
    actionLogService = module.get<ActionLogService>(ActionLogService);
  });

  afterAll(async () => {
    await module.close();
  });

  it('should persist cancellation log to MongoDB action_logs collection', async () => {
    // Arrange: Create a test promotion
    const testPromotion = await promotionService.create({
      name: 'Test Promotion',
      code: 'test-promo-integration',
      operatorId: 'test-op-123',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      claimExpirationDate: new Date('2025-12-31'),
      // ... other required fields
    });

    // Act: Cancel the promotion
    await promotionService.cancelPromotion(testPromotion._id.toString(), 'test-admin-456');

    // Assert: Verify log exists in MongoDB
    const logs = await actionLogService.getLogsByAction('cancel-promotion');
    const relevantLog = logs.find(log => log.request.promotionId === testPromotion._id.toString());

    expect(relevantLog).toBeDefined();
    expect(relevantLog.request.adminUserId).toBe('test-admin-456');
    expect(relevantLog.response.code).toBe('PR3103');
  });
});
```

### 5.2 Run Integration Test

```bash
# Make sure MongoDB test instance is running
npm test -- tests/integration/promotion/cancel-promotion-mongodb.integration.spec.ts
```

**Expected Output**: Integration test passing ✅

---

## Step 6: Manual Testing

### 6.1 Start Development Server

```bash
npm run start:dev
```

**Expected**: Server starts on `http://localhost:5000`

### 6.2 Test via Swagger UI

1. **Open Swagger UI**: Navigate to `http://localhost:5000/api`

2. **Find Endpoint**: Locate `PATCH /promotions/{id}/cancel`

3. **Execute Request**:
   ```json
   {
     "adminUserId": "manual-test-admin-789"
   }
   ```

4. **Verify Response**:
   ```json
   {
     "success": true,
     "code": "PR3103",
     "message": "Promotion has been successfully cancelled",
     "data": {
       "promotionId": "...",
       "promotionCode": "...",
       "originalEndDate": "...",
       "newEndDate": "...",
       "cancelledAt": "...",
       "adminUserId": "manual-test-admin-789"
     }
   }
   ```

### 6.3 Verify MongoDB Logs

**Option 1: MongoDB Compass**
1. Connect to logs database
2. Open `promotion_requests` collection
3. Filter: `{ action: "cancel-promotion" }`
4. Verify document exists with correct data

**Option 2: MongoDB Shell**
```javascript
// Connect to logs database
use game_promotion_logs // or your logs DB name

// Query cancellation logs
db.promotion_requests.find({ 
  action: "cancel-promotion" 
}).sort({ logTimeStamp: -1 }).limit(5).pretty()
```

**Expected**: Document with cancellation details ✅

### 6.4 Verify Sentry Logs

1. **Open Sentry Dashboard**: Navigate to your Sentry project
2. **Filter Events**: Search for `cancel-promotion`
3. **Check Log Level**: Verify level is `critical`
4. **Review Context**: Verify all audit fields are present

---

## Step 7: Verify Fail-Safe Behavior

### 7.1 Simulate MongoDB Failure

**Temporarily stop MongoDB logs database**:

```bash
# Stop MongoDB logs instance (if separate)
# OR temporarily change MONGODB_LOGS_URI to invalid value
```

### 7.2 Test Cancellation Still Succeeds

**Execute** cancellation via Swagger UI or API client

**Expected Behavior**:
- ✅ Promotion is cancelled successfully
- ✅ API returns 200 OK with success response
- ✅ Console shows error: `"Failed to save action log to MongoDB"`
- ✅ Sentry log still succeeds

### 7.3 Restore MongoDB

**Restart MongoDB logs database**:

```bash
# Restart MongoDB logs instance
# OR restore correct MONGODB_LOGS_URI
```

**Verify** next cancellation creates MongoDB log successfully

---

## Querying Audit Logs

### Using ActionLogService (Programmatic)

**Example: Query cancellations by operator**
```typescript
const cancellations = await actionLogService.getLogsByOperator('op123', 50, 0);
console.log(`Found ${cancellations.length} cancellations for operator op123`);
```

**Example: Query cancellations by date range**
```typescript
const octCancellations = await actionLogService.getLogsByDateRange(
  '2025-10-01T00:00:00.000Z',
  '2025-10-31T23:59:59.999Z',
  100,
  0
);
console.log(`October cancellations: ${octCancellations.length}`);
```

### Using MongoDB Shell

**Query by promotion ID**:
```javascript
db.promotion_requests.find({
  action: 'cancel-promotion',
  'request.promotionId': '507f1f77bcf86cd799439011'
}).pretty()
```

**Query by admin user**:
```javascript
db.promotion_requests.find({
  action: 'cancel-promotion',
  'request.adminUserId': 'admin123'
}).sort({ logTimeStamp: -1 }).limit(10)
```

**Aggregate: Count cancellations by operator**:
```javascript
db.promotion_requests.aggregate([
  { $match: { action: 'PROMOTION_CANCELLED' } },
  { $group: { _id: '$operatorId', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

---

## Troubleshooting

### Issue 1: "ActionLogService is not defined"

**Cause**: ActionLogModule not imported in PromotionModule

**Solution**:
1. Verify CoreModule exports ActionLogModule
2. Verify PromotionModule imports CoreModule
3. Run `npm run build` to check for errors

### Issue 2: MongoDB Connection Error

**Error**: `MongooseError: Connection to 'logs' failed`

**Solution**:
1. Check `MONGODB_LOGS_URI` environment variable is set
2. Verify MongoDB logs instance is running
3. Check connection string format: `mongodb://localhost:27017/logs`
4. Verify 'logs' connection name in ActionLogModule matches AppModule configuration

### Issue 3: Unit Tests Fail After Changes

**Error**: `Cannot find property 'saveLog' of undefined`

**Solution**:
1. Verify ActionLogService mock is added to test module
2. Check mock implementation: `{ saveLog: jest.fn().mockResolvedValue({}) }`
3. Ensure actionLogService variable is declared in test file

### Issue 4: Logs Not Appearing in MongoDB

**Possible Causes**:
1. Wrong database connection (using default instead of 'logs')
2. MongoDB authentication issue
3. ActionLogService.saveLog() failing silently

**Debugging Steps**:
1. Check console for error: `"Failed to save action log to MongoDB"`
2. Verify MongoDB logs collection name: `promotion_requests`
3. Check MongoDB user permissions (read/write on logs DB)
4. Add temporary console.log in PromotionService after saveLog call

### Issue 5: Performance Degradation

**Symptom**: Cancellation endpoint response time >200ms

**Investigation**:
1. Check MongoDB logs instance performance (slow writes)
2. Verify network latency to MongoDB logs DB
3. Profile cancelPromotion method execution time

**Mitigation**:
1. Consider fire-and-forget pattern (don't await saveLog - risky)
2. Optimize MongoDB logs instance (increase resources)
3. Add MongoDB connection pooling configuration

---

## Checklist

Before considering this feature complete:

- [ ] **Code Changes**:
  - [ ] ActionLogService injected in PromotionService
  - [ ] Sentry log level changed to 'critical'
  - [ ] MongoDB logging call added to cancelPromotion method
  - [ ] Code compiles without errors (`npm run build`)

- [ ] **Tests**:
  - [ ] Unit test for ActionLogService.saveLog call added
  - [ ] All unit tests passing (`npm test`)
  - [ ] Integration test for MongoDB persistence created
  - [ ] Integration test passing

- [ ] **Manual Verification**:
  - [ ] Cancellation via Swagger UI successful
  - [ ] MongoDB log document created and queryable
  - [ ] Sentry shows critical-level event
  - [ ] Fail-safe behavior verified (MongoDB failure doesn't block cancellation)

- [ ] **Documentation**:
  - [ ] Swagger docs updated (endpoint description mentions dual logging)
  - [ ] README.md updated (audit log querying examples)
  - [ ] JSDoc comments added to cancelPromotion method

---

## Next Steps

After completing this implementation:

1. **Code Review**: Submit PR for team review
2. **QA Testing**: Test in staging environment
3. **Performance Monitoring**: Monitor cancellation response times
4. **Sentry Dashboard**: Configure alerts for critical events
5. **MongoDB Monitoring**: Set up alerts for logging failures

**Future Enhancements**:
- Add promotionId index for faster queries
- Implement scheduled log cleanup job
- Create admin UI for viewing cancellation audit logs
- Add query API endpoint for programmatic log access

---

## Resources

- **ActionLogService Documentation**: `src/core/action-log/services/action-log.service.ts`
- **ActionLog Schema**: `src/core/action-log/schemas/action-log.schema.ts`
- **Existing Usage Example**: `src/bonus-wins/services/bonus-wins.service.ts` (see `claimBonusWins` method)
- **Data Model Reference**: `specs/GL-5286-end-promotion/data-model.md`
- **Research Findings**: `specs/GL-5286-end-promotion/research.md`

---

**Questions?** Refer to the research.md and data-model.md documents for detailed technical information.

**Happy Coding!** 🚀
