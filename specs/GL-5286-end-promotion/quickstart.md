# Quickstart Guide: Early Promotion Termination

**Feature**: GL-5286-end-promotion  
**Date**: 2025-10-28  
**Audience**: Developers implementing the feature

## Overview

This guide provides step-by-step instructions for implementing, testing, and verifying the early promotion termination feature. Follow the Test-First Development approach as required by the project constitution.

---

## Prerequisites

### Environment Setup

1. **Node.js**: Version 20.x or higher
2. **MongoDB**: Local instance or connection to test database
3. **Dependencies**: Already installed (no new dependencies required)

### Configuration

Ensure `.env` file has correct values:

```bash
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/minigame

# Server Configuration
PORT=5000

# Logging & Monitoring
SENTRY_DSN=your-sentry-dsn
SENTRY_TRACES_SAMPLE_RATE=0.1
SYSTEM_NAME=game-promotion-api
ENV=DEV
```

### Verify Existing Setup

```bash
# Install dependencies
npm install

# Verify build
npm run build

# Run existing tests
npm test

# Start dev server
npm run start:dev
```

Expected output: Server starts on port 5000, Swagger docs available at `http://localhost:5000/api`

---

## Implementation Order (Test-First)

Follow this sequence to implement the feature with TDD discipline:

### Phase 1: Error Codes & Constants (5 min)

**No tests needed** - Adding constants only.

1. Edit `src/constants/error-codes.ts`:

```typescript
export const PROMOTION_ERROR_CODES = {
  // Existing codes...
  PROMOTION_NOT_FOUND: { code: 'PR3100' },
  PROMOTION_EXPIRED: { code: 'PR3101' },
  PROMOTION_NOT_ACTIVE: { code: 'PR3102' },

  // NEW: Add these codes
  TERMINATION_SUCCESS: { code: 'PR3103' },
  TERMINATION_FAILED: { code: 'PR3104' },
  INVALID_TERMINATION_STATUS: { code: 'PR3105' },
} as const;
```

2. Edit `src/constants/api-messages.ts`:

```typescript
export const API_MESSAGES = {
  // Existing messages...

  // NEW: Add these messages
  PROMOTION_TERMINATED: 'Promotion terminated successfully',
  PROMOTION_TERMINATION_FAILED: 'Promotion termination failed',
  INVALID_STATUS_FOR_TERMINATION: 'Cannot terminate promotion with status',
};
```

### Phase 2: DTOs (5 min)

**Create file**:

1. `src/promotion/models/terminate-promotion.dto.ts`:

```typescript
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TerminatePromotionDto {
  @ApiProperty({
    description: 'Admin user ID performing the termination',
    example: 'admin123',
    required: true,
  })
  @IsString()
  adminUserId: string;
}
```

2. Export from `src/promotion/models/index.ts`:

```typescript
export * from './terminate-promotion.dto';
```

### Phase 3: Response Types (5 min)

**Create file**:

1. `src/promotion/responses/terminate-promotion.response.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class TerminatePromotionResponseData {
  @ApiProperty({ description: 'Terminated promotion ID' })
  promotionId: string;

  @ApiProperty({ description: 'Promotion code' })
  promotionCode: string;

  @ApiProperty({ description: 'Original scheduled end date' })
  originalEndDate: string;

  @ApiProperty({ description: 'New end date (termination timestamp)' })
  newEndDate: string;

  @ApiProperty({ description: 'Timestamp when termination occurred' })
  terminatedAt: string;

  @ApiProperty({ description: 'Admin user who performed termination' })
  adminUserId: string;
}

export class TerminatePromotionResponse {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Response code' })
  code: string;

  @ApiProperty({ description: 'Human-readable message' })
  message: string;

  @ApiProperty({ description: 'Termination details', type: TerminatePromotionResponseData })
  data: TerminatePromotionResponseData;
}
```

2. Export from `src/promotion/responses/index.ts`:

```typescript
export * from './terminate-promotion.response';
```

### Phase 4: Service Tests (30 min) - TEST FIRST ⚠️

**Create file**: `src/promotion/services/promotion.service.terminate.spec.ts`

**Follow AAA pattern with single assertion per test**:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PromotionService } from './promotion.service';
import { Promotion } from '../schemas/promotion.schema';
import { LoggerService } from '../../core/logger/logger.service';
import { NotFoundException } from '@nestjs/common';

describe('PromotionService - Termination', () => {
  let service: PromotionService;
  let mockPromotionModel: any;
  let mockLoggerService: any;

  beforeEach(async () => {
    mockPromotionModel = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      bulkWrite: jest.fn(),
    };

    mockLoggerService = {
      captureMessage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionService,
        { provide: getModelToken(Promotion.name), useValue: mockPromotionModel },
        { provide: LoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<PromotionService>(PromotionService);
  });

  describe('terminatePromotion', () => {
    describe('when promotion exists and is running', () => {
      it('should update endDate to current timestamp', async () => {
        // Arrange
        const promotionId = 'test-id';
        const adminUserId = 'admin123';
        const mockPromotion = {
          _id: promotionId,
          code: 'test-promo',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          claimExpirationDate: new Date('2025-12-31'),
        };
        mockPromotionModel.findById.mockResolvedValue(mockPromotion);
        const updatedPromotion = { ...mockPromotion, endDate: new Date() };
        mockPromotionModel.findByIdAndUpdate.mockResolvedValue(updatedPromotion);

        // Act
        const result = await service.terminatePromotion(promotionId, adminUserId);

        // Assert
        expect(result.endDate.getTime()).toBeCloseTo(Date.now(), -2); // Within 100ms
      });

      it('should update claimExpirationDate to current timestamp', async () => {
        // Arrange
        const promotionId = 'test-id';
        const adminUserId = 'admin123';
        const mockPromotion = {
          _id: promotionId,
          code: 'test-promo',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          claimExpirationDate: new Date('2025-12-31'),
        };
        mockPromotionModel.findById.mockResolvedValue(mockPromotion);
        const updatedPromotion = { ...mockPromotion, claimExpirationDate: new Date() };
        mockPromotionModel.findByIdAndUpdate.mockResolvedValue(updatedPromotion);

        // Act
        const result = await service.terminatePromotion(promotionId, adminUserId);

        // Assert
        expect(result.claimExpirationDate.getTime()).toBeCloseTo(Date.now(), -2);
      });

      it('should call findByIdAndUpdate with correct parameters', async () => {
        // Arrange
        const promotionId = 'test-id';
        const adminUserId = 'admin123';
        const mockPromotion = {
          _id: promotionId,
          code: 'test-promo',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          claimExpirationDate: new Date('2025-12-31'),
        };
        mockPromotionModel.findById.mockResolvedValue(mockPromotion);
        mockPromotionModel.findByIdAndUpdate.mockResolvedValue(mockPromotion);

        // Act
        await service.terminatePromotion(promotionId, adminUserId);

        // Assert
        expect(mockPromotionModel.findByIdAndUpdate).toHaveBeenCalledWith(
          promotionId,
          expect.objectContaining({
            $set: expect.objectContaining({
              endDate: expect.any(Date),
              claimExpirationDate: expect.any(Date),
            }),
          }),
          expect.objectContaining({
            new: true,
            runValidators: false,
          }),
        );
      });

      it('should log audit information', async () => {
        // Arrange
        const promotionId = 'test-id';
        const adminUserId = 'admin123';
        const mockPromotion = {
          _id: promotionId,
          code: 'test-promo',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          claimExpirationDate: new Date('2025-12-31'),
        };
        mockPromotionModel.findById.mockResolvedValue(mockPromotion);
        mockPromotionModel.findByIdAndUpdate.mockResolvedValue(mockPromotion);

        // Act
        await service.terminatePromotion(promotionId, adminUserId);

        // Assert
        expect(mockLoggerService.captureMessage).toHaveBeenCalledTimes(1);
      });
    });

    describe('when promotion does not exist', () => {
      it('should throw NotFoundException', async () => {
        // Arrange
        const promotionId = 'non-existent-id';
        const adminUserId = 'admin123';
        mockPromotionModel.findById.mockResolvedValue(null);

        // Act & Assert
        await expect(service.terminatePromotion(promotionId, adminUserId)).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  // Add more test suites for bulkTerminatePromotions...
});
```

**Run tests** (they should FAIL):

```bash
npm test -- promotion.service.terminate.spec.ts
```

Expected: All tests RED ❌ (methods not implemented yet)

### Phase 5: Service Implementation (30 min)

**Edit**: `src/promotion/services/promotion.service.ts`

Add methods:

```typescript
async terminatePromotion(
  promotionId: string,
  adminUserId: string,
): Promise<PromotionDocument> {
  // Fetch promotion
  const promotion = await this.promotionModel.findById(promotionId);
  if (!promotion) {
    throw new NotFoundException(PROMOTION_ERROR_CODES.PROMOTION_NOT_FOUND);
  }

  // Store original for audit
  const originalEndDate = promotion.endDate;
  const now = new Date();

  // Atomic update
  const updatedPromotion = await this.promotionModel.findByIdAndUpdate(
    promotionId,
    {
      $set: {
        endDate: now,
        claimExpirationDate: now,
      },
    },
    {
      new: true,
      runValidators: false,
    },
  );

  // Audit log
  this.loggerService.captureMessage(
    JSON.stringify({
      action: 'PROMOTION_TERMINATED',
      promotionId: promotionId,
      promotionCode: promotion.code,
      adminUserId: adminUserId,
      timestamp: now.toISOString(),
      originalEndDate: originalEndDate.toISOString(),
      newEndDate: now.toISOString(),
    }),
  );

  return updatedPromotion;
}
```

**Note**: No `bulkTerminatePromotions` method needed. Admins terminate one-by-one for safety.

**Run tests** (they should PASS):

```bash
npm test -- promotion.service.terminate.spec.ts
```

Expected: All tests GREEN ✅

### Phase 6: Controller Tests & Implementation (30 min)

Follow same pattern:

1. Write controller tests (RED)
2. Implement controller methods (GREEN)
3. Verify all tests pass

### Phase 7: Integration Tests (20 min)

Create: `test/promotion/terminate-promotion.integration.spec.ts`

Run full request/response cycle with test database.

---

## Testing Checklist

### Unit Tests

- [ ] Service: `terminatePromotion` updates dates correctly
- [ ] Service: `terminatePromotion` logs audit information
- [ ] Service: `terminatePromotion` throws error if not found
- [ ] Service: `bulkTerminatePromotions` processes multiple IDs
- [ ] Service: `bulkTerminatePromotions` handles partial failures
- [ ] Controller: Calls service with correct parameters
- [ ] Controller: Returns formatted response

### Integration Tests

- [ ] `PATCH /promotions/:id/terminate` returns 200 for running promotion
- [ ] `PATCH /promotions/:id/terminate` returns 404 for non-existent promotion
- [ ] `PATCH /promotions/:id/terminate` returns 422 for invalid status
- [ ] `PATCH /promotions/bulk-terminate` processes multiple promotions
- [ ] Response format matches OpenAPI spec

### Manual Testing

Use Swagger UI at `http://localhost:5000/api`:

1. **Setup Test Data**:
   - Create a running promotion via existing endpoints
   - Note the promotion ID

2. **Test Single Termination**:
   - Navigate to `PATCH /promotions/{id}/terminate`
   - Enter promotion ID and adminUserId
   - Execute request
   - Verify 200 response
   - Verify promotion now shows status "ended"

3. **Test Multiple Promotions** (if needed):
   - Terminate each promotion individually
   - Verify each termination is logged separately in audit trail

---

## Verification Steps

### 1. Constitution Compliance

```bash
# Classes under 200 lines
wc -l src/promotion/services/promotion.service.ts

# Functions under 20 lines (manual review)
# Check terminatePromotion() and bulkTerminatePromotions()
```

### 2. Performance Benchmarks

```bash
# Single termination: Should be <50ms
curl -X PATCH http://localhost:5000/promotions/[id]/terminate \
  -H "Content-Type: application/json" \
  -d '{"adminUserId":"admin123"}' \
  -w "\nTime: %{time_total}s\n"

# Expected: Time: <0.05s
```

### 3. Code Coverage

```bash
npm run test-coverage

# Expected: Coverage maintained or improved
# Check coverage/lcov-report/index.html
```

### 4. Linting & Formatting

```bash
npm run lint
npm run format:check

# Expected: No errors
```

---

## Common Issues & Solutions

### Issue 1: Tests fail with "Cannot find module"

**Solution**: Ensure all imports use correct paths and files are exported from index.ts.

### Issue 2: MongoDB connection errors in tests

**Solution**: Use in-memory MongoDB or mock Mongoose Model properly.

### Issue 3: Validation errors not triggered

**Solution**: Verify global ValidationPipe is enabled in `main.ts`.

### Issue 4: Swagger docs not showing new endpoints

**Solution**: Restart dev server, check controller decorators (@ApiOperation, @ApiResponse).

---

## Next Steps

After completing implementation:

1. **Code Review**: Submit PR, ensure constitution compliance checks pass
2. **Documentation**: Update Swagger examples with real data
3. **Deployment**: Deploy to staging, run smoke tests
4. **Monitoring**: Verify OpenTelemetry traces and Sentry error tracking work

---

## Additional Resources

- **API Contracts**: See [contracts/](./contracts/) for OpenAPI specs
- **Data Model**: See [data-model.md](./data-model.md) for entity details
- **Research**: See [research.md](./research.md) for technology decisions
- **Constitution**: See `.cursor/.specify/memory/constitution.md` for coding standards

**Questions?** Check existing promotion implementations in `src/promotion/` for patterns and conventions.
