# Game Promotion API Development Guidelines

Auto-generated from feature plans. Last updated: 2025-10-28

## Active Technologies

**Backend Framework**: NestJS 10.x  
**Language**: TypeScript 5.1.3 (strict mode enabled)  
**Database**: MongoDB 7.6.3 via Mongoose ODM  
**Validation**: class-validator 0.14.0, class-transformer 0.5.1  
**Testing**: Jest 29.5.0 with ts-jest, @nestjs/testing, supertest  
**API Documentation**: Swagger/OpenAPI via @nestjs/swagger 8.1.1  
**Monitoring**: OpenTelemetry (tracing), Sentry (error tracking)  
**Code Quality**: ESLint 8.x, Prettier 3.x, Husky (pre-commit hooks)

## Project Structure

```text
src/
├── promotion/                    # Promotion management module
│   ├── controllers/
│   │   ├── promotion.controller.ts          # HTTP endpoints
│   │   └── player-promotion.controller.ts   # Player-specific endpoints
│   ├── services/
│   │   ├── promotion.service.ts             # Business logic
│   │   └── player-promotion.service.ts      # Player promotion logic
│   ├── models/                              # DTOs (input validation)
│   │   ├── create-promotion.dto.ts
│   │   └── terminate-promotion.dto.ts       # NEW (GL-5286)
│   ├── responses/                           # Response types (output)
│   │   └── terminate-promotion.response.ts  # NEW (GL-5286)
│   ├── schemas/                             # Mongoose schemas
│   │   ├── promotion.schema.ts
│   │   └── player-promotion.schema.ts
│   └── promotion.module.ts
├── constants/
│   ├── error-codes.ts                       # Standardized error codes
│   └── api-messages.ts                      # API response messages
├── core/                                    # Shared infrastructure
│   ├── logger/
│   │   └── logger.service.ts                # Structured logging (JSON)
│   ├── filters/
│   │   └── all-exceptions.filter.ts         # Global exception handling
│   ├── pipes/
│   │   └── parse-mongo-id.pipe.ts           # MongoDB ObjectId validation
│   └── tracing/
│       └── tracing.ts                       # OpenTelemetry setup
├── app.module.ts
└── main.ts                                  # Bootstrap, Swagger setup

tests/
├── unit/                                    # Unit tests (mocked dependencies)
├── integration/                             # Integration tests (real DB)
└── contract/                                # API contract validation tests

specs/                                       # Feature specifications
└── GL-5286-end-promotion/
    ├── spec.md                              # Feature requirements
    ├── plan.md                              # Implementation plan
    ├── research.md                          # Technology decisions
    ├── data-model.md                        # Entity definitions
    ├── quickstart.md                        # Development guide
    └── contracts/                           # OpenAPI specs
        ├── terminate-promotion.yaml
        └── bulk-terminate-promotions.yaml
```

## Architecture Patterns

### Module Organization (NestJS)

1. **Controllers**: HTTP concerns only (routing, request/response mapping)
   - Use decorators: `@Controller`, `@Get`, `@Post`, `@Patch`, `@Delete`
   - Validation via `@Body()`, `@Param()`, `@Query()` with DTOs
   - Swagger docs via `@ApiOperation`, `@ApiResponse`, `@ApiProperty`

2. **Services**: Business logic and orchestration
   - Injected via constructor (Dependency Injection)
   - Single Responsibility: One service per domain entity
   - Max 200 lines, max 10 public methods per class

3. **DTOs** (Data Transfer Objects): Input validation
   - Use class-validator decorators: `@IsString`, `@IsMongoId`, `@IsArray`
   - Swagger documentation via `@ApiProperty`
   - File naming: `*.dto.ts`

4. **Responses**: Output types
   - Define TypeScript classes/interfaces for type safety
   - Swagger documentation via `@ApiProperty`
   - File naming: `*.response.ts`

5. **Schemas**: MongoDB/Mongoose models
   - Use `@Schema`, `@Prop` decorators
   - Collection name specified in `@Schema({ collection: 'name' })`
   - File naming: `*.schema.ts`

### Standardized Response Format

**ALL endpoints MUST follow this format** (Constitution requirement):

```typescript
{
  success: boolean,
  code: string,      // Error code: {MODULE}{CATEGORY}{NUMBER}
  message: string,
  data?: T           // Typed response data
}
```

**Error Code System**:

- **SB30XX**: Spin Bonus (Player Promotion operations)
- **PR31XX**: Promotion management
- **AN32XX**: Announcement operations
- **PT33XX**: Promotion Ticket operations

Example: `PR3103` = Promotion Termination Success

## Commands

### Development

```bash
# Install dependencies
npm install

# Start development server (hot reload)
npm run start:dev

# Build for production
npm run build

# Start production server
npm run start:prod
```

### Code Quality

```bash
# Format code (Prettier)
npm run format

# Check formatting without changes
npm run format:check

# Lint code (ESLint, auto-fix)
npm run lint

# Lint without auto-fix
npm run lint:check
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test-coverage

# Run integration tests
npm run test:e2e
```

### Pre-commit Hooks

Husky + lint-staged automatically run on `git commit`:

- Prettier formatting on staged `*.ts` files
- ESLint linting on staged `*.ts` files

## Code Style (TypeScript + NestJS)

### Naming Conventions

- **Classes/Interfaces**: PascalCase (`PromotionService`, `TerminatePromotionDto`)
- **Variables/Functions**: camelCase (`terminatePromotion`, `adminUserId`)
- **Files/Directories**: kebab-case (`terminate-promotion.dto.ts`, `player-promotion/`)
- **Constants/Env Vars**: UPPERCASE (`MONGODB_URI`, `PROMOTION_ERROR_CODES`)

### Function Guidelines

1. **Verb-based names**: `terminatePromotion`, `bulkTerminatePromotions`
2. **Boolean functions**: Prefix with `is`/`has`/`can` (`isRunning`, `hasExpired`)
3. **Single purpose**: Max 20 lines per function
4. **One level of abstraction**: Use helper functions for complex logic
5. **Early returns**: Avoid nesting, return/throw early for validation

### Class Guidelines

1. **Max 200 lines** per class
2. **Max 10 public methods** per class
3. **Max 10 properties** per class
4. **Dependency Injection**: Use constructor injection
5. **Single Responsibility**: One reason to change

### Testing Guidelines (Constitution: AAA Pattern + Single Assert)

**Structure Every Test**:

```typescript
describe('ClassName.methodName', () => {
  describe('when condition', () => {
    it('should do specific thing', async () => {
      // Arrange: Setup test data and mocks
      const inputData = { ... };
      mockService.method.mockResolvedValue(expectedData);

      // Act: Execute the method under test
      const result = await service.methodName(inputData);

      // Assert: ONE expectation per test
      expect(result.field).toBe(expectedValue);
    });
  });
});
```

**Key Rules**:

- ✅ ONE assertion per test (single assert principle)
- ✅ Test doubles for all dependencies (except lightweight libraries)
- ✅ Variable naming: `input*`, `mock*`, `expected*`, `actual*`
- ✅ Tests MUST be written BEFORE implementation (Red-Green-Refactor)

## Database Conventions

### MongoDB Operations

1. **Atomic Updates**: Use `findByIdAndUpdate` with `$set` operator
2. **Bulk Operations**: Use `bulkWrite` with `ordered: false` for parallelism
3. **Error Handling**: Always check for null results
4. **Indexing**: Leverage existing indexes, avoid unnecessary new indexes

### Schema Validation

- Use Mongoose schema validation for required fields
- Use class-validator for API input validation (DTOs)
- Avoid redundant validation (trust schema for database operations)

## API Documentation (Swagger)

**Every endpoint requires**:

- `@ApiOperation`: Summary and description
- `@ApiResponse`: For each possible status code (200, 400, 404, 500)
- `@ApiProperty`: On all DTO properties and response fields
- Examples for request bodies and responses

**Access Swagger UI**: `http://localhost:5000/api`

## Recent Changes

### GL-5286: Early Promotion Termination (2025-10-28)

**What**: Enable admins to terminate running promotions before scheduled end date

**Added**:

- New DTO: `TerminatePromotionDto`
- New response: `TerminatePromotionResponse`
- New error codes: PR3103-PR3105 (termination success/failure)
- New endpoint: `PATCH /promotions/:id/terminate` (single termination only)
- Service method: `terminatePromotion()`
- Audit logging via LoggerService (structured JSON)
- Safety feature: No bulk termination - admins must terminate one-by-one

**Impact**:

- No schema changes (uses existing Promotion fields)
- No new dependencies
- Test-first implementation with AAA pattern
- Performance: <200ms p95 per single termination

**Key Patterns**:

- Atomic MongoDB updates via `findByIdAndUpdate`
- Single termination only (no bulk operations for safety)
- Audit logging with structured JSON format
- Standardized error response format

## Constitution Compliance

**Mandatory Requirements** (see `.cursor/.specify/memory/constitution.md`):

1. **SOLID Principles**: All code must follow SRP, OCP, LSP, ISP, DIP
2. **Clean Code**: Functions <20 lines, classes <200 lines, clear naming
3. **Test-First**: AAA pattern, single assertion per test, tests before code
4. **Performance**: <200ms p95 response times, proper indexing
5. **UX Consistency**: Standardized response format, clear error codes
6. **Security**: Input validation, no secrets in code, authorization guards

## Quick Reference

### Create New DTO

```typescript
import { IsString, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MyDto {
  @ApiProperty({ description: 'Description', example: 'example' })
  @IsString()
  myField: string;
}
```

### Create New Endpoint

```typescript
@Patch(':id/action')
@ApiOperation({ summary: 'Do something' })
@ApiResponse({ status: 200, description: 'Success', type: MyResponse })
async myEndpoint(
  @Param('id') id: string,
  @Body() dto: MyDto,
): Promise<MyResponse> {
  return this.myService.myMethod(id, dto);
}
```

### Write Test (AAA + Single Assert)

```typescript
it('should update field correctly', async () => {
  // Arrange
  const input = { id: 'test-id', value: 'new-value' };
  mockModel.findByIdAndUpdate.mockResolvedValue({ ...input });

  // Act
  const result = await service.update(input);

  // Assert
  expect(result.value).toBe('new-value');
});
```

### Add Error Code

```typescript
// src/constants/error-codes.ts
export const PROMOTION_ERROR_CODES = {
  // Existing codes...
  MY_NEW_ERROR: { code: 'PR3XXX' },
} as const;
```

## Troubleshooting

**Issue**: ValidationPipe not working  
**Solution**: Verify global ValidationPipe in `main.ts` with `whitelist: true`, `forbidNonWhitelisted: true`

**Issue**: Swagger not showing endpoint  
**Solution**: Check controller has `@ApiTags()`, methods have `@ApiOperation()`, restart dev server

**Issue**: Tests failing with mock errors  
**Solution**: Ensure all dependencies are mocked in test module, use `getModelToken()` for Mongoose

**Issue**: MongoDB connection errors  
**Solution**: Check `.env` has correct `MONGODB_URI`, ensure MongoDB is running

**Issue**: Linting errors on commit  
**Solution**: Run `npm run format` and `npm run lint` before committing

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
