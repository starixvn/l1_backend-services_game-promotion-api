import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';

@Injectable()
export class LoggerService {
  private readonly logger = new Logger(LoggerService.name);

  /**
   * Capture an exception and send it to Sentry
   * @param exception - The exception to capture
   * @param context - Additional context information
   * @param user - User information (optional)
   */
  captureException(
    exception: any,
    context?: Record<string, any>,
    user?: { id?: string; email?: string; username?: string },
  ): string {
    try {
      // Set user context if provided
      if (user) {
        Sentry.setUser(user);
      }

      // Set additional context if provided
      if (context) {
        Sentry.setContext('additional_info', context);
      }

      // Capture the exception
      const eventId = Sentry.captureException(exception);

      this.logger.error(`Exception captured by Sentry: ${eventId}`, exception?.stack);

      return eventId;
    } catch (error) {
      this.logger.error('Failed to capture exception in Sentry', error);
      return '';
    }
  }

  /**
   * Capture a message and send it to Sentry
   * @param message - The message to capture
   * @param level - Severity level
   * @param context - Additional context information
   */
  captureMessage(
    message: string,
    level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
    context?: Record<string, any>,
  ): string {
    try {
      // Set additional context if provided
      if (context) {
        Sentry.setContext('message_context', context);
      }

      const eventId = Sentry.captureMessage(message, level);

      this.logger.log(`Message captured by Sentry: ${eventId} - ${message}`);

      return eventId;
    } catch (error) {
      this.logger.error('Failed to capture message in Sentry', error);
      return '';
    }
  }

  /**
   * Log error message and send to Sentry
   * @param message - Error message
   * @param trace - Stack trace (optional)
   * @param context - Additional context
   */
  error(message: string, trace?: string, context?: Record<string, any>): void {
    // Log locally
    this.logger.error(message, trace);

    // Send to Sentry
    try {
      if (context) {
        Sentry.setContext('error_context', context);
      }

      if (trace) {
        // Create an error object with the stack trace
        const error = new Error(message);
        error.stack = trace;
        Sentry.captureException(error);
      } else {
        Sentry.captureMessage(message, 'error');
      }
    } catch (error) {
      this.logger.error('Failed to send error to Sentry', error);
    }
  }

  /**
   * Log warning message and send to Sentry
   * @param message - Warning message
   * @param context - Additional context
   */
  warn(message: string, context?: Record<string, any>): void {
    // Log locally
    this.logger.warn(message);

    // Send to Sentry
    try {
      if (context) {
        Sentry.setContext('warning_context', context);
      }
      Sentry.captureMessage(message, 'warning');
    } catch (error) {
      this.logger.error('Failed to send warning to Sentry', error);
    }
  }

  /**
   * Log info message and optionally send to Sentry
   * @param message - Info message
   * @param sendToSentry - Whether to send to Sentry (default: false for info)
   * @param context - Additional context
   */
  log(message: string, sendToSentry: boolean = false, context?: Record<string, any>): void {
    // Log locally
    this.logger.log(message);

    // Optionally send to Sentry
    if (sendToSentry) {
      try {
        if (context) {
          Sentry.setContext('info_context', context);
        }
        Sentry.captureMessage(message, 'info');
      } catch (error) {
        this.logger.error('Failed to send info to Sentry', error);
      }
    }
  }

  /**
   * Log debug message and optionally send to Sentry
   * @param message - Debug message
   * @param sendToSentry - Whether to send to Sentry (default: false for debug)
   * @param context - Additional context
   */
  debug(message: string, sendToSentry: boolean = false, context?: Record<string, any>): void {
    // Log locally
    this.logger.debug(message);

    // Optionally send to Sentry
    if (sendToSentry) {
      try {
        if (context) {
          Sentry.setContext('debug_context', context);
        }
        Sentry.captureMessage(message, 'debug');
      } catch (error) {
        this.logger.error('Failed to send debug to Sentry', error);
      }
    }
  }

  /**
   * Log verbose message (local only by default)
   * @param message - Verbose message
   * @param sendToSentry - Whether to send to Sentry (default: false)
   * @param context - Additional context
   */
  verbose(message: string, sendToSentry: boolean = false, context?: Record<string, any>): void {
    // Log locally
    this.logger.verbose(message);

    // Optionally send to Sentry
    if (sendToSentry) {
      try {
        if (context) {
          Sentry.setContext('verbose_context', context);
        }
        Sentry.captureMessage(message, 'debug');
      } catch (error) {
        this.logger.error('Failed to send verbose to Sentry', error);
      }
    }
  }

  /**
   * Add breadcrumb for debugging
   * @param message - Breadcrumb message
   * @param category - Category of the breadcrumb
   * @param level - Severity level
   * @param data - Additional data
   */
  addBreadcrumb(
    message: string,
    category: string = 'custom',
    level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
    data?: Record<string, any>,
  ): void {
    try {
      Sentry.addBreadcrumb({
        message,
        category,
        level,
        data,
        timestamp: Date.now() / 1000,
      });
    } catch (error) {
      this.logger.error('Failed to add breadcrumb in Sentry', error);
    }
  }

  /**
   * Set user context for all subsequent events
   * @param user - User information
   */
  setUser(user: { id?: string; email?: string; username?: string }): void {
    try {
      Sentry.setUser(user);
    } catch (error) {
      this.logger.error('Failed to set user in Sentry', error);
    }
  }

  /**
   * Set tags for filtering in Sentry
   * @param tags - Key-value pairs of tags
   */
  setTags(tags: Record<string, string>): void {
    try {
      Sentry.setTags(tags);
    } catch (error) {
      this.logger.error('Failed to set tags in Sentry', error);
    }
  }

  /**
   * Set extra context information
   * @param key - Context key
   * @param context - Context data
   */
  setContext(key: string, context: Record<string, any>): void {
    try {
      Sentry.setContext(key, context);
    } catch (error) {
      this.logger.error('Failed to set context in Sentry', error);
    }
  }

  /**
   * Manually flush Sentry events (useful for serverless or short-lived processes)
   * @param timeout - Timeout in milliseconds
   */
  async flush(timeout: number = 2000): Promise<boolean> {
    try {
      return await Sentry.flush(timeout);
    } catch (error) {
      this.logger.error('Failed to flush Sentry events', error);
      return false;
    }
  }
}
