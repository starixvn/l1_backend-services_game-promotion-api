<!--
  SYNC IMPACT REPORT
  ==================
  Version Change: 0.0.0 → 1.0.0
  Modified Principles: Constitution created from scratch
  Added Sections:
    - Core Principles (6 principles: SOLID, Clean Code, Test-First, Performance, UX Consistency, Security)
    - Development Standards (Code Quality Tools, Documentation, Version Control)
    - Quality Gates & Compliance (Pre-Implementation, Pre-Merge, Production Deployment)
    - Governance (Authority, Amendment Process, Compliance Review, Agent Guidance)
  Removed Sections: None
  Templates Requiring Updates:
    ✅ plan-template.md - Updated Constitution Check section with concrete principles and compliance checklist
    ✅ spec-template.md - Added Non-Functional Requirements section with constitution compliance standards
    ✅ tasks-template.md - Updated all test references to MANDATORY, added AAA pattern and single assertion requirements, updated file extensions to .ts, added SOLID reminders, enhanced polish phase
    ✅ checklist-template.md - No updates needed (generic template)
    ✅ agent-file-template.md - No updates needed (generic template)
  Follow-up TODOs: None - All templates synchronized
-->

# Game Promotion API Constitution

## Core Principles

### I. SOLID Principles & Clean Architecture (NON-NEGOTIABLE)

Every component MUST adhere to SOLID principles:

- **Single Responsibility**: Each class/module has ONE reason to change
- **Open/Closed**: Open for extension, closed for modification
- **Liskov Substitution**: Derived classes must be substitutable for their base classes
- **Interface Segregation**: No client should depend on methods it doesn't use
- **Dependency Inversion**: Depend on abstractions, not concretions

Architectural Requirements:

- Modular architecture with clear separation of concerns
- Controllers handle HTTP concerns only (routing, request/response mapping)
- Services contain business logic and orchestration
- Repositories/Entities handle data persistence
- DTOs for input validation, separate types for outputs
- Maximum 200 lines per class, 20 lines per function
- Maximum 10 public methods per class, 10 properties per class

**Rationale**: SOLID principles ensure maintainability, testability, and scalability. Clean architecture prevents technical debt and enables independent testing of business logic.

### II. Clean Code Standards (NON-NEGOTIABLE)

All code MUST follow these standards:

- **Naming**: Use intention-revealing names; verbs for functions, nouns for classes
  - PascalCase for classes/interfaces
  - camelCase for variables/functions/methods
  - kebab-case for files/directories
  - UPPERCASE for environment variables and constants
- **Functions**: Single purpose, verb-based names, less than 20 instructions
  - Start boolean functions with is/has/can
  - Use early returns to avoid nesting
  - Prefer higher-order functions (map, filter, reduce) over loops
  - Default parameters instead of null/undefined checks
- **Abstraction**: One level of abstraction per function
- **Comments**: Self-documenting code preferred; JSDoc for public APIs only
- **Error Handling**: Exceptions for unexpected errors only; global handlers for common cases
- **No Magic Numbers**: Define named constants
- **English Only**: All code, comments, and documentation in English
- **Type Safety**: Explicit types for all variables and functions; avoid `any`

**Rationale**: Clean code reduces cognitive load, prevents bugs, and makes onboarding faster. Consistent conventions eliminate bikeshedding and improve code reviews.

### III. Test-First Development (NON-NEGOTIABLE)

Testing MUST follow strict TDD discipline:

**Test Structure (AAA Pattern)**:

- **Arrange**: Setup test data and dependencies
- **Act**: Execute the unit under test
- **Assert**: Verify ONE expected outcome per test

**Test Rules**:

- ONE assertion per test (single assert principle)
- Tests MUST be written BEFORE implementation
- Tests MUST fail before implementation (Red-Green-Refactor cycle)
- Variable naming: `input*`, `mock*`, `expected*`, `actual*`
- Test doubles for all dependencies (except lightweight third-party libraries)

**Test Coverage Requirements**:

- Unit tests for EVERY public function/method
- Integration tests for module boundaries and external communications
- Contract tests for API endpoints (request/response validation)
- Smoke tests via `admin/test` endpoint per controller
- End-to-end tests for critical user journeys

**Test Organization**:

- `tests/unit/` - Pure unit tests with mocked dependencies
- `tests/integration/` - Module integration and database tests
- `tests/contract/` - API contract validation tests
- `tests/e2e/` - End-to-end user journey tests

**Rationale**: Test-first development catches bugs early, documents intent, and enables fearless refactoring. Single assertions make test failures immediately clear. AAA structure ensures readability and maintainability.

### IV. Performance & Scalability Standards

All code MUST meet these performance requirements:

**Response Time Constraints**:

- API endpoints MUST respond in <200ms at p95 (excluding external service calls)
- Database queries MUST be indexed and optimized (<50ms for simple queries)
- Bulk operations MUST use streaming or pagination (max 1000 items per batch)

**Resource Constraints**:

- No memory leaks; proper cleanup of connections, subscriptions, and timers
- Efficient data structures (avoid N+1 queries, unnecessary iterations)
- Connection pooling for database and external services

**Scalability Requirements**:

- Stateless services (no in-memory session state)
- Horizontal scaling ready (no file system dependencies except logs)
- Idempotent operations where applicable
- Rate limiting and throttling for public endpoints

**Monitoring & Observability**:

- Structured logging (JSON format) for all significant operations
- OpenTelemetry tracing for distributed operations
- Error tracking via Sentry with context
- Performance metrics for critical paths

**Rationale**: Performance requirements prevent production issues and ensure system scalability. Monitoring enables proactive problem detection and resolution.

### V. User Experience Consistency

All API interactions MUST provide consistent, predictable experiences:

**Response Format**:

- Standardized response structure for ALL endpoints:
  ```typescript
  {
    success: boolean,
    code: string,      // Error code system: {MODULE}{CATEGORY}{NUMBER}
    message: string,
    data?: T           // Typed response data
  }
  ```

**Error Handling**:

- Consistent error codes across modules (SB=SpinBonus, PR=Promotion, AN=Announcement)
- Meaningful error messages with actionable context
- No internal implementation details leaked to clients
- Proper HTTP status codes (200, 400, 404, 500, etc.)

**API Design**:

- RESTful conventions for resource endpoints
- Swagger/OpenAPI documentation MUST be complete and accurate
- Input validation with class-validator (fail fast with clear messages)
- Consistent pagination, filtering, and sorting patterns
- Idempotent POST/PUT operations where possible

**Documentation**:

- Swagger UI accessible at `/api` endpoint
- Request/response schemas documented with examples
- Edge cases and validation rules documented
- README with quickstart guide and common use cases

**Rationale**: Consistent UX reduces integration time for consumers, minimizes support burden, and improves API adoption. Clear documentation prevents misuse and support tickets.

### VI. Security & Data Protection

Security MUST be built into every layer:

**Input Validation**:

- Validate ALL inputs using class-validator DTOs
- Sanitize inputs to prevent injection attacks
- Validate data types, ranges, and formats at the edge
- Reject unknown properties in request bodies

**Authentication & Authorization**:

- Implement guards for permission checks
- No business logic in authentication layer
- Proper separation between authentication (identity) and authorization (permissions)
- Audit logging for sensitive operations

**Data Protection**:

- Sensitive data (credentials, PII) MUST NOT be logged
- Environment variables for all secrets (NO hardcoded credentials)
- Secure handling of MongoDB connections and queries
- Proper error messages that don't expose system internals

**Dependencies**:

- Regular security audits of npm dependencies
- No deprecated or unmaintained packages
- Lock file (package-lock.json) MUST be committed

**Rationale**: Security breaches are costly and damage reputation. Defense-in-depth approach minimizes risk at every layer.

## Development Standards

### Code Quality Tools (MANDATORY)

All code MUST pass these checks before commit:

**Pre-commit Hooks** (enforced via Husky + lint-staged):

- Prettier formatting (`npm run format`)
- ESLint linting (`npm run lint`)
- TypeScript compilation (`tsc --noEmit`)

**Continuous Integration**:

- All tests must pass (`npm run test`)
- Code coverage must not decrease (`npm run test-coverage`)
- Linting and formatting checks must pass
- Build must succeed

**Code Review Requirements**:

- At least one approval required
- All comments resolved before merge
- No merge if CI pipeline fails
- Branch protection on main/master

### Documentation Standards

**Code Documentation**:

- JSDoc for all public classes and methods
- README.md with setup, configuration, and usage
- API documentation via Swagger (auto-generated + manual annotations)
- Inline comments ONLY for complex business logic (why, not what)

**Architecture Documentation**:

- Sequence diagrams for complex flows (in `diagrams/sequence/`)
- Data model documentation (in `diagrams/data-models/`)
- Architecture decision records for significant technical choices

### Version Control

**Branch Strategy**:

- Feature branches: `[TICKET-ID]-feature-name`
- Bugfix branches: `[TICKET-ID]-bugfix-name`
- Hotfix branches: `hotfix-[description]`

**Commit Messages**:

- Conventional commits format: `type(scope): description`
- Types: feat, fix, docs, refactor, test, chore
- Reference ticket IDs in commits

**Git Hygiene**:

- No merge commits (rebase workflow)
- Squash commits before merge (clean history)
- Never commit secrets, credentials, or .env files
- Never force push to main/master without approval

## Quality Gates & Compliance

### Pre-Implementation Gates

Before starting implementation, the following MUST be complete:

- [ ] Feature specification approved (spec.md)
- [ ] Implementation plan reviewed (plan.md)
- [ ] Constitution compliance verified (all principles considered)
- [ ] Test strategy defined
- [ ] Security considerations documented
- [ ] Performance requirements identified

### Pre-Merge Gates

Before merging to main, the following MUST be satisfied:

- [ ] All tests passing (unit, integration, contract)
- [ ] Code coverage at or above baseline
- [ ] ESLint and Prettier checks passing
- [ ] Swagger documentation updated
- [ ] Code review approved
- [ ] No security vulnerabilities introduced
- [ ] Performance benchmarks met (if applicable)

### Production Deployment Gates

Before deploying to production:

- [ ] Smoke tests passing in staging
- [ ] Database migrations tested and reversible
- [ ] Monitoring dashboards configured
- [ ] Rollback plan documented
- [ ] Security scan completed
- [ ] Performance testing completed for critical paths

## Governance

### Constitution Authority

This constitution is the PRIMARY governance document for the Game Promotion API project. All team members, code reviews, and automated checks MUST enforce these principles. When in conflict:

1. Constitution principles override team preferences
2. Complexity must be justified (document in implementation plan)
3. Violations require explicit approval and documentation

### Amendment Process

**Minor Amendments (PATCH version bump)**:

- Clarifications, wording improvements, typo fixes
- Non-semantic refinements
- Requires: Team discussion + documentation update

**Moderate Amendments (MINOR version bump)**:

- New principle added
- Expanded guidance or requirements
- Requires: Team approval + impact analysis + template updates

**Major Amendments (MAJOR version bump)**:

- Removal or redefinition of existing principles
- Backward-incompatible governance changes
- Requires: Full team consensus + migration plan + 2-week notice

### Compliance Review

**Continuous Compliance**:

- Pre-commit hooks enforce formatting and linting
- CI pipeline enforces test coverage and build success
- Code reviews verify adherence to principles

**Quarterly Reviews**:

- Review constitution relevance and effectiveness
- Collect feedback on principle pain points
- Update principles based on lessons learned

**Audit Trail**:

- All amendments documented in this file's header
- Version history tracked in git
- Major changes announced to full team

### Agent Development Guidance

For AI assistants and automated tools working on this project:

- Consult `.cursor/rules` for NestJS-specific TypeScript guidelines
- Use `.cursor/.specify/templates/` for feature planning and task generation
- Follow test-first development strictly (tests before implementation)
- Verify against constitution principles before code generation
- Flag potential violations for human review

**Version**: 1.0.0 | **Ratified**: 2025-10-28 | **Last Amended**: 2025-10-28
