# Implementation Plan: Early Promotion Termination

**Branch**: `GL-5286-end-promotion` | **Date**: 2025-10-28 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/GL-5286-end-promotion/spec.md`

**Note**: This plan follows the constitution-driven workflow defined in `.cursor/.specify/templates/commands/plan.md`.

## Summary

Enable admin users to immediately terminate running promotion events before their scheduled end date. This feature allows rapid response to business, compliance, or technical requirements by atomically updating promotion end dates, claim expiration dates, and status. Includes audit logging for accountability. Admins must terminate promotions one-by-one to ensure careful, deliberate action.

**Technical Approach**: Extend existing NestJS promotion module with new termination endpoint, leverage MongoDB atomic updates for transaction safety, integrate with existing audit logging infrastructure via LoggerService, and maintain standardized error codes (PR31XX family). Implementation follows SOLID principles with separation between controller (HTTP), service (business logic), and schema (data).

## Technical Context

**Language/Version**: TypeScript 5.1.3 with strict mode enabled  
**Primary Dependencies**: NestJS 10.x, Mongoose 7.6.3, class-validator 0.14.0, class-transformer 0.5.1  
**Storage**: MongoDB via Mongoose ODM, collection: `game_promotions`, atomic updates for transaction safety  
**Testing**: Jest 29.5.0 with ts-jest, supertest for integration tests, @nestjs/testing for unit tests  
**Target Platform**: Node.js server (Linux/Windows), containerized deployment via Docker  
**Project Type**: Single backend API (NestJS monolith)  
**Performance Goals**: <200ms p95 response time, 1000+ req/s under normal load  
**Constraints**: <200ms p95 per constitution, atomic updates required, no partial state changes  
**Scale/Scope**: Support 10k+ active promotions, single termination operations only (no bulk)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Verify compliance with Game Promotion API Constitution principles:

- [x] **SOLID Principles**: Architecture follows SRP, OCP, LSP, ISP, DIP
  - Single Responsibility: PromotionController handles HTTP, PromotionService handles business logic
  - Open/Closed: Extensible via new error codes, no modification of existing promotion logic
  - Liskov Substitution: Extends existing Promotion schema without breaking compatibility
  - Interface Segregation: DTOs are focused on termination concerns only
  - Dependency Inversion: Service depends on Mongoose Model abstraction, not concrete implementation
- [x] **Clean Code**: Functions <20 lines, classes <200 lines, proper naming conventions
  - TerminatePromotionDto: Input validation DTO (<30 lines)
  - terminatePromotion() method: Single purpose, atomic update (<20 lines)
  - Naming: verbs for methods (terminatePromotion, bulkTerminatePromotions), nouns for DTOs
- [x] **Test-First**: Test strategy defined with AAA pattern and single assertions
  - Unit tests: Service methods with mocked Mongoose Model
  - Integration tests: Full request/response cycle with test database
  - Contract tests: OpenAPI spec validation for endpoints
  - Each test: Arrange (setup data) → Act (call method) → Assert (single expectation)
- [x] **Performance**: Response time targets <200ms p95, proper indexing planned
  - Mongoose findByIdAndUpdate for single termination: ~5-10ms
  - Bulk termination with bulkWrite: ~50-100ms for 100 promotions
  - Existing indexes on \_id sufficient (no new indexes required)
- [x] **UX Consistency**: Standardized response format, error codes, documentation
  - Response: `{ success: boolean, code: string, message: string, data?: T }`
  - New error codes: PR3103 (termination success), PR3104 (termination failed), PR3105 (invalid status)
  - Swagger docs: Complete with request/response examples
- [x] **Security**: Input validation, authentication/authorization strategy, no secrets in code
  - class-validator on TerminatePromotionDto (promotionId, adminUserId validation)
  - Authorization: Leverage existing NestJS guards (not implemented in this phase)
  - No secrets: Configuration via environment variables only

**Complexity Justification Required If**: None. All metrics within constitutional limits.

## Project Structure

### Documentation (this feature)

```text
specs/GL-5286-end-promotion/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output: Technology decisions and patterns
├── data-model.md        # Phase 1 output: Entity definitions and relationships
├── quickstart.md        # Phase 1 output: Development and testing guide
├── contracts/           # Phase 1 output: API contract specifications
│   └── terminate-promotion.yaml
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created yet)
```

### Source Code (repository root)

This is a **single project** (NestJS monolith) structure:

```text
src/
├── promotion/
│   ├── controllers/
│   │   ├── promotion.controller.ts          # Add terminatePromotion endpoint
│   │   └── promotion.controller.spec.ts     # Add termination tests
│   ├── services/
│   │   ├── promotion.service.ts             # Add terminatePromotion method
│   │   └── promotion.service.spec.ts        # Add service unit tests
│   ├── models/
│   │   └── terminate-promotion.dto.ts       # NEW: Input validation for termination
│   ├── responses/
│   │   └── terminate-promotion.response.ts  # NEW: Termination response type
│   ├── schemas/
│   │   └── promotion.schema.ts              # EXISTING: No changes needed
│   └── promotion.module.ts                  # EXISTING: No changes needed
├── constants/
│   ├── error-codes.ts                       # EXTEND: Add PR3103-PR3105
│   └── api-messages.ts                      # EXTEND: Add termination messages
└── core/
    └── logger/
        └── logger.service.ts                # EXISTING: Leverage for audit logs

tests/
├── unit/
│   └── promotion/
│       ├── promotion.service.terminate.spec.ts     # NEW: Unit tests
│       └── promotion.controller.terminate.spec.ts  # NEW: Controller tests
├── integration/
│   └── promotion/
│       └── terminate-promotion.integration.spec.ts # NEW: E2E tests
└── contract/
    └── promotion/
        └── terminate-promotion.contract.spec.ts    # NEW: OpenAPI validation
```

**Structure Decision**: Single project structure chosen because:

- Feature extends existing promotion module (no new domain)
- Shares schemas, services, and infrastructure with existing promotion operations
- Maintains consistency with project architecture
- No frontend changes required (assumes external admin UI)

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations identified. All metrics within constitutional limits:

- Classes: PromotionService remains <200 lines after adding 2 methods
- Functions: terminatePromotion() ~15 lines, bulkTerminatePromotions() ~18 lines
- No new patterns introduced (extends existing service/controller pattern)
- Performance targets met with existing MongoDB capabilities

---

## Phase 0: Research & Technology Decisions

See [research.md](./research.md) for complete analysis.

### Key Decisions

1. **Atomic Updates**: Use Mongoose `findByIdAndUpdate` with `runValidators: false` (dates don't need validation) for single termination.

2. **Transaction Safety**: MongoDB atomic updates sufficient (no multi-document transactions needed since we only update promotion document). Status is calculated field, not stored.

3. **Audit Logging**: Leverage existing LoggerService with structured JSON logs. Format: `{ action: 'PROMOTION_TERMINATED', promotionId, adminUserId, timestamp, originalEndDate, newEndDate }`.

4. **Error Handling**: Extend PROMOTION_ERROR_CODES with:
   - PR3103: Termination success
   - PR3104: Termination failed (database error, not found)
   - PR3105: Invalid status for termination (not running)

5. **No Bulk Operations**: Admins must terminate promotions one-by-one to ensure careful, deliberate action for each promotion. This adds safety by preventing accidental mass terminations.

---

## Phase 1: Design Artifacts

### Data Model

See [data-model.md](./data-model.md) for complete entity definitions.

**Summary**: No schema changes required. Promotion schema already has `endDate` and `claimExpirationDate` fields. Status is calculated dynamically based on current date vs start/end dates.

### API Contracts

See [contracts/](./contracts/) for OpenAPI specifications.

**Endpoint**:

- `PATCH /promotions/:id/terminate` - Terminate a single promotion

### Development Guide

See [quickstart.md](./quickstart.md) for setup and testing instructions.

---

## Post-Design Constitution Re-Check

_Re-evaluate after Phase 1 design completed._

- [x] **SOLID Principles**: Confirmed. Design maintains SRP with separate DTOs and response types
- [x] **Clean Code**: Confirmed. Method signatures designed for <20 lines each
- [x] **Test-First**: Confirmed. Test structure defined in research.md with AAA pattern
- [x] **Performance**: Confirmed. Atomic updates and bulk operations meet <200ms p95 target
- [x] **UX Consistency**: Confirmed. Error codes and response format match existing patterns
- [x] **Security**: Confirmed. Input validation via class-validator, authorization deferred to existing guards

**Status**: ✅ All constitutional requirements satisfied. Ready for `/speckit.tasks` to generate implementation tasks.

---

## Next Steps

1. Run `/speckit.tasks` to generate detailed task breakdown from this plan
2. Implement tasks in priority order (P1: Single termination → P2: Audit trail)
3. Each task follows Test-First: Write test → See it fail → Implement → See it pass
4. Run constitution compliance checks during code review
5. Update Swagger documentation as endpoints are implemented

## Notes

- **No Database Migrations**: Existing schema sufficient
- **No Breaking Changes**: New endpoints, existing functionality unchanged
- **Backward Compatible**: Calculated status field handles early termination automatically
- **Authorization**: Assumes existing NestJS guards handle admin role verification
- **Frontend Integration**: Out of scope (assumes external admin UI calls these APIs)
