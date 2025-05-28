// Export all DTOs
export * from './dtos';

// Export all responses
export * from './responses';

// Export configuration
export { ApiClientConfig } from './config/api-client.config';

// Export main client class
export { GamePromotionApiClient } from './game-promotion-api-client';

// Factory function for creating client instances
import { ApiClientConfig } from './config/api-client.config';
import { GamePromotionApiClient } from './game-promotion-api-client';

export function createGamePromotionApiClient(config: ApiClientConfig): GamePromotionApiClient {
  return new GamePromotionApiClient(config);
}

// Default export
export { GamePromotionApiClient as default } from './game-promotion-api-client';
