# Implementation Plan: Early Promotion Cancellation - MongoDB Audit Logging Enhancement

**Branch**: `GL-5286-end-promotion` | **Date**: 2025-10-30 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/GL-5286-end-promotion/spec.md`

**Enhancement**: Adding MongoDB persistent audit logging via ActionLogService to complement existing Sentry logging for promotion cancellation events.

## Summary

**Primary Requirement**: Enhance the existing `cancelPromotion` feature with dual audit logging:
1. **Sentry Logging** (via LoggerService) - Critical level for real-time alerting and error tracking
2. **MongoDB Logging** (via ActionLogService) - Persistent audit trail for compliance, queryability, and long-term retention

**Technical Approach**:
- Reuse existing `ActionLogService` from `src/core/action-log/` module
- Inject ActionLogService into PromotionService
- Call `actionLogService.saveLog()` after successful cancellation (non-blocking, fail-safe)
- Maintain existing Sentry logging with elevated "critical" level
- Structure log data to match existing ActionLog schema (action, operatorId, logTimeStamp, request, response)

**Benefits**:
- **Queryable Audit Trail**: Admins can query MongoDB for cancellation history by promotionId, operatorId, adminUserId, date range
- **Compliance**: Long-term retention of administrative actions for financial and regulatory audits
- **Redundancy**: Dual logging strategy ensures audit records survive even if Sentry is unavailable
- **Performance**: Fail-safe logging doesn't block critical business operation
- **Reuse**: Leverages existing infrastructure (no new dependencies or schemas)

## Technical Context

**Language/Version**: TypeScript 5.1.3  
**Framework**: NestJS 10.x  
**Primary Dependencies**:
- `@nestjs/mongoose` 10.0.1 - MongoDB ODM
- `mongoose` 7.6.3 - MongoDB driver
- `@sentry/nestjs` 9.22.0 - Error tracking (existing)
- `class-validator` 0.14.0 - DTO validation (existing)

**Storage**:
- **Primary DB**: MongoDB (default connection) - `game_promotions` collection
- **Audit DB**: MongoDB (logs connection) - `action_logs` collection

**Testing**: Jest 29.5.0 with ts-jest  
**Target Platform**: Node.js server (Linux)  
**Project Type**: Single NestJS monolith application  

**Performance Goals**:
- API cancellation endpoint: <200ms p95 response time (unchanged)
- MongoDB logging: Best-effort, non-blocking (<50ms typical)
- Audit log queries: <2 seconds for filtered results

**Constraints**:
- Fail-safe logging: MongoDB failures must NOT prevent successful cancellation
- Backward compatibility: Existing Sentry logging behavior preserved
- Zero database schema changes: Reuse existing ActionLog schema
- No breaking API changes: cancelPromotion endpoint signature unchanged

**Scale/Scope**:
- Expected cancellation volume: <100 per day
- Audit log retention: Unlimited (managed by external cleanup jobs)
- Query patterns: By promotionId, operatorId, adminUserId, action type, date range

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Verify compliance with Game Promotion API Constitution principles:

- [x] **SOLID Principles**:
  - **SRP**: ActionLogService handles only MongoDB logging; PromotionService handles cancellation business logic
  - **DIP**: PromotionService depends on ActionLogService abstraction (injected dependency)
  - **OCP**: Adding MongoDB logging extends existing behavior without modifying core cancellation logic
  - **ISP**: ActionLogService interface is focused (saveLog method only)
  - **LSP**: N/A (no inheritance involved)

- [x] **Clean Code**:
  - New logging call: ~5-10 lines (structure log data + call saveLog)
  - No new classes required (reuse existing ActionLogService)
  - Clear naming: `actionLogService.saveLog(logData)`
  - Self-documenting: Log structure matches spec requirements

- [x] **Test-First**:
  - Unit tests for PromotionService.cancelPromotion will verify ActionLogService.saveLog is called with correct data
  - AAA pattern with single assertion per test
  - Mock ActionLogService in unit tests
  - Integration test to verify actual MongoDB persistence

- [x] **Performance**:
  - MongoDB logging is fire-and-forget (async, non-blocking)
  - Fail-safe wrapper ensures exceptions don't propagate
  - Primary cancellation operation remains <200ms p95
  - Query indexing already exists on action_logs collection (operatorId, logTimeStamp, action)

- [x] **UX Consistency**:
  - No API changes (transparent enhancement)
  - Standardized response format unchanged
  - Error codes unchanged (PR3103, PR3104, PR3105)
  - Swagger documentation updated to mention dual logging behavior

- [x] **Security**:
  - Input validation unchanged (existing CancelPromotionDto)
  - No sensitive data logged (adminUserId is identifier, not credential)
  - MongoDB connection string in environment variables (existing)
  - Audit logs follow existing security patterns (no new attack surface)

**Complexity Justification**: None required - this is a straightforward enhancement using existing infrastructure.

## Project Structure

### Documentation (this feature)

```text
specs/GL-5286-end-promotion/
├── spec.md              # Enhanced with MongoDB audit logging requirements
├── plan.md              # This file (implementation plan)
├── research.md          # ActionLogService integration research
├── data-model.md        # ActionLog schema and log data structure
├── quickstart.md        # Developer guide with MongoDB logging examples
├── contracts/           # API contracts (unchanged - no API changes)
│   └── terminate-promotion.yaml
├── tasks.md             # Task breakdown (includes ActionLogService integration tasks)
└── checklists/
    └── requirements.md  # Validated specification checklist
```

### Source Code (repository root)

```text
src/
├── promotion/
│   ├── services/
│   │   └── promotion.service.ts           # MODIFY: Inject ActionLogService, add MongoDB logging
│   ├── controllers/
│   │   └── promotion.controller.ts        # NO CHANGE
│   ├── models/
│   │   └── cancel-promotion.dto.ts        # NO CHANGE
│   └── responses/
│       └── cancel-promotion.response.ts   # NO CHANGE
│
├── core/
│   ├── action-log/
│   │   ├── services/
│   │   │   └── action-log.service.ts      # REUSE: Existing service
│   │   ├── schemas/
│   │   │   └── action-log.schema.ts       # REUSE: Existing schema
│   │   └── action-log.module.ts           # VERIFY: Exported globally
│   └── logger/
│       └── logger.service.ts              # MODIFY: Update log level to "critical"
│
└── constants/
    ├── error-codes.ts                     # NO CHANGE (already has PR3103-PR3105)
    └── api-messages.ts                    # NO CHANGE

tests/
├── unit/
│   └── promotion/
│       ├── promotion.service.cancel.spec.ts   # MODIFY: Add ActionLogService.saveLog test
│       └── promotion.controller.cancel.spec.ts # NO CHANGE
├── integration/
│   └── promotion/
│       └── cancel-promotion.integration.spec.ts # CREATE: Verify MongoDB persistence
└── contract/
    └── promotion/
        └── cancel-promotion.contract.spec.ts   # NO CHANGE (API unchanged)
```

**Structure Decision**: Single NestJS monolith. All source code in `src/` with feature-based modules (`promotion/`, `core/`). Tests mirror source structure in `tests/` directory.

## Key Decisions

### 1. Dual Logging Strategy

**Decision**: Maintain both Sentry (LoggerService) and MongoDB (ActionLogService) logging in parallel.

**Rationale**:
- **Sentry (Critical Level)**: Real-time alerting, error tracking, distributed tracing
- **MongoDB (Audit Trail)**: Long-term queryable history, compliance, business analytics

**Alternative Considered**: Replace Sentry with MongoDB-only logging.
**Rejected Because**: Sentry provides unique value (real-time alerting, error context, performance tracing) that MongoDB doesn't replace. Dual logging provides redundancy and serves different use cases.

### 2. Fail-Safe Logging Pattern

**Decision**: Wrap `actionLogService.saveLog()` in try-catch, continue on failure.

**Rationale**:
- Audit logging is important but NOT critical enough to fail the cancellation operation
- Sentry logging provides fallback if MongoDB fails
- Users expect cancellation to succeed if promotion is actually updated

**Implementation**:
```typescript
try {
  await this.actionLogService.saveLog(logData);
} catch (error) {
  // Log to console but don't throw
  console.error('Failed to save audit log to MongoDB:', error);
}
```

**Alternative Considered**: Make MongoDB logging mandatory (throw on failure).
**Rejected Because**: Business operation (cancellation) should not fail due to auxiliary logging system failure. This violates availability requirements.

### 3. Log Data Structure

**Decision**: Use existing ActionLog schema with structured `request` and `response` fields.

**Rationale**:
- Zero schema changes required
- Consistent with other action logs in the system
- Queryable by existing indices (operatorId, logTimeStamp, action)

**Log Structure**:
```typescript
{
  action: 'cancel-promotion',
  operatorId: promotion.operatorId,
  logTimeStamp: new Date().toISOString(),
  request: {
    promotionId: promotion._id.toString(),
    promotionCode: promotion.code,
    adminUserId: cancelDto.adminUserId,
    originalEndDate: originalEndDate.toISOString(),
    newEndDate: now.toISOString(),
  },
  response: {
    success: true,
    code: 'PR3103',
    message: 'Promotion has been successfully cancelled',
  },
}
```

**Alternative Considered**: Create a dedicated PromotionCancellationLog schema.
**Rejected Because**: Adds unnecessary complexity. Existing ActionLog schema is flexible enough to accommodate all required fields via `request` and `response` objects.

### 4. Sentry Log Level Elevation

**Decision**: Change LoggerService.captureMessage level from 'info' to 'critical' for cancellation events.

**Rationale**:
- Promotion cancellations are significant administrative actions requiring immediate visibility
- Critical level ensures Sentry alerts are triggered for monitoring
- Differentiates cancellations from routine operations in Sentry dashboard

**Alternative Considered**: Keep 'info' level, use tags for filtering.
**Rejected Because**: User explicitly requested "critical" level for Sentry logs, and cancellations are indeed critical business events warranting immediate attention.

### 5. ActionLogService Injection

**Decision**: Inject ActionLogService into PromotionService via constructor dependency injection.

**Rationale**:
- Follows NestJS best practices
- Enables easy mocking for unit tests
- Maintains testability of PromotionService

**Verification Required**: Ensure ActionLogModule exports ActionLogService and is imported by PromotionModule.

**Alternative Considered**: Direct instantiation of ActionLogService.
**Rejected Because**: Violates dependency injection principles, makes testing harder, breaks NestJS module system.

## Phase 0: Research & Design Artifacts

### research.md

Documents the following research areas:

1. **ActionLogService Integration Patterns**
   - How other services use ActionLogService
   - MongoDB connection configuration (logs connection)
   - Error handling patterns in existing code

2. **ActionLog Schema Analysis**
   - Current schema fields and types
   - Existing indices and query patterns
   - Data retention and cleanup policies

3. **Sentry Log Level Best Practices**
   - When to use 'critical' vs 'info' vs 'error'
   - Alert configuration for critical events
   - Performance impact of different log levels

4. **Fail-Safe Logging Patterns**
   - Try-catch vs Promise.catch patterns
   - Console fallback logging best practices
   - Monitoring for logging system health

### data-model.md

Documents the data structures:

1. **ActionLog MongoDB Document** (existing schema, reused)
2. **Cancellation Audit Log Data** (structure of log payload)
3. **Query Patterns** (how admins query cancellation logs)

### contracts/

No new API contracts - cancellation endpoint signature unchanged.

Existing: `contracts/terminate-promotion.yaml` (rename to `cancel-promotion.yaml` for consistency)

### quickstart.md

Developer guide with sections:

1. **Setup**: Verify ActionLogModule configuration
2. **Implementation**: Step-by-step for adding MongoDB logging
3. **Testing**: Unit and integration test examples
4. **Querying**: How to query MongoDB action_logs collection
5. **Troubleshooting**: Common issues and solutions

## Phase 1: Implementation Checklist

- [ ] **Research**: Complete research.md with ActionLogService patterns
- [ ] **Data Model**: Document ActionLog structure in data-model.md
- [ ] **Quickstart**: Create developer guide with examples
- [ ] **Verify Module Exports**: Ensure ActionLogModule exports ActionLogService
- [ ] **Update PromotionModule**: Import ActionLogModule if not already imported
- [ ] **Inject ActionLogService**: Add to PromotionService constructor
- [ ] **Update Sentry Log Level**: Change 'info' to 'critical' in LoggerService.captureMessage call
- [ ] **Add MongoDB Logging**: Call actionLogService.saveLog() with fail-safe wrapper
- [ ] **Update Unit Tests**: Mock ActionLogService, verify saveLog called with correct data
- [ ] **Create Integration Test**: Verify actual MongoDB persistence
- [ ] **Update Swagger Docs**: Mention dual logging in endpoint description
- [ ] **Update README**: Document audit log querying in README.md

## Non-Goals (Out of Scope)

The following are explicitly NOT included in this enhancement:

1. **Action Log Querying API**: No new API endpoints for querying action_logs collection. Admins query MongoDB directly or via existing tools.
2. **Action Log UI**: No admin dashboard for viewing logs. Use MongoDB clients or existing analytics tools.
3. **Real-Time Log Streaming**: No WebSocket or SSE for real-time log updates.
4. **Custom Log Retention Policies**: Use existing cleanup jobs. No feature-specific retention logic.
5. **Log Data Anonymization**: Log data is not anonymized or redacted. Follows existing patterns.
6. **Multi-Region Log Replication**: Single MongoDB logs database. No geo-replication for audit logs.
7. **Log Integrity Verification**: No cryptographic signing or tamper-proof logging.
8. **Structured Query Language (SQL) Interface**: MongoDB native queries only. No SQL abstraction.

## Success Criteria Mapping

_How this implementation achieves the success criteria from spec.md_

| Success Criteria | Implementation Strategy |
|------------------|------------------------|
| SC-003: 100% dual logging | Both LoggerService.captureMessage (Sentry) and ActionLogService.saveLog (MongoDB) called for every cancellation |
| SC-004: Queryable within 10s | MongoDB write concern defaults + existing indices ensure immediate queryability |
| SC-005: Query results <2s | Leverages existing indices on operatorId, logTimeStamp, action fields |
| SC-010: Fail-safe behavior | Try-catch wrapper around actionLogService.saveLog prevents cancellation failure |

All other success criteria (SC-001, SC-002, SC-006-009) are unchanged from original cancelPromotion implementation.

## Dependencies & Prerequisites

**Existing Infrastructure** (already available):
- [x] ActionLogService implemented in `src/core/action-log/services/action-log.service.ts`
- [x] ActionLog schema defined in `src/core/action-log/schemas/action-log.schema.ts`
- [x] MongoDB 'logs' connection configured
- [x] LoggerService integrated with Sentry
- [x] PromotionService.cancelPromotion implemented

**New Dependencies**: None required

**Configuration Requirements**:
- Verify `MONGODB_LOGS_URI` environment variable (or equivalent) is set
- Verify ActionLogModule is globally available or imported by PromotionModule

## Rollback Plan

If MongoDB logging causes issues after deployment:

1. **Emergency Rollback**: Comment out `actionLogService.saveLog()` call, redeploy
2. **Sentry Fallback**: Sentry logs continue to work (critical level preserved)
3. **No Data Loss**: Promotions are still cancelled successfully (fail-safe design)
4. **Investigation**: Check MongoDB logs connection, ActionLogService health

**Rollback Triggers**:
- MongoDB logging causing >50ms latency increase
- Unexpected exceptions escaping fail-safe wrapper
- ActionLogService availability issues

## Timeline Estimate

- **Phase 0 (Research)**: 1 hour
  - Review ActionLogService implementation
  - Review existing action_logs collection
  - Document findings in research.md

- **Phase 1 (Design)**: 1 hour
  - Create data-model.md
  - Update quickstart.md
  - Verify module exports

- **Phase 2 (Implementation)**: 2 hours
  - Inject ActionLogService
  - Update Sentry log level
  - Add MongoDB logging with fail-safe wrapper
  - Update unit tests

- **Phase 3 (Integration Testing)**: 1 hour
  - Create integration test
  - Verify MongoDB persistence
  - Test fail-safe behavior

- **Phase 4 (Documentation)**: 30 minutes
  - Update Swagger docs
  - Update README.md

**Total Estimated Time**: 5.5 hours

## Monitoring & Observability

**Success Metrics**:
- MongoDB action_logs collection document count increases with each cancellation
- Sentry shows critical-level events for all cancellations
- Zero cancellation failures due to logging issues

**Alerts**:
- ActionLogService failures exceed 10% of requests (investigate MongoDB health)
- Action logs collection size growing faster than expected (review retention policy)

**Dashboards**:
- Cancellation audit log volume (per day, per operator)
- MongoDB logging success rate
- Sentry critical event frequency

---

**Plan Status**: ✅ Ready for implementation  
**Next Step**: Generate Phase 0 research artifacts (research.md, data-model.md, quickstart.md)

