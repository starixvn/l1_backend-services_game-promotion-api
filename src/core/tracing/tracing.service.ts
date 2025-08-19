import { Injectable } from '@nestjs/common';
import { trace, context, Span, SpanKind, SpanStatusCode } from '@opentelemetry/api';

type SpanAttributes = Record<string, string | number | boolean>;

/**
 * Optional utility service for creating custom spans when needed.
 * Most tracing should be handled automatically by OpenTelemetry instrumentations.
 * Use this service only when you need specific custom spans or attributes.
 */
@Injectable()
export class TracingService {
  private readonly tracer = trace.getTracer('game-promotion-api');

  /**
   * Execute a function within a span context
   * @param name Span name
   * @param fn Function to execute within the span
   * @param attributes Optional span attributes
   * @returns Promise resolving to the function result
   */
  async withSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T> | T,
    attributes?: SpanAttributes,
  ): Promise<T> {
    const span = this.tracer.startSpan(name, {
      kind: SpanKind.INTERNAL,
      attributes,
    });

    try {
      const result = await context.with(trace.setSpan(context.active(), span), () => fn(span));
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Add attributes to the current active span
   * @param attributes Key-value pairs to add as span attributes
   */
  addAttributes(attributes: SpanAttributes): void {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.setAttributes(attributes);
    }
  }

  /**
   * Add an event to the current active span
   * @param name Event name
   * @param attributes Optional event attributes
   */
  addEvent(name: string, attributes?: SpanAttributes): void {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.addEvent(name, attributes);
    }
  }

  /**
   * Record an exception in the current active span
   * @param error Error to record
   */
  recordException(error: Error): void {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.recordException(error);
      activeSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
    }
  }

  /**
   * Get the current trace ID for correlation
   * @returns Current trace ID or undefined if no active span
   */
  getCurrentTraceId(): string | undefined {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      return activeSpan.spanContext().traceId;
    }
    return undefined;
  }

  /**
   * Get the current span ID for correlation
   * @returns Current span ID or undefined if no active span
   */
  getCurrentSpanId(): string | undefined {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      return activeSpan.spanContext().spanId;
    }
    return undefined;
  }

  /**
   * Create a database operation span
   * @param operation Database operation name (e.g., 'find', 'update', 'insert')
   * @param collection Collection/table name
   * @param fn Function to execute within the span
   * @param query Optional query details
   * @returns Promise resolving to the function result
   */
  async withDatabaseSpan<T>(
    operation: string,
    collection: string,
    fn: (span: Span) => Promise<T> | T,
    query?: Record<string, any>,
  ): Promise<T> {
    const attributes: SpanAttributes = {
      'db.operation': operation,
      'db.collection.name': collection,
      'db.system': 'mongodb',
    };

    if (query) {
      attributes['db.statement'] = JSON.stringify(query);
    }

    return this.withSpan(`db.${operation} ${collection}`, fn, attributes);
  }

  /**
   * Create an HTTP client request span
   * @param method HTTP method
   * @param url Request URL
   * @param fn Function to execute within the span
   * @returns Promise resolving to the function result
   */
  async withHttpClientSpan<T>(
    method: string,
    url: string,
    fn: (span: Span) => Promise<T> | T,
  ): Promise<T> {
    const attributes: SpanAttributes = {
      'http.method': method,
      'http.url': url,
      'http.client': 'axios',
    };

    return this.withSpan(`HTTP ${method}`, fn, attributes);
  }
}
