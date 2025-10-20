import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../logger/logger.service';
import { ActionLogService } from '../services/action-log.service';
import {
  IActionLog,
  IActionLogRequest,
  IActionLogResponse,
} from '../interfaces/action-log.interface';

/**
 * LogBuilder Utility
 * Provides a fluent API for building and sending structured logs to Sentry and MongoDB
 */
@Injectable()
export class LogBuilder {
  private operatorId: string;
  private action: string;
  private request: IActionLogRequest;
  private response?: IActionLogResponse;

  constructor(
    private readonly loggerService: LoggerService,
    private readonly actionLogService: ActionLogService,
  ) {}

  /**
   * Create a new LogBuilder instance for a specific operator and action
   * @param operatorId - The operator identifier
   * @param action - The action name (e.g., "claim-bonus-win")
   * @returns LogBuilder instance
   */
  static create(
    operatorId: string,
    action: string,
    loggerService: LoggerService,
    actionLogService: ActionLogService,
  ): LogBuilder {
    const builder = new LogBuilder(loggerService, actionLogService);
    builder.operatorId = operatorId;
    builder.action = action;
    return builder;
  }

  /**
   * Set the request data
   * @param request - Request parameters
   * @returns LogBuilder instance for chaining
   */
  withRequest(request: IActionLogRequest): this {
    this.request = request;
    return this;
  }

  /**
   * Set the response data (for success cases)
   * @param response - Response data
   * @returns LogBuilder instance for chaining
   */
  withResponse(response: IActionLogResponse): this {
    this.response = response;
    return this;
  }

  /**
   * Set error response data (for error cases)
   * @param errorCode - Error code
   * @param errorMessage - Error message
   * @param errorDescription - Detailed error description
   * @param additionalData - Additional response data
   * @returns LogBuilder instance for chaining
   */
  withError(
    errorCode: string,
    errorMessage: string,
    errorDescription?: string,
    additionalData?: Record<string, any>,
  ): this {
    this.response = {
      errorCode,
      errorMessage,
      ...(errorDescription && { errorDescription }),
      ...additionalData,
    };
    return this;
  }

  /**
   * Build the log object
   * @returns The structured log object
   */
  build(): IActionLog {
    if (!this.operatorId || !this.action || !this.request) {
      throw new Error('LogBuilder: operatorId, action, and request are required');
    }

    return {
      operatorId: this.operatorId,
      logTimeStamp: new Date().toISOString(),
      action: this.action,
      request: this.request,
      ...(this.response && { response: this.response }),
    };
  }

  /**
   * Send the log to Sentry only
   * @returns The log object
   */
  async sendToSentry(): Promise<IActionLog> {
    const log = this.build();

    try {
      const logMessage = this.formatLogMessage(log);
      const context = {
        operatorId: log.operatorId,
        action: log.action,
        request: log.request,
        response: log.response,
      };

      // Send to Sentry based on whether it's an error or not
      if (log.response?.errorCode) {
        this.loggerService.error(logMessage, undefined, context);
      } else {
        this.loggerService.log(logMessage, true, context);
      }
    } catch (error) {
      console.error('Failed to send log to Sentry:', error);
    }

    return log;
  }

  /**
   * Send the log to MongoDB only
   * @returns The log object
   */
  async sendToMongoDB(): Promise<IActionLog> {
    const log = this.build();

    try {
      await this.actionLogService.saveLog(log);
    } catch (error) {
      console.error('Failed to send log to MongoDB:', error);
    }

    return log;
  }

  /**
   * Send the log to both Sentry and MongoDB
   * @returns The log object
   */
  async send(): Promise<IActionLog> {
    const log = this.build();

    // Send to both Sentry and MongoDB in parallel
    await Promise.allSettled([this.sendToSentryInternal(log), this.sendToMongoDBInternal(log)]);

    return log;
  }

  /**
   * Internal method to send to Sentry
   */
  private async sendToSentryInternal(log: IActionLog): Promise<void> {
    try {
      const logMessage = this.formatLogMessage(log);
      const context = {
        operatorId: log.operatorId,
        action: log.action,
        request: log.request,
        response: log.response,
      };

      if (log.response?.errorCode) {
        this.loggerService.error(logMessage, undefined, context);
      } else {
        this.loggerService.log(logMessage, true, context);
      }
    } catch (error) {
      console.error('Failed to send log to Sentry:', error);
    }
  }

  /**
   * Internal method to send to MongoDB
   */
  private async sendToMongoDBInternal(log: IActionLog): Promise<void> {
    try {
      await this.actionLogService.saveLog(log);
    } catch (error) {
      console.error('Failed to send log to MongoDB:', error);
    }
  }

  /**
   * Format log message for Sentry
   */
  private formatLogMessage(log: IActionLog): string {
    const { action, request, response } = log;

    if (response?.errorCode) {
      return `[${action}] Failed for player ${request.playerId} - ${response.errorCode}: ${response.errorMessage}`;
    }

    return `[${action}] Success for player ${request.playerId}`;
  }
}
