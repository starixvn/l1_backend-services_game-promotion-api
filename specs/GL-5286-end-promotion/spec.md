# Feature Specification: Early Promotion Cancellation

**Feature Branch**: `GL-5286-end-promotion`  
**Created**: 2025-10-28  
**Updated**: 2025-10-30 (Added MongoDB audit logging via ActionLogService)  
**Status**: Enhanced  
**Input**: User description: "Allow Admin to End or Stop a Promotion Event Midway" + "Add audit log for cancelPromotion, need to reuse action-log.service.ts"

## User Scenarios & Testing _(mandatory)_

<!--
  User stories are PRIORITIZED as user journeys ordered by importance.
  Each user story is INDEPENDENTLY TESTABLE and can be delivered as an MVP increment.
-->

### User Story 1 - Emergency Promotion Termination (Priority: P1)

As an Admin User, I want to immediately end a running promotion event before its scheduled end date, so that I can react quickly to business, compliance, or technical requirements without waiting for the event to finish automatically.

**Why this priority**: This is the core functionality. Admins need the ability to stop problematic promotions immediately to:

- Address compliance violations
- Respond to business decisions (budget exhaustion, partnership changes)
- Mitigate technical issues (fraud detection, system load)
- React to customer complaints or negative publicity

**Independent Test**: Admin can navigate to a running promotion, click "End Promotion", confirm the action, and verify the promotion status changes to "Completed" with updated end date and claim expiration date matching the current timestamp.

**Acceptance Scenarios**:

1. **Given** a promotion with status "Running" (current date is between start and end dates), **When** Admin selects the promotion and clicks "End Promotion" button, **Then** a confirmation dialog appears with details about the promotion and consequences of early termination
2. **Given** the confirmation dialog is displayed, **When** Admin clicks "Confirm", **Then** the system updates the promotion's end date to current timestamp, sets claim expiration date to current timestamp, changes status to "Completed", and displays a success message
3. **Given** the confirmation dialog is displayed, **When** Admin clicks "Cancel", **Then** the dialog closes and no changes are made to the promotion
4. **Given** a promotion has been terminated early, **When** viewing the promotion details, **Then** the promotion shows status "Completed" with the actual end date (earlier than originally scheduled)
5. **Given** a promotion has been terminated early, **When** a player attempts to use remaining bonus items, **Then** the system prevents redemption because the claim expiration date has passed

---

### User Story 2 - Audit Trail and History (Priority: P2)

As an Admin User, I want to see a clear record of when and why a promotion was cancelled early, so that I can maintain accountability and review past administrative actions.

**Why this priority**: Accountability and compliance require tracking administrative actions. This enables:

- Audit compliance for financial and regulatory reviews
- Troubleshooting and understanding past decisions
- Training new administrators on proper procedures
- Dispute resolution if players complain about cancelled promotions
- Queryable audit history stored in MongoDB for long-term retention and analysis

**Independent Test**: After cancelling a promotion early, Admin can query the MongoDB action_logs collection and find the cancellation record with complete details (admin ID, timestamp, promotion ID, original end date, new end date).

**Acceptance Scenarios**:

1. **Given** an Admin cancels a promotion, **When** the cancellation is recorded, **Then** the system logs to both Sentry (via LoggerService) and MongoDB (via ActionLogService) with admin user ID, timestamp, action type ("cancel-promotion"), promotion details, and original/new end dates
2. **Given** a promotion was cancelled early, **When** Admin queries the action logs by promotionId, **Then** the MongoDB log shows who cancelled it, when, the original scheduled end date, and the new end date for comparison
3. **Given** multiple promotions exist, **When** Admin queries action logs by action type "cancel-promotion", **Then** the system returns all cancellation events with complete audit information
4. **Given** an Admin queries audit logs by date range, **When** filtering for cancellation events within a specific period, **Then** the system returns all matching cancellation logs sorted by timestamp
5. **Given** a cancellation audit log exists, **When** reviewing the log entry, **Then** it contains all required fields: promotionId, promotionCode, adminUserId, timestamp, originalEndDate, newEndDate, operatorId, action type

### Edge Cases

- What happens when an Admin tries to end a promotion that hasn't started yet (status "Not Started")?
  - **Assumption**: System should prevent this action or display a warning that the promotion hasn't started. Consider allowing admins to cancel future promotions instead.
- What happens when an Admin tries to end a promotion that has already ended (status "Ended" or "Completed")?
  - **Assumption**: The "End Promotion" button should be disabled or hidden for already-completed promotions.

- What happens to players who are actively using bonus items at the exact moment of termination?
  - **Assumption**: In-progress game rounds should be allowed to complete. The system should check claim expiration at the start of each new bonus item usage.

- What happens if there's a network error during the termination process?
  - **Assumption**: Transaction should be atomic (all updates succeed or none). System should retry or rollback on failure and inform the admin.

- What happens to scheduled jobs or automated processes that reference the promotion?
  - **Assumption**: Any background jobs should respect the updated end date and claim expiration date. Notification systems should handle early termination gracefully.

- Should there be role-based restrictions on who can cancel promotions?
  - **Assumption**: Only users with "Admin" or "Promotion Manager" roles should have access to cancel promotions. Standard users and read-only roles should not see this option.

- What happens if MongoDB logging (ActionLogService.saveLog) fails during cancellation?
  - **Assumption**: The promotion cancellation should proceed successfully and the failure should be logged to console. Sentry logging (LoggerService) should still work. MongoDB logging is best-effort and should not block the critical business operation.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide an "End Promotion" action for promotions with status "Running"
- **FR-002**: System MUST display a confirmation dialog before executing promotion termination
- **FR-003**: Confirmation dialog MUST show promotion name, code, current status, original end date, and consequences of early termination
- **FR-004**: System MUST update the promotion's End Date field to the current date and time upon confirmation
- **FR-005**: System MUST update the promotion's Claim Expiration Date field to the current date and time upon confirmation
- **FR-006**: System MUST change the promotion's status to "Completed" upon confirmation
- **FR-007**: System MUST prevent players from claiming or using bonus items after the updated Claim Expiration Date
- **FR-008**: System MUST log the cancellation action to Sentry (via LoggerService.captureMessage) with structured JSON containing timestamp, admin user ID, action type, promotion details, and original/new end dates
- **FR-009**: System MUST persist the cancellation action to MongoDB action_logs collection (via ActionLogService.saveLog) with all audit details for long-term retention and queryability
- **FR-010**: System MUST handle MongoDB logging failures gracefully without disrupting the cancellation operation (fail-safe logging)
- **FR-011**: System MUST display a success message to the Admin after successful cancellation
- **FR-012**: System MUST display an error message if cancellation fails, without partially updating the promotion
- **FR-013**: System MUST disable or hide the "End Promotion" action for promotions with status "Not Started", "Ended", or "Completed"

### Non-Functional Requirements (Constitution Compliance)

- **NFR-001**: API responses MUST follow standardized format (success, code, message, data)
- **NFR-002**: Promotion termination endpoint MUST respond within 200ms at p95 (excluding external service calls)
- **NFR-003**: All inputs MUST be validated using class-validator DTOs (promotion ID, admin authorization)
- **NFR-004**: All termination operations MUST use structured logging (JSON format) with promotion ID, admin ID, and timestamp
- **NFR-005**: All code MUST follow SOLID principles and Clean Code standards
- **NFR-006**: All tests MUST follow AAA pattern with single assertion per test

### Key Entities _(include if feature involves data)_

- **Promotion**: The main entity being terminated. Key attributes:
  - `_id`: Unique identifier (ObjectId)
  - `name`: Promotion name
  - `code`: Promotion code
  - `startDate`: Start date and time
  - `endDate`: End date and time (will be updated to current timestamp)
  - `claimExpirationDate`: Date when bonus items become unclaimable (will be updated to current timestamp)
  - `status`: Calculated based on current date vs start/end dates ("not_started", "running", "ended")
  - `operatorId`: Operator identifier
  - `offeredSiteNames`: Sites where promotion is offered

- **Admin User**: The user performing the termination. Key attributes:
  - `userId`: Unique identifier
  - `role`: User role (must be "Admin" or "Promotion Manager")
  - `permissions`: User permissions array

- **Audit Log Entry (Sentry)**: Record of the cancellation action sent to Sentry via LoggerService. Key attributes:
  - `action`: "cancel-promotion"
  - `promotionId`: Reference to the promotion
  - `promotionCode`: Promotion code
  - `adminUserId`: Admin who performed the action
  - `timestamp`: When the action occurred (ISO 8601 format)
  - `originalEndDate`: Original scheduled end date for comparison
  - `newEndDate`: Updated end date (current timestamp)
  - `operatorId`: Operator identifier for filtering

- **Action Log Entry (MongoDB)**: Persistent record stored in MongoDB action_logs collection via ActionLogService. Key attributes:
  - `action`: "cancel-promotion"
  - `operatorId`: Operator identifier
  - `logTimeStamp`: When the action occurred (ISO 8601 string format)
  - `request`: Object containing cancellation details
    - `promotionId`: Reference to the promotion
    - `promotionCode`: Promotion code
    - `adminUserId`: Admin who performed the action
    - `originalEndDate`: Original scheduled end date
    - `newEndDate`: Updated end date (cancellation timestamp)
  - `response`: Object containing operation result (success/error)

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Admins can successfully cancel a running promotion and see status change to "Completed" within 5 seconds of confirmation
- **SC-002**: System prevents players from claiming bonus items within 1 minute of promotion cancellation (claim expiration enforced)
- **SC-003**: 100% of promotion cancellation actions are logged to both Sentry and MongoDB with complete audit information (admin ID, timestamp, promotion ID, original/new end dates)
- **SC-004**: MongoDB audit logs are queryable within 10 seconds of cancellation action completion
- **SC-005**: Admins can retrieve cancellation audit logs from MongoDB by promotionId, operatorId, adminUserId, action type, or date range with results returned in under 2 seconds
- **SC-006**: Zero partial updates occur (all fields update atomically or none update on error)
- **SC-007**: Admin receives clear confirmation feedback (success or failure) for 100% of cancellation attempts
- **SC-008**: System correctly prevents cancellation attempts on non-running promotions (not started, already ended)
- **SC-009**: Promotion list/detail views reflect cancelled status immediately after refresh (no stale data)
- **SC-010**: MongoDB logging failures do not prevent successful promotion cancellation (fail-safe behavior)

## Assumptions

1. **Database Access**: The system has direct MongoDB access to the `game_promotions` collection with update permissions
2. **Status Calculation**: Promotion status ("not_started", "running", "ended") is calculated dynamically based on comparing current date to start/end dates
3. **Transaction Support**: MongoDB supports atomic updates or transactions to ensure all three fields (endDate, claimExpirationDate, status) update together
4. **Authorization**: Admin authentication and role-based access control (RBAC) is already implemented in the system
5. **UI Framework**: There is an existing admin dashboard/UI where promotions are listed and can be selected
6. **Error Handling**: Existing standardized error code system (PR31XX for promotion operations) will be extended for termination-specific errors
7. **Player Impact**: In-progress game rounds complete normally; only new bonus item claims are blocked after termination
8. **Audit Infrastructure**: System has existing audit logging infrastructure (LoggerService for Sentry, ActionLogService for MongoDB) that can be extended for cancellation events
9. **MongoDB Logs Database**: System has a separate MongoDB connection named 'logs' for the action_logs collection with write permissions
10. **ActionLog Schema**: The action_logs collection follows the existing ActionLog schema with action, operatorId, logTimeStamp, request, and response fields
11. **Fail-Safe Logging**: MongoDB logging failures (ActionLogService.saveLog) are caught and logged to console without disrupting the main cancellation operation
12. **Time Zones**: All timestamps are stored in UTC and the current date/time for cancellation uses server UTC time
13. **Concurrent Access**: If multiple admins attempt to cancel the same promotion simultaneously, last-write-wins or optimistic locking prevents conflicts

## Out of Scope

The following are explicitly NOT included in this feature:

1. **Bulk Termination**: Admins must terminate promotions one-by-one. No bulk/batch termination to ensure careful, deliberate action for each promotion.
2. **Pause/Resume Functionality**: This feature permanently terminates promotions. Temporarily pausing a promotion with the ability to resume later is not included.
3. **Partial Termination**: Cannot selectively terminate promotion for specific sites, games, or player groups while keeping it active for others.
4. **Automated Termination**: No automated rules or triggers for early termination (e.g., "auto-stop if budget exceeds X"). This is manual admin action only.
5. **Player Notifications**: System does not automatically notify affected players about early termination. External communication is handled separately.
6. **Refund/Compensation Logic**: System does not automatically calculate or issue refunds/compensation for unused bonus items.
7. **Termination Reason Capture**: Version 1 does not include a mandatory reason field or note when terminating (may be added in P2 Audit Trail story).
8. **Schedule Future Termination**: Cannot schedule a promotion to terminate at a future date/time. Termination is immediate upon confirmation.
9. **Rollback/Undo**: Once terminated, a promotion cannot be un-terminated or reverted to running status.
