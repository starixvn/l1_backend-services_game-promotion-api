import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/nestjs';
import { LoggerService } from '../logger/logger.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly loggerService: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine status code and message
    let status: number;
    let message: string;
    let errorResponse: any;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = exception.message;
      errorResponse = exceptionResponse;

      // Only capture HTTP exceptions that are server errors (5xx) or specific client errors
      if (status >= 500 || this.shouldCaptureClientError(status)) {
        this.captureExceptionWithContext(exception, request, status);
      }
    } else {
      // For non-HTTP exceptions, always capture
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      errorResponse = {
        statusCode: status,
        message,
        timestamp: new Date().toISOString(),
        path: request.url,
      };

      this.captureExceptionWithContext(exception, request, status);
    }

    // Log the error
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : exception,
    );

    // Send response
    response.status(status).json(errorResponse);
  }

  /**
   * Capture exception with request context
   */
  private captureExceptionWithContext(
    exception: unknown,
    request: Request,
    statusCode: number,
  ): void {
    try {
      // Set request context
      Sentry.setContext('request', {
        method: request.method,
        url: request.url,
        headers: this.sanitizeHeaders(request.headers),
        query: request.query,
        body: this.sanitizeBody(request.body),
        ip: request.ip,
        userAgent: request.get('User-Agent'),
      });

      // Set additional tags
      Sentry.setTags({
        method: request.method,
        statusCode: statusCode.toString(),
        endpoint: request.route?.path || request.url,
      });

      // Add breadcrumb
      this.loggerService.addBreadcrumb(
        `${request.method} ${request.url} - ${statusCode}`,
        'http',
        statusCode >= 500 ? 'error' : 'warning',
        {
          method: request.method,
          url: request.url,
          statusCode,
        },
      );

      // Capture the exception
      this.loggerService.captureException(exception, {
        statusCode,
        endpoint: request.url,
        method: request.method,
      });
    } catch (error) {
      this.logger.error('Failed to capture exception context in Sentry', error);
    }
  }

  /**
   * Determine if client errors should be captured
   */
  private shouldCaptureClientError(status: number): boolean {
    // Capture specific client errors that might indicate issues
    const captureStatuses = [
      HttpStatus.UNAUTHORIZED, // 401 - might indicate auth issues
      HttpStatus.FORBIDDEN, // 403 - might indicate permission issues
      HttpStatus.TOO_MANY_REQUESTS, // 429 - rate limiting issues
    ];

    return captureStatuses.includes(status);
  }

  /**
   * Sanitize headers to remove sensitive information
   */
  private sanitizeHeaders(headers: any): any {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    const sanitized = { ...headers };

    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Sanitize request body to remove sensitive information
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    const sanitized = { ...body };

    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      const result: any = Array.isArray(obj) ? [] : {};

      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          result[key] = sanitizeObject(value);
        } else {
          result[key] = value;
        }
      }

      return result;
    };

    return sanitizeObject(sanitized);
  }
}
