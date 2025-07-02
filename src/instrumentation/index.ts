import { setupDatabaseInstrumentation } from '@instrumentation/database-instrumentation';

// Initialize enhanced database instrumentation
const sdk = setupDatabaseInstrumentation();

// Start the SDK
sdk.start();

console.log('Enhanced database instrumentation initialized successfully');

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('OTEL SDK shut down successfully'))
    .catch((error) => console.log('Error terminating OTEL SDK', error))
    .finally(() => process.exit(0));
});

export { sdk };