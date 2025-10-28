# Phase 1: Data Model

**Feature**: Early Promotion Termination  
**Date**: 2025-10-28  
**Status**: Complete

## Overview

This document defines the data structures, entities, and relationships for the early promotion termination feature. The implementation leverages existing Promotion schema without modifications, introduces new DTOs for input validation, and defines response types for API contracts.

---

## Existing Entities (No Changes Required)

### Promotion Entity

**Collection**: `game_promotions`  
**Schema**: `src/promotion/schemas/promotion.schema.ts`  
**Status**: ✅ No modifications needed

The existing Promotion schema already contains all required fields for termination:

```typescript
@Schema({ timestamps: true, collection: 'game_promotions' })
export class Promotion {
  _id: ObjectId; // MongoDB unique identifier
  name: string; // Promotion name
  code: string; // Promotion code (slug)
  operatorId: string; // Operator identifier
  offeredSiteNames: string[]; // Sites where offered (empty = all)
  currencyGroups: ObjectId[]; // Currency group IDs

  // DATE FIELDS (Key to termination)
  startDate: Date; // Promotion start date/time
  endDate: Date; // Promotion end date/time ← UPDATED on termination
  claimExpirationDate: Date; // Bonus claim expiry ← UPDATED on termination

  bonusItemCount: number; // Free spins count
  offeredPlayerIds: string[]; // Eligible players (empty = all)
  gameConfigType: number; // 2=ClassicSlot, 3=CascadingSlot
  gameIds: number[]; // Eligible game IDs
  betLevels: BetLevel[]; // Bet levels per currency group
  coinValues: CoinValue[]; // Coin values per currency group
  isGiftCode: boolean; // Gift code flag
  minTurnoverMultiplier: number; // Minimum TO multiplier (≥2)

  // Timestamps (Mongoose auto-managed)
  createdAt: Date;
  updatedAt: Date;
}
```

#### Calculated Fields (Not Stored)

**Promotion Status** is derived dynamically:

```typescript
type PromotionStatus = 'not_started' | 'running' | 'ended';

// Calculation logic:
function calculateStatus(promotion: Promotion, now: Date): PromotionStatus {
  if (now < promotion.startDate) return 'not_started';
  if (now >= promotion.startDate && now <= promotion.endDate) return 'running';
  return 'ended';
}
```

**Termination Impact**: When `endDate` is updated to current timestamp, status automatically becomes `'ended'` for all future queries.

---

## New DTOs (Input Validation)

### TerminatePromotionDto

**Purpose**: Validate input for single promotion termination  
**File**: `src/promotion/models/terminate-promotion.dto.ts`  
**HTTP Context**: `PATCH /promotions/:id/terminate`

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

**Validation Rules**:

- `adminUserId`: Required, non-empty string

**Usage**:

```typescript
@Patch(':id/terminate')
async terminatePromotion(
  @Param('id') promotionId: string,      // From URL path (validated by ParseMongoIdPipe)
  @Body() dto: TerminatePromotionDto,    // From request body
) {
  return this.promotionService.terminatePromotion(promotionId, dto.adminUserId);
}
```

**Note**: No bulk termination DTO. Admins must terminate promotions one-by-one for safety.

---

## New Response Types

### 1. TerminatePromotionResponse

**Purpose**: Type-safe response for single termination  
**File**: `src/promotion/responses/terminate-promotion.response.ts`  
**HTTP Context**: `PATCH /promotions/:id/terminate` response

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class TerminatePromotionResponseData {
  @ApiProperty({
    description: 'Terminated promotion ID',
    example: '507f1f77bcf86cd799439011',
  })
  promotionId: string;

  @ApiProperty({
    description: 'Promotion code',
    example: 'summer-promo-2025',
  })
  promotionCode: string;

  @ApiProperty({
    description: 'Original scheduled end date (before termination)',
    example: '2025-12-31T23:59:59.000Z',
  })
  originalEndDate: string; // ISO 8601 format

  @ApiProperty({
    description: 'New end date (termination timestamp)',
    example: '2025-10-28T14:30:00.000Z',
  })
  newEndDate: string; // ISO 8601 format

  @ApiProperty({
    description: 'Timestamp when termination occurred',
    example: '2025-10-28T14:30:00.000Z',
  })
  terminatedAt: string; // ISO 8601 format

  @ApiProperty({
    description: 'Admin user who performed the termination',
    example: 'admin123',
  })
  adminUserId: string;
}

export class TerminatePromotionResponse {
  @ApiProperty({
    description: 'Operation success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response code',
    example: 'PR3103',
  })
  code: string;

  @ApiProperty({
    description: 'Human-readable message',
    example: 'Promotion terminated successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Termination details',
    type: TerminatePromotionResponseData,
  })
  data: TerminatePromotionResponseData;
}
```

## Audit Log Structure (Logging)

**Not stored in database**. Logged via LoggerService as structured JSON.

```typescript
interface AuditLogEntry {
  action: 'PROMOTION_TERMINATED';
  promotionId: string;
  promotionCode: string;
  adminUserId: string;
  timestamp: string; // ISO 8601 format
  originalEndDate: string; // ISO 8601 format
  newEndDate: string; // ISO 8601 format
  operatorId: string; // For filtering/search
}
```

**Example Log Output**:

```json
{
  "action": "PROMOTION_TERMINATED",
  "promotionId": "507f1f77bcf86cd799439011",
  "promotionCode": "summer-promo-2025",
  "adminUserId": "admin123",
  "timestamp": "2025-10-28T14:30:00.000Z",
  "originalEndDate": "2025-12-31T23:59:59.000Z",
  "newEndDate": "2025-10-28T14:30:00.000Z",
  "operatorId": "op123"
}
```

---

## Entity Relationships

```
┌─────────────────────────────────────────────────────┐
│                 Promotion Entity                     │
│  (game_promotions collection)                        │
│                                                      │
│  Fields affected by termination:                    │
│  • endDate          ← Set to current timestamp      │
│  • claimExpirationDate ← Set to current timestamp   │
│                                                      │
│  Calculated fields:                                 │
│  • status           ← Auto-updates to "ended"       │
└─────────────────────────────────────────────────────┘
                       ▲
                       │
                       │ Updates
                       │
┌─────────────────────┴─────────────────────────────┐
│        TerminatePromotionDto                       │
│        (Input validation)                          │
│                                                    │
│  • adminUserId: string                            │
└────────────────────────────────────────────────────┘
                       │
                       │ Validates
                       ▼
┌─────────────────────────────────────────────────────┐
│       PromotionService.terminatePromotion()         │
│       (Business logic)                              │
│                                                     │
│  1. Validate promotion exists                      │
│  2. Validate status is "running"                   │
│  3. Atomically update endDate & claimExpiration    │
│  4. Log audit entry                                │
└─────────────────────────────────────────────────────┘
                       │
                       │ Returns
                       ▼
┌─────────────────────────────────────────────────────┐
│     TerminatePromotionResponse                      │
│     (Output format)                                 │
│                                                     │
│  • success: boolean                                │
│  • code: string (PR3103/PR3104/PR3105)            │
│  • message: string                                 │
│  • data: { promotionId, dates, adminUserId }      │
└─────────────────────────────────────────────────────┘
```

---

## Data Flow

### Single Termination Flow

```
1. HTTP Request
   ↓
   PATCH /promotions/507f1f77bcf86cd799439011/terminate
   Body: { "adminUserId": "admin123" }

2. Input Validation (automatic via ValidationPipe)
   ↓
   TerminatePromotionDto validates adminUserId
   ParseMongoIdPipe validates promotionId

3. Controller Layer
   ↓
   PromotionController.terminatePromotion()
   Extracts params, calls service

4. Service Layer
   ↓
   PromotionService.terminatePromotion(promotionId, adminUserId)

   a. Fetch promotion: findById(promotionId)
   b. Validate exists: if (!promotion) throw NotFoundException
   c. Validate status: calculate status, check === 'running'
   d. Store original endDate for audit
   e. Atomic update: findByIdAndUpdate with $set
   f. Log audit entry via LoggerService
   g. Return updated document

5. Response Mapping
   ↓
   Map Promotion document to TerminatePromotionResponse
   Include: promotionId, code, dates, adminUserId

6. HTTP Response
   ↓
   Status: 200 OK
   Body: { success, code, message, data }
```

**Note**: No bulk termination flow. Admins must terminate promotions individually.

---

## Database Operations

### Single Termination Query

```typescript
// MongoDB operation
db.game_promotions.findOneAndUpdate(
  { _id: ObjectId('507f1f77bcf86cd799439011') },
  {
    $set: {
      endDate: ISODate('2025-10-28T14:30:00.000Z'),
      claimExpirationDate: ISODate('2025-10-28T14:30:00.000Z'),
    },
  },
  { returnDocument: 'after' },
);
```

**Performance**: ~5-10ms (single document update with \_id index)

---

## Validation Rules Summary

| Field                     | Type   | Required | Validation                | Error Code              |
| ------------------------- | ------ | -------- | ------------------------- | ----------------------- |
| `promotionId` (URL param) | string | Yes      | Valid MongoDB ObjectId    | 400 (ValidationPipe)    |
| `adminUserId` (body)      | string | Yes      | Non-empty string          | 400 (ValidationPipe)    |
| Promotion exists          | -      | Yes      | findById returns document | PR3100 (not found)      |
| Promotion status          | -      | Yes      | Must be "running"         | PR3105 (invalid status) |

---

## State Transitions

```
Promotion Status Lifecycle:

NOT_STARTED ──────────────────────────────────► RUNNING ──────────────────────────────────► ENDED
(before startDate)              (startDate reached)     (endDate reached OR terminated)

Termination Effect:
  RUNNING ──terminate()──► ENDED (immediate transition)
```

**Key Point**: Termination is **irreversible**. No state transition from ENDED back to RUNNING.

---

## Data Model Validation Checklist

- [x] No schema modifications required (leverages existing Promotion schema)
- [x] DTOs defined for input validation (TerminatePromotionDto, BulkTerminatePromotionsDto)
- [x] Response types defined for output (TerminatePromotionResponse, BulkTerminatePromotionsResponse)
- [x] Audit log structure documented (JSON format via LoggerService)
- [x] Entity relationships mapped (Promotion ← DTO → Service → Response)
- [x] Data flow documented (request → validation → service → response)
- [x] Database operations specified (findByIdAndUpdate, bulkWrite)
- [x] Validation rules defined (MongoDB ObjectId, array size, required fields)
- [x] State transitions documented (NOT_STARTED → RUNNING → ENDED)
- [x] Performance characteristics estimated (<200ms single, <10s bulk)

**Status**: ✅ Data model complete. Ready for API contract generation (Phase 1 continued).
