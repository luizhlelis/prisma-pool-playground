import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly tracer = trace.getTracer('prisma-service');

  constructor() {
    super({
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ],
    } as any);

    // Add OTEL middleware for enhanced tracing
    this.$use(async (params, next) => {
      const span = this.tracer.startSpan(`prisma:${params.model}.${params.action}`, {
        attributes: {
          'db.system': 'postgresql',
          'db.name': 'heroes_vs_enemies',
          'db.operation.name': params.action,
          'db.collection.name': params.model,
          'prisma.model': params.model,
          'prisma.action': params.action,
          'scenario.name': process.env.SCENARIO_NAME || 'unknown',
          'pool.type': process.env.SCENARIO_NAME?.includes('PgBouncer') ? 'pgbouncer' : 'direct',
        },
      });

      try {
        const result = await next(params);
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
    });

    // Note: Query logging is handled by OTEL instrumentation
  }

  async onModuleInit() {
    const span = this.tracer.startSpan('prisma:connect');
    try {
      await this.$connect();
      span.setAttributes({
        'prisma.connection.status': 'connected',
        'scenario.name': process.env.SCENARIO_NAME || 'unknown',
      });
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Connection failed',
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  async onModuleDestroy() {
    const span = this.tracer.startSpan('prisma:disconnect');
    try {
      await this.$disconnect();
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Disconnection failed',
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }
}