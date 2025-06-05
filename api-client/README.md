# Game Promotion API Client

A comprehensive Node.js/TypeScript API client for the Game Promotion API, supporting both `player-promotion` and `promotion-ticket` routes.

## Features

- 🚀 Full TypeScript support with complete type definitions
- 🔄 Support for all player promotion operations
- 🎫 Support for promotion ticket creation
- 🛡️ Built-in error handling and response validation
- 📝 Comprehensive JSDoc documentation
- ⚡ Axios-based HTTP client with interceptors
- 🔧 Configurable timeouts and headers

## Installation

```bash
npm install @sc/game-promotion-api-client
```

Or with yarn:

```bash
yarn add @sc/game-promotion-api-client
```

## Development Setup

If you're working with the source code:

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build
```

## Quick Start

```typescript
import {
  GamePromotionApiClient,
  createGamePromotionApiClient,
} from '@sc/game-promotion-api-client';

// Create client instance
const client = new GamePromotionApiClient({
  baseURL: 'http://localhost:5000',
  timeout: 30000,
  headers: {
    Authorization: 'Bearer your-token-here',
  },
});

// Example: Check eligible promotions for a player
const eligiblePromotions = await client.checkEligibility({
  operatorId: 'op123',
  siteName: 'site1',
  playerId: 'player123',
  currencyGroup: '60d21b4667d0d01ce67a7e3c',
});

console.log('Eligible promotions:', eligiblePromotions.promotions);
```

## API Reference

### Configuration

```typescript
interface ApiClientConfig {
  baseURL: string; // Base URL of the API
  timeout?: number; // Request timeout in milliseconds (default: 30000)
  headers?: Record<string, string>; // Additional headers
}
```

### Player Promotion Methods

#### `claimPromotion(playerDto: PlayerDto)`

Get existing or claim new promotion for a player.

```typescript
const result = await client.claimPromotion({
  operatorId: 'op123',
  siteName: 'site1',
  playerId: 'player123',
  currencyGroup: '60d21b4667d0d01ce67a7e3c',
});
```

#### `checkEligibility(playerDto: PlayerDto)`

Check which promotions are eligible for a player.

```typescript
const eligiblePromotions = await client.checkEligibility({
  operatorId: 'op123',
  siteName: 'site1',
  playerId: 'player123',
  currencyGroup: '60d21b4667d0d01ce67a7e3c',
});
```

#### `assignPromotion(assignDto: AssignPromotionDto)`

Assign a specific promotion to a player.

```typescript
const result = await client.assignPromotion({
  playerId: 'player123',
  promotionId: '60d21b4667d0d01ce67a7e3b',
  operatorId: 'op123',
  siteName: 'site1',
  currencyGroup: '60d21b4667d0d01ce67a7e3c',
});
```

#### `deductBonusItem(deductDto: DeductBonusItemDto)`

Deduct a bonus item from player promotion.

```typescript
const result = await client.deductBonusItem({
  operatorId: 'op123',
  playerId: 'player123',
  promotionId: '60d21b4667d0d01ce67a7e3b',
});
```

#### `rollbackBonusItem(rollbackDto: RollbackBonusItemDto)`

Rollback a bonus item deduction.

```typescript
const result = await client.rollbackBonusItem({
  operatorId: 'op123',
  playerId: 'player123',
  promotionId: '60d21b4667d0d01ce67a7e3b',
  previousRemainingItems: 5,
  previousLastUsedDate: '2023-12-01T10:00:00Z',
});
```

### Promotion Ticket Methods

#### `createPromotionTicket(createTicketDto: CreatePromotionTicketDto)`

Create a new promotion ticket for tracking.

```typescript
const result = await client.createPromotionTicket({
  playerId: 'player123',
  operatorId: 'op123',
  gameId: 1001,
  gameRoundId: 12345,
  appType: 1,
  betAmount: 10.5,
  winAmount: 25.0,
});
```

### Utility Methods

#### `testConnection()`

Test the API connection.

```typescript
const status = await client.testConnection();
console.log('API Status:', status);
```

#### `updateBaseURL(newBaseURL: string)`

Update the base URL for the client.

```typescript
client.updateBaseURL('https://api.newdomain.com');
```

#### `setHeaders(headers: Record<string, string>)`

Add or update headers.

```typescript
client.setHeaders({
  Authorization: 'Bearer new-token',
  'X-Custom-Header': 'custom-value',
});
```

## Type Definitions

### Core Types

```typescript
interface PlayerDto {
  operatorId: string;
  siteName: string;
  playerId: string;
  currencyGroup: string;
}

interface AssignPromotionDto {
  playerId: string;
  promotionId: string;
  operatorId: string;
  siteName: string;
  currencyGroup: string;
}

interface CreatePromotionTicketDto {
  playerId: string;
  operatorId: string;
  gameId: number;
  gameRoundId: number;
  appType: number;
  betAmount: number;
  winAmount: number;
}
```

### Response Types

```typescript
interface PlayerPromotionResponse {
  promotion: PlayerPromotion | null;
}

interface EligiblePromotionsResponse {
  promotions: EligiblePromotion[];
}

interface CreatePromotionTicketResponse {
  success: boolean;
  code: string;
  message: string;
  ticket?: PromotionTicket;
}
```

## Error Handling

The client includes built-in error handling with descriptive error messages:

```typescript
try {
  const result = await client.claimPromotion(playerData);
} catch (error) {
  if (error.message.includes('API Error')) {
    // Handle API errors (4xx, 5xx responses)
    console.error('API Error:', error.message);
  } else if (error.message.includes('Network Error')) {
    // Handle network errors
    console.error('Network Error:', error.message);
  } else {
    // Handle other errors
    console.error('Request Error:', error.message);
  }
}
```

## Advanced Usage

### Custom Configuration

```typescript
import {
  GamePromotionApiClient,
  createGamePromotionApiClient,
} from '@sc/game-promotion-api-client';

// Using the factory function
const client = createGamePromotionApiClient({
  baseURL: process.env.API_BASE_URL || 'http://localhost:5000',
  timeout: 60000, // 60 seconds
  headers: {
    Authorization: `Bearer ${process.env.API_TOKEN}`,
    'X-Client-Version': '1.0.0',
  },
});

// Or using the class directly
const client2 = new GamePromotionApiClient({
  baseURL: 'https://api.production.com',
  timeout: 30000,
});
```

### Environment-based Configuration

```typescript
const config = {
  baseURL:
    process.env.NODE_ENV === 'production' ? 'https://api.production.com' : 'http://localhost:5000',
  timeout: parseInt(process.env.API_TIMEOUT || '30000'),
  headers: {
    Authorization: `Bearer ${process.env.API_TOKEN}`,
    'X-Environment': process.env.NODE_ENV || 'development',
  },
};

const client = new GamePromotionApiClient(config);
```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## License

Pentagon

## Support

For issues and questions, please contact the development team or create an issue in the repository.

## Changelog

### v1.0.0

- Initial release
- Support for all player promotion endpoints
- Support for promotion ticket creation
- Full TypeScript support
- Comprehensive error handling
