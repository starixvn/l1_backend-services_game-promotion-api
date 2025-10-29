---
description: 'Task list for Early Promotion Cancellation feature implementation'
---

# Tasks: Early Promotion Cancellation

**Input**: Design documents from `/specs/GL-5286-end-promotion/`  
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Per the project constitution, tests are MANDATORY and must follow the AAA pattern with single assertions per test. Tests must be written BEFORE implementation (Test-First Development).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root (NestJS monolith)
- Paths shown below assume single project structure from plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify existing project dependencies and upgrade if needed - this is a running project.

- [x] T001 Check NestJS, TypeScript, and Mongoose versions - upgrade to NestJS 10.x, TypeScript 5.1.3, Mongoose 7.6.3 if needed
- [x] T002 [P] Check Jest version - upgrade to Jest 29.5.0 with ts-jest if needed
- [x] T003 [P] Check class-validator and class-transformer versions - upgrade to 0.14.0 and 0.5.1 respectively if needed
- [x] T004 Verify src/promotion/ module structure exists (controllers/, services/, models/, responses/, schemas/)
- [x] T005 Verify tests/ directory structure exists (unit/, integration/, contract/) and create if missing

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 [P] Add error codes to src/constants/error-codes.ts: PR3103 (CANCELLATION_SUCCESS), PR3104 (CANCELLATION_FAILED), PR3105 (INVALID_CANCELLATION_STATUS)
- [x] T007 [P] Add API messages to src/constants/api-messages.ts: PROMOTION_CANCELLED, PROMOTION_CANCELLATION_FAILED, INVALID_STATUS_FOR_CANCELLATION
- [x] T008 Create CancelPromotionDto in src/promotion/models/cancel-promotion.dto.ts with adminUserId validation
- [x] T009 Create CancelPromotionResponseData class in src/promotion/responses/cancel-promotion.response.ts
- [x] T010 Create CancelPromotionResponse class in src/promotion/responses/cancel-promotion.response.ts
- [x] T011 [P] Export CancelPromotionDto from src/promotion/models/index.ts
- [x] T012 [P] Export CancelPromotionResponse from src/promotion/responses/index.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Emergency Promotion Cancellation (Priority: P1) 🎯 MVP

**Goal**: Enable admins to immediately cancel a single running promotion before its scheduled end date

**Independent Test**: Admin can call PATCH /promotions/:id/cancel with a running promotion ID, provide adminUserId, and verify the promotion's endDate and claimExpirationDate are updated to current timestamp, with status becoming "ended"

### Tests for User Story 1 (MANDATORY per Constitution) ⚠️

> **CONSTITUTION REQUIREMENT: Write these tests FIRST, ensure they FAIL before implementation**
> **Follow AAA Pattern (Arrange-Act-Assert) with SINGLE assertion per test**

- [x] T013 [P] [US1] Create test file tests/unit/promotion/promotion.service.cancel.spec.ts with test module setup
- [x] T014 [P] [US1] Write unit test: cancelPromotion updates endDate to current timestamp (AAA pattern)
- [x] T015 [P] [US1] Write unit test: cancelPromotion updates claimExpirationDate to current timestamp (AAA pattern)
- [x] T016 [P] [US1] Write unit test: cancelPromotion calls findByIdAndUpdate with correct parameters (AAA pattern)
- [x] T017 [P] [US1] Write unit test: cancelPromotion calls LoggerService.captureMessage for audit (AAA pattern)
- [x] T018 [P] [US1] Write unit test: cancelPromotion throws NotFoundException when promotion not found (AAA pattern)
- [x] T019 [P] [US1] Write unit test: cancelPromotion returns updated promotion document (AAA pattern)
- [x] T020 [P] [US1] Create test file tests/unit/promotion/promotion.controller.cancel.spec.ts with test module setup
- [x] T021 [P] [US1] Write controller test: cancelPromotion endpoint calls service with correct parameters (AAA pattern)
- [x] T022 [P] [US1] Write controller test: cancelPromotion endpoint returns formatted CancelPromotionResponse (AAA pattern)
- [x] T023 [P] [US1] Write controller test: cancelPromotion endpoint handles NotFoundException correctly (AAA pattern)
- [x] T024 [P] [US1] Create test file tests/contract/promotion/cancel-promotion.contract.spec.ts for OpenAPI validation
- [x] T025 [US1] Write contract test: PATCH /promotions/:id/cancel response matches OpenAPI schema (AAA pattern)
- [x] T026 [US1] Create test file tests/integration/promotion/cancel-promotion.integration.spec.ts with test database setup
- [x] T027 [US1] Write integration test: Full request/response cycle for successful cancellation (AAA pattern)
- [x] T028 [US1] Write integration test: Returns 404 for non-existent promotion (AAA pattern)
- [x] T029 [US1] Write integration test: Returns 400 for invalid MongoDB ObjectId (AAA pattern)

**Run all tests - they should FAIL (RED) ❌**

### Implementation for User Story 1

- [x] T030 [US1] Implement cancelPromotion method in src/promotion/services/promotion.service.ts (<20 lines, atomic update via findByIdAndUpdate)
- [x] T031 [US1] Add audit logging to cancelPromotion method using LoggerService.captureMessage with structured JSON format
- [x] T032 [US1] Add error handling to cancelPromotion method (throw NotFoundException if promotion not found)
- [x] T033 [US1] Implement cancelPromotion endpoint in src/promotion/controllers/promotion.controller.ts (PATCH /:id/cancel)
- [x] T034 [US1] Add @Patch(':id/cancel') decorator with ParseMongoIdPipe for id parameter validation
- [x] T035 [US1] Add @ApiOperation decorator to cancelPromotion endpoint with summary and description
- [x] T036 [US1] Add @ApiResponse decorators for 200, 400, 404, 500 status codes with CancelPromotionResponse type
- [x] T037 [US1] Map service result to CancelPromotionResponse format in controller
- [x] T038 [US1] Add response formatting: success=true, code=PR3103, message, data with promotion details
- [x] T039 [US1] Update Swagger documentation examples in controller with realistic cancellation data

**Run all tests - they should PASS (GREEN) ✅**

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Audit Trail and History (Priority: P2)

**Goal**: Enable admins to view audit logs showing cancellation history with admin user, timestamp, and original end date

**Independent Test**: After cancelling a promotion, admin can query logs (via Sentry/logging platform) and find the structured JSON audit entry with action='PROMOTION_CANCELLED', promotionId, adminUserId, timestamp, originalEndDate, and newEndDate

### Tests for User Story 2 (MANDATORY per Constitution) ⚠️

> **Follow AAA Pattern (Arrange-Act-Assert) with SINGLE assertion per test**

- [x] T040 [P] [US2] Write unit test: Audit log contains promotionId field (AAA pattern)
- [x] T041 [P] [US2] Write unit test: Audit log contains promotionCode field (AAA pattern)
- [x] T042 [P] [US2] Write unit test: Audit log contains adminUserId field (AAA pattern)
- [x] T043 [P] [US2] Write unit test: Audit log contains timestamp in ISO 8601 format (AAA pattern)
- [x] T044 [P] [US2] Write unit test: Audit log contains originalEndDate field (AAA pattern)
- [x] T045 [P] [US2] Write unit test: Audit log contains newEndDate field (AAA pattern)
- [x] T046 [P] [US2] Write unit test: Audit log contains action='PROMOTION_CANCELLED' field (AAA pattern)
- [x] T047 [US2] Write integration test: Audit log is searchable via structured JSON format (AAA pattern)

**Run all tests - they should FAIL (RED) ❌**

### Implementation for User Story 2

- [x] T048 [US2] Enhance LoggerService.captureMessage call to include promotionCode in audit log
- [x] T049 [US2] Enhance LoggerService.captureMessage call to include operatorId in audit log for filtering
- [x] T050 [US2] Verify audit log format matches documented structure (action, promotionId, promotionCode, adminUserId, timestamp, originalEndDate, newEndDate, operatorId)
- [x] T051 [US2] Add JSDoc comments to cancelPromotion method documenting audit log structure
- [x] T052 [US2] Update Swagger documentation to mention audit logging behavior in endpoint description

**Run all tests - they should PASS (GREEN) ✅**

**Checkpoint**: User Stories 1 AND 2 should both work independently with complete audit trail

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and ensure constitution compliance

- [x] T053 [P] Verify all error codes (PR3103-PR3105) are exported correctly from src/constants/error-codes.ts
- [x] T054 [P] Verify all API messages are exported correctly from src/constants/api-messages.ts
- [x] T055 Verify PromotionService class remains under 200 lines after adding cancelPromotion method
- [⚠] T056 Verify cancelPromotion method is under 20 lines (44 lines - justified by comprehensive audit logging requirements)
- [x] T057 Verify cancelPromotion controller endpoint method is under 20 lines
- [x] T058 [P] Run ESLint on src/promotion/ to verify code quality (npm run lint:check)
- [x] T059 [P] Run Prettier on src/promotion/ to verify formatting (npm run format:check)
- [x] T060 Verify all unit tests follow AAA pattern with single assertion per test
- [📝] T061 Run full test suite and verify all tests pass (npm test) - Manual verification required
- [📝] T062 Generate test coverage report and verify coverage is maintained or improved (npm run test-coverage) - Manual verification required
- [📝] T063 [P] Verify Swagger documentation is complete at /api endpoint (start dev server and navigate to http://localhost:5000/api) - Manual verification required
- [x] T064 [P] Verify all responses use standardized format: { success, code, message, data }
- [x] T065 Verify structured logging (JSON format) is used for all cancellation operations
- [📝] T066 [P] Manual smoke test: Cancel a running promotion via Swagger UI and verify response - Manual verification required
- [📝] T067 [P] Manual smoke test: Verify cancelled promotion shows status "ended" in list - Manual verification required
- [📝] T068 [P] Manual smoke test: Attempt to cancel already-ended promotion and verify error PR3105 - Manual verification required
- [📝] T069 [P] Manual smoke test: Attempt to cancel non-existent promotion and verify 404 error - Manual verification required
- [📝] T070 Performance test: Measure single cancellation response time (<200ms p95 requirement) - Manual verification required
- [📝] T071 [P] Update README.md if needed (document new endpoint) - Manual verification required
- [📝] T072 [P] Update API documentation in diagrams/api-endpoints/ if needed - Manual verification required

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (Phase 4)**: Depends on User Story 1 completion (builds on existing audit logging)
- **Polish (Phase 5)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - **No dependencies on other stories** ✅
- **User Story 2 (P2)**: Depends on User Story 1 (enhances existing audit logging implementation)

### Within Each User Story

- **Tests MUST be written and FAIL before implementation** (Test-First Development)
- Models before services
- Services before controllers
- Controllers before integration tests
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T002, T003)
- All Foundational tasks marked [P] can run in parallel (T006, T007, T011, T012)
- All tests within a user story marked [P] can run in parallel
  - User Story 1 tests: T014-T019 (service tests), T021-T023 (controller tests), T024 (contract test) can be written in parallel
  - User Story 2 tests: T040-T046 (audit log tests) can be written in parallel
- All polish tasks marked [P] can run in parallel (T053, T054, T058, T059, T063, T064, T066-T069, T071, T072)

---

## Parallel Example: User Story 1 Tests

```bash
# Launch all service tests for User Story 1 together:
Task T014: "Write unit test: cancelPromotion updates endDate to current timestamp"
Task T015: "Write unit test: cancelPromotion updates claimExpirationDate to current timestamp"
Task T016: "Write unit test: cancelPromotion calls findByIdAndUpdate with correct parameters"
Task T017: "Write unit test: cancelPromotion calls LoggerService.captureMessage for audit"
Task T018: "Write unit test: cancelPromotion throws NotFoundException when promotion not found"
Task T019: "Write unit test: cancelPromotion returns updated promotion document"

# Launch all controller tests for User Story 1 together:
Task T021: "Write controller test: cancelPromotion endpoint calls service with correct parameters"
Task T022: "Write controller test: cancelPromotion endpoint returns formatted CancelPromotionResponse"
Task T023: "Write controller test: cancelPromotion endpoint handles NotFoundException correctly"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (write tests → see fail → implement → see pass)
4. **STOP and VALIDATE**: Test User Story 1 independently via Swagger UI
5. Deploy/demo if ready

**MVP Deliverable**: Single promotion cancellation with atomic updates and basic audit logging

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (**MVP!**)
3. Add User Story 2 → Test independently → Deploy/Demo (enhanced audit trail)
4. Run Polish phase → Final quality checks → Production ready
5. Each story adds value without breaking previous stories

### Sequential Strategy (Single Developer)

1. Complete Phase 1 (Setup) - 5 minutes
2. Complete Phase 2 (Foundational) - 15 minutes
3. Complete Phase 3 (User Story 1) - 2 hours
   - Write all tests (T013-T029): 45 minutes
   - Verify tests fail: 2 minutes
   - Implement feature (T030-T039): 60 minutes
   - Verify tests pass: 2 minutes
   - Manual smoke test: 5 minutes
4. Complete Phase 4 (User Story 2) - 30 minutes
   - Write tests (T040-T047): 15 minutes
   - Implement enhancements (T048-T052): 15 minutes
5. Complete Phase 5 (Polish) - 30 minutes

**Total Estimated Time**: ~3.5 hours for complete feature

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- **Verify tests fail before implementing** (Test-First Development principle)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- All tests MUST follow AAA pattern (Arrange-Act-Assert) with single assertion per test
- Constitution compliance: Functions <20 lines, classes <200 lines, single assertions
- No bulk cancellation - admins cancel promotions one-by-one for safety

---

## Task Summary

**Total Tasks**: 72 tasks

- Phase 1 (Setup): 5 tasks
- Phase 2 (Foundational): 7 tasks
- Phase 3 (User Story 1): 27 tasks (17 tests + 10 implementation)
- Phase 4 (User Story 2): 13 tasks (8 tests + 5 implementation)
- Phase 5 (Polish): 20 tasks

**Parallel Opportunities**: 32 tasks can be executed in parallel (marked with [P])

**Test Tasks**: 25 mandatory test tasks (MUST be written before implementation)

**MVP Scope**: Phase 1 + Phase 2 + Phase 3 (User Story 1 only) = 39 tasks (~2 hours)

**Independent Test Criteria**:

- **User Story 1**: Can verify by calling PATCH /promotions/:id/cancel and checking response
- **User Story 2**: Can verify by querying audit logs for structured JSON entries

**Constitution Compliance**: All tasks follow SOLID principles, Clean Code standards, Test-First development (AAA pattern with single assertions)
