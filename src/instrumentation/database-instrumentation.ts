import {NodeSDK} from '@opentelemetry/sdk-node';
import {getNodeAutoInstrumentations} from '@opentelemetry/auto-instrumentations-node';
import {PgInstrumentation} from '@opentelemetry/instrumentation-pg';
import {PrismaInstrumentation} from '@prisma/instrumentation';
import {ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION, SemanticResourceAttributes} from '@opentelemetry/semantic-conventions';
import {resourceFromAttributes} from '@opentelemetry/resources';
import {
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME
} from "@opentelemetry/semantic-conventions/build/esnext/experimental_attributes";

// Enhanced database instrumentation configuration
export function setupDatabaseInstrumentation() {
  return new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'heroes-vs-enemies',
      [ATTR_SERVICE_VERSION]: '1.0.0',
      [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: process.env.NODE_ENV || 'development',
    }),
    instrumentations: [
      // Auto-instrumentations for common libraries
      getNodeAutoInstrumentations({
        // Disable file system instrumentation to reduce noise
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
      }),
      // Enhanced PostgreSQL client instrumentation
      new PgInstrumentation({
        // Enhance span names with query information
        enhancedDatabaseReporting: true,
        // Include query parameters in spans (be careful with sensitive data)
        addSqlCommenterCommentToQueries: true,
        // Hook to customize spans
        requestHook: (span, requestInfo) => {
          span.setAttributes({
            'db.operation.name': requestInfo.query?.text?.split(' ')[0]?.toUpperCase() || 'UNKNOWN',
            'db.connection_pool.name': process.env.SCENARIO_NAME || 'default',
          });
        },
      }),
      // Prisma ORM instrumentation
      new PrismaInstrumentation({
        // Enable middleware tracing
        middleware: true,
      }),
    ],
  });
}

// Manual span creation helpers for custom database operations
export function createDatabaseSpan(operationName: string, attributes: Record<string, any> = {}) {
  const {trace} = require('@opentelemetry/api');
  const tracer = trace.getTracer('database-operations');

  return tracer.startSpan(operationName, {
    attributes: {
      'db.system': 'postgresql',
      'db.name': 'heroes_vs_enemies',
      ...attributes,
    },
  });
}