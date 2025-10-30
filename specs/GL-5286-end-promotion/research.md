# Research: MongoDB Audit Logging for Promotion Cancellation

**Feature**: GL-5286-end-promotion  
**Research Date**: 2025-10-30  
**Researcher**: AI Assistant  
**Purpose**: Investigate ActionLogService integration patterns and MongoDB logging infrastructure for promotion cancellation audit trail

## Executive Summary

**Key Findings**:
1. ✅ ActionLogService is fully implemented and production-ready in `src/core/action-log/`
2. ✅ CoreModule exports ActionLogModule globally - available to all feature modules
3. ✅ BonusWinsService already uses ActionLogService successfully - proven integration pattern
4. ✅ MongoDB 'logs' connection is configured and active
5. ✅ ActionLog schema is flexible with `[key: string]: any` - supports admin-specific fields
6. ✅ Existing indices support efficient querying by operatorId, action, timestamp, playerId

**Recommendation**: Proceed with ActionLogService integration using the proven pattern from BonusWinsService. No infrastructure changes required.

---

## 1. ActionLogService Integration Patterns

### 1.1 Existing Usage Example: BonusWinsService

**Location**: `src/bonus-wins/services/bonus-wins.service.ts`

**Import Statement**:
```typescript
import { ActionLogService } from '../../core/action-log/services/action-log.service';
```

**Constructor Injection**:
```typescript
constructor(
  // ... other dependencies
  private readonly actionLogService: ActionLogService,
) {}
```

**Usage Pattern** (from `claimBonusWins` method):
```typescript
// Example of how BonusWinsService uses ActionLogService
await this.actionLogService.saveLog({
  operatorId: operatorId,
  logTimeStamp: new Date().toISOString(),
  action: 'claim-bonus-win',
  request: {
    playerId: playerId,
    siteName: siteName,
    promotionId: promotion._id.toString(),
    // ... additional request data
  },
  response: {
    claimedAmount: claimedAmount,
    totalTurnover: playerPromotion.totalTurnover,
    // ... additional response data
  },
});
```

**Error Handling**: BonusWinsService calls `saveLog()` WITHOUT try-catch, relying on ActionLogService's internal error handling.

### 1.2 Module Configuration

**ActionLogModule** (`src/core/action-log/action-log.module.ts`):
- ✅ Exports ActionLogService and LogBuilder
- ✅ Uses 'logs' MongoDB connection (separate from default connection)
- ✅ Imported by CoreModule and re-exported globally

**CoreModule** (`src/core/core.module.ts`):
- ✅ Imports ActionLogModule
- ✅ Exports ActionLogModule (makes it available to all feature modules)

**PromotionModule**:
- ✅ Imports CoreModule (per NestJS convention)
- ✅ No need to explicitly import ActionLogModule

### 1.3 Dependency Injection Availability

**Decision**: ActionLogService is globally available via CoreModule.

**Verification**:
1. CoreModule imports ActionLogModule ✅
2. CoreModule exports ActionLogModule ✅
3. PromotionModule imports CoreModule (implicitly or explicitly) ✅
4. PromotionService can inject ActionLogService directly ✅

**Action Required**: Verify PromotionModule imports CoreModule (likely already present).

---

## 2. ActionLog Schema Analysis

### 2.1 Current Schema Structure

**Location**: `src/core/action-log/schemas/action-log.schema.ts`

**Collection Name**: `promotion_requests` (MongoDB collection)

**Schema Fields**:
```typescript
{
  operatorId: string (required, indexed)
  logTimeStamp: string (required, indexed) // ISO 8601 format
  action: string (required, indexed)
  request: {
    playerId: string
    siteName: string
    promotionId?: string
    [key: string]: any  // Flexible structure for additional fields
  }
  response?: {
    claimedAmount?: number
    totalTurnover?: number
    minRequiredTurnover?: number
    totalWinAmount?: number
    progressPercentage?: number
    errorCode?: string
    errorMessage?: string
    errorDescription?: string
    [key: string]: any  // Flexible structure for additional fields
  }
}
```

**Timestamps**: Mongoose adds `createdAt` and `updatedAt` automatically (schema option `timestamps: true`).

### 2.2 Existing Indices

**Compound Indices** (defined in schema):
1. `{ operatorId: 1, logTimeStamp: -1 }` - Efficient operator-specific queries sorted by time
2. `{ 'request.playerId': 1, logTimeStamp: -1 }` - Player-specific log queries
3. `{ action: 1, logTimeStamp: -1 }` - Action-type filtering with time sorting
4. `{ 'response.errorCode': 1, logTimeStamp: -1 }` - Error log queries

**Implication for Cancellation Logs**:
- ✅ Query by operatorId + action = 'cancel-promotion' → Uses index #1 and #3
- ✅ Query by action = 'cancel-promotion' sorted by time → Uses index #3
- ⚠️ Query by promotionId → NO DEDICATED INDEX (full collection scan or uses partial index on request)

**Optimization Opportunity**: Consider adding index `{ 'request.promotionId': 1, logTimeStamp: -1 }` if promotionId-based queries are frequent. However, current indices should be sufficient for MVP.

### 2.3 Schema Flexibility for Cancellation Logs

**Question**: Can ActionLog schema accommodate promotion cancellation data (adminUserId, originalEndDate, newEndDate)?

**Answer**: YES ✅

**Rationale**:
- `request` and `response` objects have `[key: string]: any` - fully flexible
- `playerId` is optional for admin actions (we can omit or use empty string)
- `siteName` is optional for admin actions (we can use empty string or omit)
- All cancellation-specific fields fit naturally in `request` object

**Proposed Structure**:
```typescript
{
  action: 'cancel-promotion',
  operatorId: promotion.operatorId, // Required field
  logTimeStamp: new Date().toISOString(), // Required field
  request: {
    playerId: '', // Empty for admin actions
    siteName: '', // Empty for admin actions
    promotionId: promotion._id.toString(),
    promotionCode: promotion.code,
    adminUserId: cancelDto.adminUserId, // NEW: Admin identifier
    originalEndDate: originalEndDate.toISOString(), // NEW: For audit comparison
    newEndDate: now.toISOString(), // NEW: Cancellation timestamp
  },
  response: {
    success: true,
    code: 'PR3103',
    message: 'Promotion has been successfully cancelled',
  },
}
```

### 2.4 Data Retention & Cleanup

**Current Policy**: ActionLogService does NOT implement automatic retention policies.

**Cleanup Method**: `deleteOldLogs(daysToKeep: number)` method available but NOT called automatically.

**Recommendation**: 
- Document that cancellation logs have indefinite retention by default
- System administrators can manually call `deleteOldLogs()` or implement scheduled cleanup jobs
- For MVP, rely on external MongoDB retention policies or manual cleanup

---

## 3. Sentry Log Level Best Practices

### 3.1 Log Level Definitions (Sentry/LoggerService)

**Available Levels** (from most to least severe):
1. **fatal**: System is unusable, requires immediate intervention
2. **critical**: Critical conditions, requires urgent attention
3. **error**: Runtime errors, recoverable but need investigation
4. **warning**: Warning conditions, potentially problematic
5. **info**: Informational messages, normal operations
6. **debug**: Detailed debugging information

### 3.2 When to Use 'critical' Level

**Use 'critical' for**:
- Security events (unauthorized access, suspicious activity)
- Financial transactions (payment failures, refunds)
- Administrative actions with business impact (data deletion, bulk updates)
- System state changes requiring immediate visibility
- Compliance-related events requiring audit trail

**Promotion Cancellation Assessment**:
- ✅ Administrative action with business impact
- ✅ Affects player experience (bonus items become unclaimable)
- ✅ Compliance requirement (financial audit trail)
- ✅ User explicitly requested "critical" level

**Decision**: **'critical'** level is appropriate for promotion cancellations.

### 3.3 Alert Configuration

**Sentry Alert Triggers**:
- Critical events typically trigger real-time notifications (email, Slack, PagerDuty)
- Configure Sentry project rules to alert on `level:fatal` with tag `action:cancel-promotion`

**Performance Impact**:
- Sentry critical events have same performance characteristics as info events
- No additional overhead from log level choice
- Rate limiting applies equally across all levels

### 3.4 Current LoggerService Usage in cancelPromotion

**Current Implementation** (`src/promotion/services/promotion.service.ts`):
```typescript
this.logger.captureMessage(
  'cancel-promotion',
  'info', // <-- Currently 'info' level
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
```

**Required Change**:
```typescript
this.logger.captureMessage(
  'cancel-promotion',
  'critical', // <-- Change to 'critical'
  {
    // ... same context data
  },
);
```

---

## 4. Fail-Safe Logging Patterns

### 4.1 ActionLogService Internal Error Handling

**Location**: `src/core/action-log/services/action-log.service.ts`

**Implementation**:
```typescript
async saveLog(logData: IActionLog): Promise<ActionLog | null> {
  try {
    const log = new this.actionLogModel(logData);
    return await log.save();
  } catch (error) {
    // Fail silently to not disrupt the main application flow
    console.error('Failed to save action log to MongoDB:', error);
    return null;
  }
}
```

**Key Observation**: ActionLogService ALREADY implements fail-safe pattern internally! ✅

### 4.2 Implications for PromotionService

**Decision**: Use simple `await this.actionLogService.saveLog(logData)` WITHOUT additional try-catch.

**Rationale**:
1. ActionLogService.saveLog() never throws (returns null on error)
2. Internal error is logged to console for monitoring
3. Adding try-catch in PromotionService is redundant
4. Simpler code, single error handling location

**Implementation Pattern**:
```typescript
// After successful promotion cancellation
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

// No need for try-catch - ActionLogService handles errors internally
```

### 4.3 Monitoring for Logging System Health

**Console Error Pattern**: ActionLogService logs to console on failure
- Monitor application logs for `"Failed to save action log to MongoDB"` messages
- Set up alerts if error frequency exceeds threshold (e.g., >10% of requests)

**Success Rate Tracking**:
- ActionLogService.saveLog() returns `ActionLog | null`
- Could track return value for metrics (optional enhancement)
- For MVP, rely on console error monitoring

### 4.4 Fallback to Sentry

**Redundancy Strategy**:
1. Primary: MongoDB logging via ActionLogService (queryable, long-term retention)
2. Fallback: Sentry logging via LoggerService (real-time alerting, always available)
3. Last Resort: Console logging (ActionLogService internal error handler)

**Failure Scenario**:
- If MongoDB logs DB is unavailable:
  - ActionLogService.saveLog() catches error, logs to console, returns null
  - Sentry logging still succeeds (separate system)
  - Promotion cancellation completes successfully
  - Audit record exists in Sentry (searchable, time-limited retention)

---

## 5. MongoDB Connection Configuration

### 5.1 Logs Connection

**Configuration**: `MongooseModule.forFeature([...], 'logs')` in ActionLogModule

**Connection Name**: `'logs'` (separate from default connection)

**Verification Required**: Ensure 'logs' connection is defined in AppModule.

**Expected Configuration** (`src/app.module.ts`):
```typescript
MongooseModule.forRoot(process.env.MONGODB_URI), // Default connection
MongooseModule.forRoot(process.env.MONGODB_LOGS_URI, {
  connectionName: 'logs', // Named connection for audit logs
}),
```

**Action Required**: Verify `MONGODB_LOGS_URI` environment variable exists in deployment configurations.

### 5.2 Connection Resilience

**Built-in Retry Logic**: Mongoose automatically retries failed connections
- Reconnection attempts: Mongoose default (indefinite with backoff)
- Application doesn't crash if logs DB is temporarily unavailable

**Error Behavior**:
- If 'logs' connection is down: `saveLog()` throws MongooseError → caught by ActionLogService → logged to console → returns null
- Main application (promotion cancellation) continues successfully

---

## 6. Integration with Existing Code

### 6.1 PromotionService Changes Required

**Current State**: `src/promotion/services/promotion.service.ts`
- Has LoggerService injected ✅
- Calls LoggerService.captureMessage for Sentry logging ✅
- Does NOT have ActionLogService injected ❌

**Required Changes**:

**Step 1: Import ActionLogService**
```typescript
import { ActionLogService } from '../../core/action-log/services/action-log.service';
```

**Step 2: Update Constructor**
```typescript
constructor(
  @InjectModel(Promotion.name)
  private readonly promotionModel: Model<PromotionDocument>,
  private readonly logger: LoggerService,
  private readonly actionLogService: ActionLogService, // ADD THIS
) {}
```

**Step 3: Add MongoDB Logging Call in cancelPromotion Method**
```typescript
async cancelPromotion(promotionId: string, adminUserId: string): Promise<PromotionDocument> {
  const now = new Date();
  
  // Fetch original promotion for audit trail
  const originalPromotion = await this.promotionModel.findById(promotionId).exec();
  if (!originalPromotion) {
    throw new NotFoundException(`Promotion with ID ${promotionId} not found`);
  }
  const originalEndDate = originalPromotion.endDate;

  // Update promotion (atomic operation)
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

  // Sentry logging (critical level for real-time alerting)
  this.logger.captureMessage(
    'cancel-promotion',
    'critical', // CHANGE from 'info' to 'critical'
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

  // MongoDB logging (ADD THIS - persistent audit trail)
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

### 6.2 PromotionModule Changes Required

**Verification**: Check if PromotionModule imports CoreModule.

**Expected Import** (`src/promotion/promotion.module.ts`):
```typescript
import { CoreModule } from '../core/core.module';

@Module({
  imports: [
    CoreModule, // Should already be present
    MongooseModule.forFeature([
      { name: Promotion.name, schema: PromotionSchema },
      { name: PlayerPromotion.name, schema: PlayerPromotionSchema },
    ]),
    // ... other imports
  ],
  // ... rest of module configuration
})
export class PromotionModule {}
```

**Action Required**: Verify CoreModule import exists. If not, add it.

---

## 7. Testing Strategy

### 7.1 Unit Tests

**File**: `tests/unit/promotion/promotion.service.cancel.spec.ts`

**New Test Required**: Verify ActionLogService.saveLog is called with correct data

**Implementation Approach**:
```typescript
it('should call ActionLogService.saveLog with correct log data', async () => {
  // Arrange
  const mockPromotionId = '507f1f77bcf86cd799439011';
  const mockAdminUserId = 'admin123';
  const mockNow = new Date('2025-10-30T14:00:00.000Z');
  
  jest.useFakeTimers().setSystemTime(mockNow);
  
  const mockOriginalPromotion = {
    _id: mockPromotionId,
    code: 'summer-promo',
    operatorId: 'op123',
    endDate: new Date('2025-12-31T23:59:59.000Z'),
  };
  
  jest.spyOn(promotionModel, 'findById').mockReturnValue({
    exec: jest.fn().mockResolvedValue(mockOriginalPromotion),
  } as any);
  
  jest.spyOn(promotionModel, 'findByIdAndUpdate').mockReturnValue({
    exec: jest.fn().mockResolvedValue({
      ...mockOriginalPromotion,
      endDate: mockNow,
      claimExpirationDate: mockNow,
    }),
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
      promotionCode: 'summer-promo',
      adminUserId: mockAdminUserId,
      originalEndDate: '2025-12-31T23:59:59.000Z',
      newEndDate: mockNow.toISOString(),
    },
    response: {
      success: true,
      code: 'PR3103',
      message: PROMOTION_CANCELLED,
    },
  });
});
```

### 7.2 Integration Tests

**File**: `tests/integration/promotion/cancel-promotion.integration.spec.ts` (to be created)

**Test Scenarios**:
1. Verify MongoDB document is actually created in action_logs collection
2. Verify log can be queried by promotionId
3. Verify log can be queried by operatorId + action
4. Verify fail-safe behavior: cancellation succeeds even if MongoDB logs DB is unavailable

**Test Database Setup**:
- Use MongoDB Memory Server for isolated testing
- Or use test MongoDB instance with cleanup after each test

---

## 8. Alternatives Considered & Rejected

### Alternative 1: Create Dedicated PromotionAuditLog Schema

**Proposal**: Create a new schema specifically for promotion cancellation logs.

**Rejected Because**:
- Adds unnecessary complexity (new schema, new collection, new service)
- Fragments audit logs across multiple collections (harder to query all admin actions)
- ActionLog schema is already flexible enough with `[key: string]: any`
- Violates DRY principle (duplicating logging infrastructure)

### Alternative 2: Only Use Sentry (No MongoDB)

**Proposal**: Rely solely on Sentry logging for audit trail.

**Rejected Because**:
- Sentry has data retention limits (typically 90 days for free/standard plans)
- Sentry is optimized for error tracking, not long-term audit compliance
- MongoDB provides better queryability for business analytics
- User explicitly requested "MongoDB for audit trail later"

### Alternative 3: Synchronous MongoDB Logging

**Proposal**: Make ActionLogService.saveLog() synchronous (wait for confirmation before returning).

**Rejected Because**:
- Increases cancellation response time (adds MongoDB latency to critical path)
- Violates fail-safe requirement (MongoDB failure would block cancellation)
- Existing pattern in BonusWinsService uses async without awaiting errors
- User experience priority: cancellation should succeed quickly

---

## 9. Risks & Mitigation

### Risk 1: MongoDB Logs DB Unavailability

**Impact**: ActionLogService.saveLog() fails, no MongoDB audit record created.

**Probability**: Low (MongoDB logs DB typically has high uptime)

**Mitigation**:
- ✅ Fail-safe pattern prevents cancellation failure
- ✅ Sentry logging provides fallback audit record
- ✅ Console error logging enables monitoring and alerting
- ✅ MongoDB built-in retry logic handles transient failures

### Risk 2: Increased Cancellation Response Time

**Impact**: Adding MongoDB logging call increases total response time.

**Probability**: Low (MongoDB write operations are fast, <10-50ms typical)

**Mitigation**:
- ✅ Fire-and-forget pattern (await but don't block critical path mentally)
- ✅ MongoDB indexes ensure fast writes
- ✅ Monitor p95 response time; revert if >200ms threshold breached

### Risk 3: Disk Space Consumption

**Impact**: action_logs collection grows indefinitely without retention policy.

**Probability**: Medium (promotion cancellations accumulate over time)

**Mitigation**:
- ✅ Document retention policy in README
- ✅ Provide deleteOldLogs() method for manual cleanup
- ⚠️ Consider implementing scheduled cleanup job (future enhancement)

### Risk 4: playerId/siteName Field Confusion

**Impact**: ActionLog schema expects playerId/siteName, but admin actions don't have these.

**Probability**: Low (schema allows empty strings, schema is flexible)

**Mitigation**:
- ✅ Use empty strings for playerId/siteName in admin actions
- ✅ Document this pattern in code comments
- ✅ Consider adding adminUserId to root level of schema (future enhancement, not required for MVP)

---

## 10. Recommendations

### Immediate Actions (MVP)

1. ✅ **Inject ActionLogService** into PromotionService constructor
2. ✅ **Add MongoDB logging call** in cancelPromotion method (after successful cancellation)
3. ✅ **Change Sentry log level** from 'info' to 'critical'
4. ✅ **Add unit test** verifying ActionLogService.saveLog is called correctly
5. ✅ **Verify CoreModule import** in PromotionModule (likely already present)
6. ✅ **Document querying patterns** in quickstart.md

### Future Enhancements (Post-MVP)

1. ⏭️ **Add promotionId index**: `{ 'request.promotionId': 1, logTimeStamp: -1 }` for faster cancellation log queries
2. ⏭️ **Implement scheduled cleanup job**: Automatic deletion of logs older than X days
3. ⏭️ **Add adminUserId to root schema**: Extend ActionLog schema with optional adminUserId field for better admin action tracking
4. ⏭️ **Create audit log query API**: REST endpoint for querying action_logs by various filters
5. ⏭️ **Admin UI for log viewing**: Dashboard showing cancellation history with filters

### Quality Gates

**Before merging**:
- [ ] All unit tests pass (including new ActionLogService test)
- [ ] Integration test verifies MongoDB persistence
- [ ] Manual testing confirms dual logging (Sentry + MongoDB)
- [ ] Sentry dashboard shows critical-level events
- [ ] MongoDB action_logs collection shows cancel-promotion documents

---

## 11. Conclusion

**Ready to Proceed**: YES ✅

**Summary**:
- ActionLogService is production-ready and proven (used by BonusWinsService)
- Fail-safe pattern is already built into ActionLogService
- No infrastructure changes required (CoreModule already exports ActionLogModule)
- Integration is straightforward: inject service + add one method call
- All risks are mitigated with existing patterns

**Next Steps**:
1. Generate data-model.md (document log data structure)
2. Generate quickstart.md (developer implementation guide)
3. Update tasks.md with specific implementation tasks
4. Begin implementation following the proven BonusWinsService pattern

**Estimated Implementation Time**: 2-3 hours (including tests and documentation)
