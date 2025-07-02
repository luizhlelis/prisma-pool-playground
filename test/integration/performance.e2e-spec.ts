import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { EnemyType } from '../../src/models/enemy.entity';

describe('Performance Testing (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    
    await app.init();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await prismaService.enemy.deleteMany();
    await prismaService.hero.deleteMany();
  });

  afterAll(async () => {
    await prismaService.enemy.deleteMany();
    await prismaService.hero.deleteMany();
    await prismaService.$disconnect();
    await app.close();
  });

  describe('Combat Endpoint Performance', () => {
    it('should handle single kill request within performance threshold', async () => {
      // Setup
      const [hero, enemy] = await Promise.all([
        prismaService.hero.create({
          data: {
            id: 'perf-single-hero',
            name: 'Performance Hero',
            level: 1,
            experience: 0,
            enemiesKilledAmount: 0,
          },
        }),
        prismaService.enemy.create({
          data: {
            id: 'perf-single-enemy',
            name: 'Performance Enemy',
            level: 3,
            experience: 100,
            enemyType: EnemyType.GOBLIN,
            killedByHeroId: null,
          },
        }),
      ]);

      // Act & Measure
      const startTime = process.hrtime.bigint();
      
      const response = await request(app.getHttpServer())
        .put(`/combat/heroes/${hero.id}/kill/${EnemyType.GOBLIN}/${enemy.id}`)
        .expect(200);

      const endTime = process.hrtime.bigint();
      const responseTimeMs = Number(endTime - startTime) / 1_000_000;

      // Assert
      expect(response.body.actionId).toBe(enemy.id);
      expect(responseTimeMs).toBeLessThan(1000); // Should complete within 1 second
      
      console.log(`Single kill response time: ${responseTimeMs.toFixed(2)}ms`);
    });

    it('should handle multiple sequential kills efficiently', async () => {
      // Setup
      const hero = await prismaService.hero.create({
        data: {
          id: 'perf-sequential-hero',
          name: 'Sequential Performance Hero',
          level: 1,
          experience: 0,
          enemiesKilledAmount: 0,
        },
      });

      const enemyCount = 50;
      const enemies = await Promise.all(
        Array.from({ length: enemyCount }, (_, i) =>
          prismaService.enemy.create({
            data: {
              id: `perf-seq-enemy-${i}`,
              name: `Sequential Enemy ${i}`,
              level: 2,
              experience: 50,
              enemyType: EnemyType.GOBLIN,
              killedByHeroId: null,
            },
          })
        )
      );

      // Act & Measure
      const startTime = process.hrtime.bigint();
      
      for (const enemy of enemies) {
        await request(app.getHttpServer())
          .put(`/combat/heroes/${hero.id}/kill/${EnemyType.GOBLIN}/${enemy.id}`)
          .expect(200);
      }

      const endTime = process.hrtime.bigint();
      const totalTimeMs = Number(endTime - startTime) / 1_000_000;
      const averageTimeMs = totalTimeMs / enemyCount;

      // Assert
      expect(totalTimeMs).toBeLessThan(30000); // Should complete within 30 seconds
      expect(averageTimeMs).toBeLessThan(600); // Average should be under 600ms per request
      
      console.log(`Sequential kills (${enemyCount}): ${totalTimeMs.toFixed(2)}ms total, ${averageTimeMs.toFixed(2)}ms average`);

      // Verify final state
      const finalHero = await prismaService.hero.findUnique({
        where: { id: hero.id },
      });
      expect(finalHero.enemiesKilledAmount).toBe(enemyCount);
    });

    it('should handle concurrent kills with good throughput', async () => {
      // Setup
      const heroCount = 20;
      const enemyCount = 20;

      const heroes = await Promise.all(
        Array.from({ length: heroCount }, (_, i) =>
          prismaService.hero.create({
            data: {
              id: `perf-concurrent-hero-${i}`,
              name: `Concurrent Hero ${i}`,
              level: 1,
              experience: 0,
              enemiesKilledAmount: 0,
            },
          })
        )
      );

      const enemies = await Promise.all(
        Array.from({ length: enemyCount }, (_, i) =>
          prismaService.enemy.create({
            data: {
              id: `perf-concurrent-enemy-${i}`,
              name: `Concurrent Enemy ${i}`,
              level: 3,
              experience: 75,
              enemyType: EnemyType.ORC,
              killedByHeroId: null,
            },
          })
        )
      );

      // Act & Measure
      const startTime = process.hrtime.bigint();
      
      // Each hero tries to kill each enemy (first come, first served)
      const requests = [];
      for (let i = 0; i < heroCount; i++) {
        for (let j = 0; j < enemyCount; j++) {
          requests.push(
            request(app.getHttpServer())
              .put(`/combat/heroes/${heroes[i].id}/kill/${EnemyType.ORC}/${enemies[j].id}`)
          );
        }
      }

      const responses = await Promise.allSettled(requests);
      
      const endTime = process.hrtime.bigint();
      const totalTimeMs = Number(endTime - startTime) / 1_000_000;
      
      // Count successful vs failed requests
      const successfulRequests = responses.filter(
        r => r.status === 'fulfilled' && (r.value as any).status === 200
      ).length;
      
      const failedRequests = responses.length - successfulRequests;

      // Assert
      expect(successfulRequests).toBe(enemyCount); // Each enemy killed once
      expect(failedRequests).toBe(heroCount * enemyCount - enemyCount); // Remaining requests failed
      expect(totalTimeMs).toBeLessThan(15000); // Should complete within 15 seconds
      
      const throughput = successfulRequests / (totalTimeMs / 1000);
      expect(throughput).toBeGreaterThan(1); // At least 1 successful kill per second
      
      console.log(`Concurrent kills: ${totalTimeMs.toFixed(2)}ms total, ${successfulRequests} successful, ${throughput.toFixed(2)} kills/sec`);
    });

    it('should maintain performance with level-up scenarios', async () => {
      // Setup: Hero close to multiple level ups
      const hero = await prismaService.hero.create({
        data: {
          id: 'perf-levelup-hero',
          name: 'Level Up Hero',
          level: 1,
          experience: 90, // Close to first level up
          enemiesKilledAmount: 0,
        },
      });

      // Create enemies that will cause multiple level ups
      const enemies = await Promise.all([
        prismaService.enemy.create({
          data: {
            id: 'perf-levelup-enemy-1',
            name: 'Level Up Enemy 1',
            level: 5, // 50 exp - will cause level up
            experience: 200,
            enemyType: EnemyType.DRAGON,
            killedByHeroId: null,
          },
        }),
        prismaService.enemy.create({
          data: {
            id: 'perf-levelup-enemy-2',
            name: 'Level Up Enemy 2',
            level: 10, // 100 exp - will cause another level up
            experience: 500,
            enemyType: EnemyType.DRAGON,
            killedByHeroId: null,
          },
        }),
        prismaService.enemy.create({
          data: {
            id: 'perf-levelup-enemy-3',
            name: 'Level Up Enemy 3',
            level: 15, // 150 exp - will cause multiple level ups
            experience: 750,
            enemyType: EnemyType.DRAGON,
            killedByHeroId: null,
          },
        }),
      ]);

      // Act & Measure
      const responseTimes = [];
      
      for (const enemy of enemies) {
        const startTime = process.hrtime.bigint();
        
        await request(app.getHttpServer())
          .put(`/combat/heroes/${hero.id}/kill/${EnemyType.DRAGON}/${enemy.id}`)
          .expect(200);
          
        const endTime = process.hrtime.bigint();
        const responseTimeMs = Number(endTime - startTime) / 1_000_000;
        responseTimes.push(responseTimeMs);
      }

      // Assert
      const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      
      expect(averageResponseTime).toBeLessThan(1000); // Average under 1 second
      expect(maxResponseTime).toBeLessThan(2000); // Max under 2 seconds
      
      console.log(`Level-up kills: ${responseTimes.map(t => t.toFixed(2)).join(', ')}ms, avg: ${averageResponseTime.toFixed(2)}ms`);

      // Verify level progression
      const finalHero = await prismaService.hero.findUnique({
        where: { id: hero.id },
      });
      expect(finalHero.level).toBeGreaterThan(1);
      expect(finalHero.enemiesKilledAmount).toBe(3);
    });

    it('should handle database stress testing', async () => {
      // Setup: Large dataset
      const heroCount = 10;
      const enemyCount = 100;

      console.log(`Creating ${heroCount} heroes and ${enemyCount} enemies...`);
      
      const createStartTime = process.hrtime.bigint();
      
      const heroes = await Promise.all(
        Array.from({ length: heroCount }, (_, i) =>
          prismaService.hero.create({
            data: {
              id: `stress-hero-${i}`,
              name: `Stress Hero ${i}`,
              level: Math.floor(Math.random() * 5) + 1,
              experience: Math.floor(Math.random() * 100),
              enemiesKilledAmount: 0,
            },
          })
        )
      );

      const enemies = await Promise.all(
        Array.from({ length: enemyCount }, (_, i) =>
          prismaService.enemy.create({
            data: {
              id: `stress-enemy-${i}`,
              name: `Stress Enemy ${i}`,
              level: Math.floor(Math.random() * 10) + 1,
              experience: Math.floor(Math.random() * 500),
              enemyType: Object.values(EnemyType)[Math.floor(Math.random() * 4)],
              killedByHeroId: null,
            },
          })
        )
      );

      const createEndTime = process.hrtime.bigint();
      const createTimeMs = Number(createEndTime - createStartTime) / 1_000_000;
      
      console.log(`Data creation took: ${createTimeMs.toFixed(2)}ms`);

      // Act: Stress test with many concurrent requests
      const stressStartTime = process.hrtime.bigint();
      
      const randomRequests = Array.from({ length: 200 }, () => {
        const randomHero = heroes[Math.floor(Math.random() * heroCount)];
        const randomEnemy = enemies[Math.floor(Math.random() * enemyCount)];
        
        return request(app.getHttpServer())
          .put(`/combat/heroes/${randomHero.id}/kill/${randomEnemy.enemyType}/${randomEnemy.id}`);
      });

      const responses = await Promise.allSettled(randomRequests);
      
      const stressEndTime = process.hrtime.bigint();
      const stressTimeMs = Number(stressEndTime - stressStartTime) / 1_000_000;

      // Assert
      const successfulResponses = responses.filter(
        r => r.status === 'fulfilled' && (r.value as any).status === 200
      ).length;

      expect(stressTimeMs).toBeLessThan(30000); // Should complete within 30 seconds
      expect(successfulResponses).toBeGreaterThan(enemyCount * 0.8); // At least 80% of enemies should be killable
      
      const throughput = successfulResponses / (stressTimeMs / 1000);
      
      console.log(`Stress test: ${stressTimeMs.toFixed(2)}ms, ${successfulResponses}/${responses.length} successful, ${throughput.toFixed(2)} ops/sec`);
    });
  });

  describe('Database Connection Pool Performance', () => {
    it('should efficiently manage database connections under load', async () => {
      // Setup
      const connectionTestCount = 50;
      
      const heroes = await Promise.all(
        Array.from({ length: connectionTestCount }, (_, i) =>
          prismaService.hero.create({
            data: {
              id: `conn-hero-${i}`,
              name: `Connection Hero ${i}`,
              level: 1,
              experience: 0,
              enemiesKilledAmount: 0,
            },
          })
        )
      );

      const enemies = await Promise.all(
        Array.from({ length: connectionTestCount }, (_, i) =>
          prismaService.enemy.create({
            data: {
              id: `conn-enemy-${i}`,
              name: `Connection Enemy ${i}`,
              level: 2,
              experience: 50,
              enemyType: EnemyType.GOBLIN,
              killedByHeroId: null,
            },
          })
        )
      );

      // Act: Fire many requests simultaneously to test connection pooling
      const startTime = process.hrtime.bigint();
      
      const connectionRequests = heroes.map((hero, index) =>
        request(app.getHttpServer())
          .put(`/combat/heroes/${hero.id}/kill/${EnemyType.GOBLIN}/${enemies[index].id}`)
      );

      const responses = await Promise.all(connectionRequests);
      
      const endTime = process.hrtime.bigint();
      const totalTimeMs = Number(endTime - startTime) / 1_000_000;

      // Assert
      const successfulResponses = responses.filter(r => r.status === 200).length;
      
      expect(successfulResponses).toBe(connectionTestCount);
      expect(totalTimeMs).toBeLessThan(20000); // Should handle connection pooling efficiently
      
      const avgResponseTime = totalTimeMs / connectionTestCount;
      expect(avgResponseTime).toBeLessThan(400); // Average response should be reasonable
      
      console.log(`Connection pool test: ${totalTimeMs.toFixed(2)}ms total, ${avgResponseTime.toFixed(2)}ms average`);
    });
  });

  describe('Memory Usage Performance', () => {
    it('should handle large transaction batches efficiently', async () => {
      // Setup: Large batch to test memory usage
      const batchSize = 100;
      
      const hero = await prismaService.hero.create({
        data: {
          id: 'memory-test-hero',
          name: 'Memory Test Hero',
          level: 1,
          experience: 0,
          enemiesKilledAmount: 0,
        },
      });

      // Create enemies in batches to test memory efficiency
      const enemies = [];
      for (let batch = 0; batch < 5; batch++) {
        const batchEnemies = await Promise.all(
          Array.from({ length: batchSize / 5 }, (_, i) =>
            prismaService.enemy.create({
              data: {
                id: `memory-enemy-${batch}-${i}`,
                name: `Memory Enemy ${batch}-${i}`,
                level: 1,
                experience: 10,
                enemyType: EnemyType.GOBLIN,
                killedByHeroId: null,
              },
            })
          )
        );
        enemies.push(...batchEnemies);
        
        // Small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Act: Process kills in batches
      const startTime = process.hrtime.bigint();
      const batchStartMemory = process.memoryUsage().heapUsed;
      
      const batchResponses = [];
      for (let i = 0; i < enemies.length; i += 10) {
        const batchRequests = enemies.slice(i, i + 10).map(enemy =>
          request(app.getHttpServer())
            .put(`/combat/heroes/${hero.id}/kill/${EnemyType.GOBLIN}/${enemy.id}`)
        );
        
        const responses = await Promise.all(batchRequests);
        batchResponses.push(...responses);
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      const endTime = process.hrtime.bigint();
      const batchEndMemory = process.memoryUsage().heapUsed;
      const totalTimeMs = Number(endTime - startTime) / 1_000_000;
      const memoryIncrease = (batchEndMemory - batchStartMemory) / 1024 / 1024; // MB

      // Assert
      const successfulBatchResponses = batchResponses.filter(r => r.status === 200).length;
      
      expect(successfulBatchResponses).toBe(batchSize);
      expect(totalTimeMs).toBeLessThan(60000); // Should complete within 1 minute
      expect(memoryIncrease).toBeLessThan(100); // Memory increase should be reasonable (< 100MB)
      
      console.log(`Memory test: ${totalTimeMs.toFixed(2)}ms, memory increase: ${memoryIncrease.toFixed(2)}MB`);
    });
  });
});