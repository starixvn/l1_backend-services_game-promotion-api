# API Client Structure

This document outlines the organized structure of the Game Promotion API Client, following the "one class per file" practice.

## Directory Structure

```
api-client/
├── config/
│   └── api-client.config.ts          # API client configuration interface
├── dtos/
│   ├── assign-promotion.dto.ts        # AssignPromotionDto interface
│   ├── create-promotion-ticket.dto.ts # CreatePromotionTicketDto interface
│   ├── deduct-bonus-item.dto.ts       # DeductBonusItemDto interface
│   ├── player.dto.ts                  # PlayerDto interface
│   ├── rollback-bonus-item.dto.ts     # RollbackBonusItemDto interface
│   └── index.ts                       # Exports all DTOs
├── responses/
│   ├── assignment.response.ts         # AssignmentResponse interface
│   ├── bonus-item.response.ts         # DeductBonusItemResponse & RollbackResponse
│   ├── eligible-promotions.response.ts # EligiblePromotion & EligiblePromotionsResponse
│   ├── player-promotion.response.ts   # PlayerPromotion & PlayerPromotionResponse
│   ├── promotion-ticket.response.ts   # PromotionTicket & CreatePromotionTicketResponse
│   └── index.ts                       # Exports all response interfaces
├── game-promotion-api-client.ts       # Main GamePromotionApiClient class
├── index.ts                           # Main entry point - exports everything
├── package.json                       # Package configuration
├── tsconfig.json                      # TypeScript configuration
├── README.md                          # Documentation with usage examples
├── STRUCTURE.md                       # This structure documentation
└── .gitignore                         # Git ignore rules
```

## Benefits of This Structure

### 🎯 **One Class Per File**

- Each interface/class is in its own file
- Easy to locate and modify specific components
- Better code organization and maintainability

### 📁 **Logical Grouping**

- **`dtos/`** - All Data Transfer Objects for API requests
- **`responses/`** - All response interfaces from the API
- **`config/`** - Configuration interfaces

### 🔄 **Easy Imports**

- Import specific interfaces: `import { PlayerDto } from './dtos/player.dto'`
- Import all DTOs: `import { PlayerDto, AssignPromotionDto } from './dtos'`
- Import everything: `import { GamePromotionApiClient, PlayerDto } from './index'`

### 🛠️ **Maintainability**

- Changes to one interface don't affect others
- Easy to add new DTOs or responses
- Clear separation of concerns

## Usage Examples

### Import Specific Components

```typescript
import { GamePromotionApiClient } from './game-promotion-api-client';
import { PlayerDto } from './dtos/player.dto';
import { ApiClientConfig } from './config/api-client.config';
```

### Import from Index Files

```typescript
import { PlayerDto, AssignPromotionDto } from './dtos';
import { PlayerPromotionResponse, EligiblePromotionsResponse } from './responses';
```

### Import Everything from Main Index

```typescript
import {
  GamePromotionApiClient,
  PlayerDto,
  PlayerPromotionResponse,
  ApiClientConfig,
} from './index';
```

## File Naming Conventions

- **DTOs**: `*.dto.ts` - Data Transfer Objects for API requests
- **Responses**: `*.response.ts` - Response interfaces from the API
- **Config**: `*.config.ts` - Configuration interfaces
- **Main Class**: `game-promotion-api-client.ts` - The main client class
- **Index Files**: `index.ts` - Re-export files for easy importing

## Adding New Components

### Adding a New DTO

1. Create `dtos/new-feature.dto.ts`
2. Add export to `dtos/index.ts`
3. Import in `game-promotion-api-client.ts` if needed

### Adding a New Response

1. Create `responses/new-feature.response.ts`
2. Add export to `responses/index.ts`
3. Use in client methods as needed

### Adding a New Method

1. Add method to `game-promotion-api-client.ts`
2. Import required DTOs and responses
3. Update documentation

This structure makes the codebase scalable, maintainable, and easy to navigate for developers.
