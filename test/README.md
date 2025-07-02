# Test Organization

This directory contains all tests for the Prisma Pool Playground application, organized for clarity and maintainability.

## Directory Structure

```
test/
├── unit/                    # Unit tests (isolated, fast)
│   ├── hero.entity.spec.ts
│   ├── enemy.entity.spec.ts
│   ├── experience-calculation.spec.ts
│   ├── kill-enemy.handler.spec.ts
│   ├── combat.controller.spec.ts
│   └── app.controller.spec.ts
└── integration/             # Integration & E2E tests (with database)
    ├── combat.e2e-spec.ts
    ├── concurrent-combat.e2e-spec.ts
    └── performance.e2e-spec.ts
```

## Test Categories

### Unit Tests (`test/unit/`)
Fast, isolated tests that mock external dependencies:
- **Domain Models**: Hero and Enemy entity business logic
- **Experience Calculation**: Complex calculation scenarios and edge cases
- **Command Handlers**: CQRS command processing with mocked database
- **Controllers**: HTTP request/response handling with mocked services

### Integration Tests (`test/integration/`)
End-to-end tests that use real database connections:
- **API Workflow**: Full request-to-database testing
- **Concurrent Scenarios**: Race conditions and concurrent operations
- **Performance Testing**: Load testing and throughput measurement

## Running Tests

```bash
# Run all tests
npm test

# Run only unit tests (fast)
npm run test:unit

# Run only integration tests (slower, requires database)
npm run test:integration

# Run tests with coverage
npm run test:cov

# Run tests in watch mode
npm run test:watch
```

## Test Statistics

- **Total Tests**: 84 passing tests
- **Unit Tests**: ~81 tests (models, handlers, controllers)
- **Integration Tests**: ~3 test suites (API, concurrent, performance)
- **Coverage**: Domain logic, error handling, edge cases, performance scenarios

## Guidelines

### Unit Tests
- Mock all external dependencies (database, external services)
- Focus on business logic and individual component behavior
- Should run in under 5 seconds total
- No database connections required

### Integration Tests
- Use real database connections (test database)
- Test complete workflows from HTTP request to database persistence
- Include cleanup between tests
- May take 30+ seconds to complete

### Naming Conventions
- Use descriptive test names that explain the scenario
- Group related tests using `describe` blocks
- Use `it('should...')` format for individual test cases

### Test Data
- Create test data within each test for clarity
- Use meaningful IDs and names for better debugging
- Clean up after integration tests to avoid side effects