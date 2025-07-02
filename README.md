# Prisma Pool Playground

A NestJS application designed to experiment with **Prisma connection pooling** configurations using a **Rich Domain Model** architecture with **CQRS** pattern. The application implements a fantasy game logic where heroes can kill various types of enemies, gaining experience and leveling up.

## 📋 Table of Contents

- [Overview](#overview)
- [System Design](#system-design)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Prisma Pool Configuration](#prisma-pool-configuration)
- [Development Commands](#development-commands)
- [Testing](#testing)

## 🎯 Overview

This application serves as a playground for experimenting with **Prisma connection pooling strategies** and configurations. It implements a simple game domain where:

- **Heroes** can kill different types of **Enemies** (Dragons, Orcs, Goblins, Trolls)
- Heroes gain **experience** and **level up** based on enemy difficulty
- All interactions are tracked with **full relationship mapping**
- Business logic is encapsulated in **Rich Domain Models**

The primary goal is to test different Prisma pool configurations under various load scenarios to optimize database connection management.

## 🏗️ System Design

### Architecture Patterns

- **CQRS (Command Query Responsibility Segregation)**: Separates read and write operations
- **Rich Domain Models**: Business logic lives within domain entities
- **Repository Pattern**: Data access abstraction layer
- **Prisma ORM**: Type-safe database access with connection pooling

### Domain Models

```
┌─────────────────┐         ┌─────────────────┐
│      Hero       │    1:N  │     Enemy       │
├─────────────────┤ ◄────── ├─────────────────┤
│ + id            │         │ + id            │
│ + name          │         │ + name          │
│ + level         │         │ + level         │
│ + experience    │         │ + experience    │
│ + enemiesKilled │         │ + enemyType     │
│                 │         │ + killedByHeroId│
│ + killEnemy()   │         │                 │
│ + gainExp()     │         │ + getKilledBy() │
│ + levelUp()     │         │ + gainExp()     │
└─────────────────┘         └─────────────────┘
```

### CQRS Flow

```
API Request → Command → CommandHandler → Domain Models → Prisma → PostgreSQL
     ↓              ↓           ↓             ↓          ↓
Controller → KillEnemyCommand → KillEnemyHandler → Hero/Enemy → Database
```

## ✨ Features

- **Rich Domain Models** with business logic encapsulation
- **Type-safe database operations** with Prisma
- **CQRS pattern** implementation
- **Multiple enemy types** support (Dragon, Orc, Goblin, Troll)
- **Experience and leveling system**
- **Relationship tracking** between heroes and killed enemies
- **Connection pooling** experimentation setup
- **PostgreSQL database** with Docker support

## 📋 Prerequisites

- **Node.js** 18+ 
- **Docker & Docker Compose** (for PostgreSQL)
- **npm** or **yarn**

## 🚀 Getting Started

### 1. Clone and Install

```bash
git clone <repository-url>
cd prisma-pool-playground
npm install
```

### 2. Environment Setup

The application uses a standard PostgreSQL connection. Update the `.env` file if needed:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/heroes_db?schema=public"
```

## 🗄️ Database Setup

### Start PostgreSQL with Docker

```bash
# Start PostgreSQL container
docker run --name postgres-pool-test \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=heroes_db \
  -p 5432:5432 \
  -d postgres:15

# Or using Docker Compose (if you have a docker-compose.yml)
docker-compose up -d postgres
```

### Run Database Migrations

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Optional: Seed the database
npx prisma db seed
```

## 🏃‍♂️ Running the Application

```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run start:prod

# Debug mode
npm run start:debug
```

The application will be available at:
- **API**: http://localhost:3000
- **Swagger Documentation**: http://localhost:3000/api

## 🔌 API Endpoints

### Kill Enemy

```bash
# Kill a Dragon
POST /dragon/kill
Body: {
  "heroId": "hero-uuid",
  "dragonId": "enemy-uuid"
}

# Response
{
  "actionId": "enemy-uuid"
}
```

### Example with cURL

```bash
curl -X POST http://localhost:3000/dragon/kill \
  -H "Content-Type: application/json" \
  -d '{
    "heroId": "123e4567-e89b-12d3-a456-426614174000",
    "dragonId": "987fcdeb-51f2-4567-890a-123456789abc"
  }'
```

## 🔧 Prisma Pool Configuration

### Current Configuration

The application is configured for experimenting with different connection pool settings:

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Pool Configuration Options

You can experiment with these connection string parameters:

```env
# Basic connection
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/heroes_db"

# With connection pooling parameters
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/heroes_db?connection_limit=20&pool_timeout=20"

# With PgBouncer
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/heroes_db?pgbouncer=true"

# With connection timeout settings
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/heroes_db?connect_timeout=10&pool_timeout=20"
```

### Prisma Client Pool Settings

```typescript
// In prisma.service.ts, you can configure:
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pool settings
})
```

## 🛠️ Development Commands

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Database operations
npx prisma migrate dev          # Run migrations
npx prisma migrate reset        # Reset database
npx prisma studio              # Open Prisma Studio

# Code quality
npm run lint                   # Run ESLint
npm run format                 # Format with Prettier
npm run typecheck             # TypeScript type checking

# Development
npm run start:dev             # Start with hot reload
npm run build                 # Build for production
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# End-to-end tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

## 🚀 Load Testing & Performance Analysis

This project includes a comprehensive load testing setup with multiple Prisma connection pool scenarios and full observability stack.

### 🏗️ Infrastructure Setup

The application includes a complete Docker Compose setup with:

- **8 Different Pool Scenarios** (A-H)
- **PostgreSQL Database** with monitoring
- **PgBouncer Connection Pooling** (Transaction, Session, Statement modes)
- **OpenTelemetry Instrumentation** for distributed tracing
- **Grafana Observability Stack** (Grafana + Prometheus + Tempo + Loki)
- **K6 Load Testing** with realistic traffic patterns

### 📊 Connection Pool Scenarios

| Scenario | Pool Type | Connection Limit | Pool Timeout | Description |
|----------|-----------|------------------|--------------|-------------|
| **A** | Direct | 10 | 5s | Default configuration |
| **B** | Direct | 20 | 10s | High connection pool |
| **C** | Direct | 5 | 2s | Low connection pool |
| **D** | Direct | 15 | 5s | Dynamic configuration |
| **E** | Direct | 1 | 1s | Single connection stress test |
| **F** | PgBouncer | 10 | 5s | Transaction-level pooling |
| **G** | PgBouncer | 10 | 5s | Session-level pooling |
| **H** | PgBouncer | 10 | 5s | Statement-level pooling |

### 🔧 Quick Start

1. **Start Complete Infrastructure**:
```bash
# Start all services (PostgreSQL, apps, monitoring, PgBouncer)
docker compose up -d

# Wait for all services to be healthy
docker compose ps
```

2. **Access Monitoring Dashboard**:
```bash
# Grafana UI
open http://localhost:3000
# Login: admin/admin
# Navigate to: Dashboards → Prisma Connection Pool Monitoring
```

### 🧪 Running Load Tests

#### Important: Reset Database Before Testing

The load tests simulate combat actions where heroes kill enemies. Once all enemies are killed, combat metrics will show as zero. Reset the database before each test run:

```bash
# Reset all enemies to unkilled state
docker compose exec postgres psql -U prisma_user -d heroes_vs_enemies \
  -c "UPDATE \"Enemy\" SET \"killedByHeroId\" = NULL;"

# Verify enemies are available
docker compose exec postgres psql -U prisma_user -d heroes_vs_enemies \
  -c "SELECT COUNT(*) FROM \"Enemy\" WHERE \"killedByHeroId\" IS NULL;"
```

#### Running Load Tests

```bash
# Standard load test (3 minutes with gradual ramp-up)
docker run --rm --network prisma-pool-playground_pool_test_network \
  -v "$(pwd)/scripts:/scripts" grafana/k6:latest \
  run /scripts/load-test.js \
  --env TARGET_URL=http://app-scenario-a:3000 \
  --env SCENARIO_NAME=A-Default

# Quick test (30 seconds, 10 VUs)
docker run --rm --network prisma-pool-playground_pool_test_network \
  -v "$(pwd)/scripts:/scripts" grafana/k6:latest \
  run /scripts/load-test.js \
  --duration 30s --vus 10 \
  --env TARGET_URL=http://app-scenario-b:3000 \
  --env SCENARIO_NAME=B-High-Pool

# Custom test parameters
docker run --rm --network prisma-pool-playground_pool_test_network \
  -v "$(pwd)/scripts:/scripts" grafana/k6:latest \
  run /scripts/load-test.js \
  --duration 1m --vus 20 \
  --env TARGET_URL=http://app-scenario-c:3000 \
  --env SCENARIO_NAME=C-Low-Pool
```

#### Test All Scenarios Script

```bash
# Reset database and run all scenarios
docker compose exec postgres psql -U prisma_user -d heroes_vs_enemies \
  -c "UPDATE \"Enemy\" SET \"killedByHeroId\" = NULL;"

for scenario in a b c d; do
  echo "Testing Scenario ${scenario^^}..."
  docker run --rm --network prisma-pool-playground_pool_test_network \
    -v "$(pwd)/scripts:/scripts" grafana/k6:latest \
    run /scripts/load-test.js \
    --duration 1m --vus 15 \
    --env TARGET_URL=http://app-scenario-${scenario}:3000 \
    --env SCENARIO_NAME=${scenario^^}-Pool-Test
  
  # Reset enemies for next test
  docker compose exec postgres psql -U prisma_user -d heroes_vs_enemies \
    -c "UPDATE \"Enemy\" SET \"killedByHeroId\" = NULL;" >/dev/null
done
```

### 📈 Test Results Analysis

#### Recent Test Results

| Scenario | Requests/sec | Avg Response | P95 Response | Error Rate | Pool Errors |
|----------|--------------|--------------|--------------|------------|-------------|
| **A-Default** | 47.15 | 4.12ms | 8.45ms | 0% | 0 |
| **B-High-Pool** | 49.11 | 3.75ms | 7.28ms | 0% | 0 |
| **C-Low-Pool** | 49.99 | 3.05ms | 5.83ms | 0% | 0 |
| **D-Dynamic** | 49.19 | 3.03ms | 5.70ms | 0% | 0 |

**Key Insights:**
- All scenarios passed thresholds (P95 < 2000ms, Error Rate < 30%)
- Low pool configuration (C) showed excellent performance under moderate load
- No connection pool exhaustion detected in any scenario
- Consistent throughput across different pool sizes

### 🔍 Monitoring & Observability

#### Grafana Dashboards

**Access Grafana**: http://localhost:3000 (admin/admin)

1. **Prisma Connection Pool Monitoring**:
   - Connection pool status (active/idle connections)
   - Response time trends (P50, P95)
   - Database query duration by operation
   - Combat action rates and success metrics
   - Pool exhaustion alerts
   - Scenario comparison table

#### Data Sources

2. **Prometheus Metrics** (http://localhost:9090):
   ```promql
   # Active database connections
   prisma_pool_db_connections_active
   
   # HTTP request duration
   prisma_pool_http_request_duration_seconds
   
   # Connection wait time
   histogram_quantile(0.95, rate(db_connection_wait_time_bucket[5m]))
   ```

3. **Tempo Distributed Tracing** (http://localhost:3200):
   - End-to-end request traces
   - Database query performance
   - Service interaction maps
   - Search by service: `heroes-vs-enemies`

4. **Loki Logs** (http://localhost:3100):
   ```logql
   # Application logs
   {service_name="heroes-vs-enemies"}
   
   # Error logs only
   {service_name="heroes-vs-enemies"} |= "ERROR"
   
   # Pool-related logs
   {service_name="heroes-vs-enemies"} |~ "pool|connection"
   ```

### 🎯 Load Test Configuration

#### Test Profile

**Load Test** (`load-test.js`):
- Default Duration: 3 minutes (30s warmup → 25 VUs → 50 VUs → cooldown)
- Traffic Distribution:
  - 10% Health checks (`/`)
  - 20% Get heroes (`/heroes`)
  - 20% Get enemies (`/enemies`)
  - 50% Combat actions (`/combat/heroes/{id}/kill/{type}/{id}`)
- Configurable via K6 parameters: `--duration`, `--vus`

#### Custom Metrics Tracked

- `http_errors`: Total HTTP error count
- `connection_pool_errors`: Pool-specific errors
- `combat_actions`: Total combat operations
- `successful_combats`: Successful combat rate

### 🔧 Infrastructure Management

```bash
# View all container statuses
docker compose ps

# Check application logs
docker compose logs app-scenario-a

# Monitor resource usage
docker stats

# Restart monitoring stack
docker compose restart grafana prometheus tempo loki

# Database operations
docker compose exec postgres psql -U prisma_user -d heroes_vs_enemies

# Reset test data
docker compose exec postgres psql -U prisma_user -d heroes_vs_enemies \
  -c "UPDATE \"Enemy\" SET \"killedByHeroId\" = NULL;"

# Check enemy status
docker compose exec postgres psql -U prisma_user -d heroes_vs_enemies \
  -c "SELECT enemyType, COUNT(*) as total, COUNT(\"killedByHeroId\") as killed FROM \"Enemy\" GROUP BY enemyType;"

# Clean up everything
docker compose down -v
```

### 🎛️ Advanced Configuration

#### Custom Pool Settings

Edit scenarios in `docker-compose.yml`:

```yaml
environment:
  DATABASE_URL: "postgresql://user:pass@postgres:5432/db?connection_limit=25&pool_timeout=15"
```

#### PgBouncer Configuration

Configure pooling modes in `monitoring/pgbouncer/`:
- `transaction.ini`: Transaction-level pooling
- `session.ini`: Session-level pooling
- `statement.ini`: Statement-level pooling

## 🏷️ Tech Stack

- **NestJS v11** - Progressive Node.js framework
- **Prisma v6** - Next-generation ORM with connection pooling
- **PostgreSQL** - Relational database
- **TypeScript** - Type-safe JavaScript
- **CQRS** - Command Query Responsibility Segregation
- **Docker** - Containerization for development

## 📝 License

This project is [MIT licensed](LICENSE).