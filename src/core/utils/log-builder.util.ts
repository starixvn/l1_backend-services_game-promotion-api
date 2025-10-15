import { PLAYER_PROMOTION_ERROR_CODES } from '../../constants/error-codes';

/**
 * Generic log builder for constructing structured log objects
 * Supports fluent API for building logs with request and response sections
 */
export class LogBuilder {
  private log: {
    operatorId: string;
    logTimeStamp: string;
    action: string;
    request: Record<string, any>;
    response?: Record<string, any>;
  };

  /**
   * Creates a new log builder
   * @param operatorId - Operator identifier
   * @param action - Action name (e.g., "claim-bonus-win", "update-turnover")
   * @param request - Request data as key-value pairs
   */
  constructor(operatorId: string, action: string, request: Record<string, any>) {
    this.log = {
      operatorId,
      logTimeStamp: new Date().toISOString(),
      action,
      request,
    };
  }

  /**
   * Set response data for success cases
   * @param response - Response data as key-value pairs
   * @returns this for method chaining
   */
  withResponse(response: Record<string, any>): this {
    this.log.response = { ...this.log.response, ...response };
    return this;
  }

  /**
   * Set error response with automatic error details lookup
   * @param errorCode - Error code (e.g., "SB3024")
   * @param additionalData - Additional response data (optional)
   * @returns this for method chaining
   */
  withError(errorCode: string, additionalData?: Record<string, any>): this {
    const errorDetails = this.getErrorDetails(errorCode);

    this.log.response = {
      ...this.log.response,
      ...additionalData,
      errorCode,
      errorMessage: errorDetails.errorMessage,
      errorDescription: errorDetails.errorDescription,
    };

    return this;
  }

  /**
   * Build and return the final log object
   * @returns The constructed log object
   */
  build(): Record<string, any> {
    return this.log;
  }

  /**
   * Get error message and description from error code
   * @param errorCode - Error code
   * @returns Error message and description
   */
  private getErrorDetails(errorCode: string): {
    errorMessage: string;
    errorDescription: string;
  } {
    // Find the error definition by matching the code
    const errorDefinition = Object.values(PLAYER_PROMOTION_ERROR_CODES).find(
      error => error.code === errorCode,
    );

    return {
      errorMessage: (errorDefinition as any)?.message || 'Unknown Error',
      errorDescription: (errorDefinition as any)?.description || 'An unknown error occurred',
    };
  }
}
