import {Test, TestingModule} from '@nestjs/testing';
import {INestApplication, ValidationPipe} from '@nestjs/common';
import * as request from 'supertest';
import {AppModule} from '../../src/app.module';
import {PrismaService} from '../../src/prisma/prisma.service';
import {EnemyType} from '../../src/models/enemy.entity';

describe('Concurrent Combat Scenarios (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({transform: true}));

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

  describe('Concurrent Kill Attempts', () => {
    it('should handle two heroes trying to kill the same enemy', async () => {
      // Setup: Create two heroes and one enemy
      const [hero1, hero2, enemy] = await Promise.all([
        prismaService.hero.create({
          data: {
            id: 'concurrent-hero-1',
            name: 'Concurrent Hero 1',
            level: 1,
            experience: 0,
            enemiesKilledAmount: 0,
          },
        }),
        prismaService.hero.create({
          data: {
            id: 'concurrent-hero-2',
            name: 'Concurrent Hero 2',
            level: 1,
            experience: 0,
            enemiesKilledAmount: 0,
          },
        }),
        prismaService.enemy.create({
          data: {
            id: 'concurrent-enemy-1',
            name: 'Concurrent Enemy',
            level: 5,
            experience: 200,
            enemyType: EnemyType.DRAGON,
            killedByHeroId: null,
          },
        }),
      ]);

      // Act: Both heroes attempt to kill the same enemy simultaneously
      const requests = [
        request(app.getHttpServer())
          .put(`/combat/heroes/${hero1.id}/kill/${EnemyType.DRAGON}/${enemy.id}`),
        request(app.getHttpServer())
          .put(`/combat/heroes/${hero2.id}/kill/${EnemyType.DRAGON}/${enemy.id}`),
      ];

      const responses = await Promise.allSettled(requests);

      // Assert: One should succeed, one should fail
      const successfulResponses = responses.filter(
        r => r.status === 'fulfilled' && (r.value as any).status === 200
      );
      const failedResponses = responses.filter(
        r => r.status === 'fulfilled' && (r.value as any).status !== 200
      );

      expect(successfulResponses.length).toBe(1);
      expect(failedResponses.length).toBe(1);

      // Verify database state: enemy should be killed by exactly one hero
      const finalEnemy = await prismaService.enemy.findUnique({
        where: {id: enemy.id},
      });
      expect(finalEnemy.killedByHeroId).toBeTruthy();
      expect([hero1.id, hero2.id]).toContain(finalEnemy.killedByHeroId);

      // Verify only one hero got the kill
      const [finalHero1, finalHero2] = await Promise.all([
        prismaService.hero.findUnique({where: {id: hero1.id}}),
        prismaService.hero.findUnique({where: {id: hero2.id}}),
      ]);

      const totalKills = finalHero1.enemiesKilledAmount + finalHero2.enemiesKilledAmount;
      expect(totalKills).toBe(1);

      // Check which hero got the kill and verify their experience
      const winningHero = finalEnemy.killedByHeroId === hero1.id ? finalHero1 : finalHero2;
      const losingHero = finalEnemy.killedByHeroId === hero1.id ? finalHero2 : finalHero1;

      expect(winningHero.enemiesKilledAmount).toBe(1);
      expect(winningHero.experience).toBe(50); // 5 * 10
      expect(losingHero.enemiesKilledAmount).toBe(0);
      expect(losingHero.experience).toBe(0);
    });

    it('should handle multiple heroes killing different enemies simultaneously', async () => {
      // Setup: Create 3 heroes and 3 enemies
      const heroes = await Promise.all([
        prismaService.hero.create({
          data: {
            id: 'multi-hero-1',
            name: 'Multi Hero 1',
            level: 1,
            experience: 0,
            enemiesKilledAmount: 0,
          },
        }),
        prismaService.hero.create({
          data: {
            id: 'multi-hero-2',
            name: 'Multi Hero 2',
            level: 1,
            experience: 0,
            enemiesKilledAmount: 0,
          },
        }),
        prismaService.hero.create({
          data: {
            id: 'multi-hero-3',
            name: 'Multi Hero 3',
            level: 1,
            experience: 0,
            enemiesKilledAmount: 0,
          },
        }),
      ]);

      const enemies = await Promise.all([
        prismaService.enemy.create({
          data: {
            id: 'multi-enemy-1',
            name: 'Multi Enemy 1',
            level: 2,
            experience: 50,
            enemyType: EnemyType.GOBLIN,
            killedByHeroId: null,
          },
        }),
        prismaService.enemy.create({
          data: {
            id: 'multi-enemy-2',
            name: 'Multi Enemy 2',
            level: 3,
            experience: 100,
            enemyType: EnemyType.ORC,
            killedByHeroId: null,
          },
        }),
        prismaService.enemy.create({
          data: {
            id: 'multi-enemy-3',
            name: 'Multi Enemy 3',
            level: 4,
            experience: 150,
            enemyType: EnemyType.TROLL,
            killedByHeroId: null,
          },
        }),
      ]);

      // Act: Each hero kills a different enemy simultaneously
      const requests = [
        request(app.getHttpServer())
          .put(`/combat/heroes/${heroes[0].id}/kill/${EnemyType.GOBLIN}/${enemies[0].id}`),
        request(app.getHttpServer())
          .put(`/combat/heroes/${heroes[1].id}/kill/${EnemyType.ORC}/${enemies[1].id}`),
        request(app.getHttpServer())
          .put(`/combat/heroes/${heroes[2].id}/kill/${EnemyType.TROLL}/${enemies[2].id}`),
      ];

      const responses = await Promise.all(requests);

      // Assert: All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Verify database state: all enemies should be killed by their respective heroes
      const finalEnemies = await Promise.all(
        enemies.map(enemy => prismaService.enemy.findUnique({where: {id: enemy.id}}))
      );

      finalEnemies.forEach((enemy, index) => {
        expect(enemy.killedByHeroId).toBe(heroes[index].id);
      });

      // Verify all heroes got their respective kills and experience
      const finalHeroes = await Promise.all(
        heroes.map(hero => prismaService.hero.findUnique({where: {id: hero.id}}))
      );

      finalHeroes.forEach((hero, index) => {
        expect(hero.enemiesKilledAmount).toBe(1);
        expect(hero.experience).toBe(enemies[index].level * 10);
      });
    });

    it('should handle rapid sequential kills by same hero', async () => {
      // Setup: Create one hero and multiple enemies
      const hero = await prismaService.hero.create({
        data: {
          id: 'rapid-hero',
          name: 'Rapid Hero',
          level: 1,
          experience: 0,
          enemiesKilledAmount: 0,
        },
      });

      const enemies = await Promise.all([
        prismaService.enemy.create({
          data: {
            id: 'rapid-enemy-1',
            name: 'Rapid Enemy 1',
            level: 1,
            experience: 10,
            enemyType: EnemyType.GOBLIN,
            killedByHeroId: null,
          },
        }),
        prismaService.enemy.create({
          data: {
            id: 'rapid-enemy-2',
            name: 'Rapid Enemy 2',
            level: 2,
            experience: 20,
            enemyType: EnemyType.GOBLIN,
            killedByHeroId: null,
          },
        }),
        prismaService.enemy.create({
          data: {
            id: 'rapid-enemy-3',
            name: 'Rapid Enemy 3',
            level: 3,
            experience: 30,
            enemyType: EnemyType.GOBLIN,
            killedByHeroId: null,
          },
        }),
      ]);

      // Act: Rapid kills (fire and don't wait)
      const requests = enemies.map(enemy =>
        request(app.getHttpServer())
          .put(`/combat/heroes/${hero.id}/kill/${EnemyType.GOBLIN}/${enemy.id}`)
      );

      const responses = await Promise.all(requests);

      // Assert: All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Verify final state
      const finalHero = await prismaService.hero.findUnique({
        where: {id: hero.id},
      });

      expect(finalHero.enemiesKilledAmount).toBe(3);
      expect(finalHero.experience).toBe(60); // 10 + 20 + 30 = 60

      // Verify all enemies are killed by the hero
      const finalEnemies = await Promise.all(
        enemies.map(enemy => prismaService.enemy.findUnique({where: {id: enemy.id}}))
      );

      finalEnemies.forEach(enemy => {
        expect(enemy.killedByHeroId).toBe(hero.id);
      });
    });

    it('should handle database deadlock scenarios gracefully', async () => {
      // Setup: Create scenario that might cause deadlocks
      const heroes = await Promise.all([
        prismaService.hero.create({
          data: {
            id: 'deadlock-hero-1',
            name: 'Deadlock Hero 1',
            level: 1,
            experience: 0,
            enemiesKilledAmount: 0,
          },
        }),
        prismaService.hero.create({
          data: {
            id: 'deadlock-hero-2',
            name: 'Deadlock Hero 2',
            level: 1,
            experience: 0,
            enemiesKilledAmount: 0,
          },
        }),
      ]);

      const enemies = await Promise.all([
        prismaService.enemy.create({
          data: {
            id: 'deadlock-enemy-1',
            name: 'Deadlock Enemy 1',
            level: 2,
            experience: 50,
            enemyType: EnemyType.GOBLIN,
            killedByHeroId: null,
          },
        }),
        prismaService.enemy.create({
          data: {
            id: 'deadlock-enemy-2',
            name: 'Deadlock Enemy 2',
            level: 3,
            experience: 75,
            enemyType: EnemyType.ORC,
            killedByHeroId: null,
          },
        }),
      ]);

      // Act: Cross-pattern requests that might cause deadlocks
      const requests = [
        // Hero 1 kills Enemy 1, then Hero 2 kills Enemy 2
        request(app.getHttpServer())
          .put(`/combat/heroes/${heroes[0].id}/kill/${EnemyType.GOBLIN}/${enemies[0].id}`),
        request(app.getHttpServer())
          .put(`/combat/heroes/${heroes[1].id}/kill/${EnemyType.ORC}/${enemies[1].id}`),
        // Also try reverse pattern
        request(app.getHttpServer())
          .put(`/combat/heroes/${heroes[1].id}/kill/${EnemyType.GOBLIN}/${enemies[0].id}`),
        request(app.getHttpServer())
          .put(`/combat/heroes/${heroes[0].id}/kill/${EnemyType.ORC}/${enemies[1].id}`),
      ];

      const responses = await Promise.allSettled(requests);

      // Assert: At least 2 should succeed (the non-conflicting ones)
      const successfulResponses = responses.filter(
        r => r.status === 'fulfilled' && (r.value as any).status === 200
      );

      expect(successfulResponses.length).toBeGreaterThanOrEqual(2);

      // Verify database consistency
      const finalEnemies = await Promise.all(
        enemies.map(enemy => prismaService.enemy.findUnique({where: {id: enemy.id}}))
      );

      // Each enemy should be killed by exactly one hero
      finalEnemies.forEach(enemy => {
        expect(enemy.killedByHeroId).toBeTruthy();
        expect([heroes[0].id, heroes[1].id]).toContain(enemy.killedByHeroId);
      });
    });

    it('should maintain referential integrity under concurrent load', async () => {
      // Setup: Create multiple heroes and enemies for stress testing
      const heroCount = 5;
      const enemyCount = 3;

      const heroes = await Promise.all(
        Array.from({length: heroCount}, (_, i) =>
          prismaService.hero.create({
            data: {
              id: `stress-hero-${i}`,
              name: `Stress Hero ${i}`,
              level: 1,
              experience: 0,
              enemiesKilledAmount: 0,
            },
          })
        )
      );

      const enemies = await Promise.all(
        Array.from({length: enemyCount}, (_, i) =>
          prismaService.enemy.create({
            data: {
              id: `stress-enemy-${i}`,
              name: `Stress Enemy ${i}`,
              level: 2,
              experience: 50,
              enemyType: EnemyType.GOBLIN,
              killedByHeroId: null,
            },
          })
        )
      );

      // Act: Every hero tries to kill every enemy
      const allRequests = [];
      for (const hero of heroes) {
        for (const enemy of enemies) {
          allRequests.push(
            request(app.getHttpServer())
              .put(`/combat/heroes/${hero.id}/kill/${EnemyType.GOBLIN}/${enemy.id}`)
          );
        }
      }

      const responses = await Promise.allSettled(allRequests);

      // Assert: Exactly 3 requests should succeed (one per enemy)
      const successfulResponses = responses.filter(
        r => r.status === 'fulfilled' && (r.value as any).status === 200
      );

      expect(successfulResponses.length).toBe(enemyCount);

      // Verify referential integrity
      const finalEnemies = await Promise.all(
        enemies.map(enemy => prismaService.enemy.findUnique({where: {id: enemy.id}}))
      );

      const finalHeroes = await Promise.all(
        heroes.map(hero => prismaService.hero.findUnique({where: {id: hero.id}}))
      );

      // Each enemy should be killed by exactly one hero
      finalEnemies.forEach(enemy => {
        expect(enemy.killedByHeroId).toBeTruthy();
        expect(heroes.map(h => h.id)).toContain(enemy.killedByHeroId);
      });

      // Total kills across all heroes should equal number of enemies
      const totalKills = finalHeroes.reduce((sum, hero) => sum + hero.enemiesKilledAmount, 0);
      expect(totalKills).toBe(enemyCount);

      // Total experience should be consistent
      const totalExperience = finalHeroes.reduce((sum, hero) => sum + hero.experience, 0);
      const expectedTotalExperience = enemies.reduce((sum, enemy) => sum + (enemy.level * 10), 0);
      expect(totalExperience).toBe(expectedTotalExperience);
    });
  });

  describe('Performance Under Concurrent Load', () => {
    it('should handle reasonable response times under concurrent load', async () => {
      // Setup
      const hero = await prismaService.hero.create({
        data: {
          id: 'perf-hero',
          name: 'Performance Hero',
          level: 1,
          experience: 0,
          enemiesKilledAmount: 0,
        },
      });

      const enemies = await Promise.all(
        Array.from({length: 10}, (_, i) =>
          prismaService.enemy.create({
            data: {
              id: `perf-enemy-${i}`,
              name: `Performance Enemy ${i}`,
              level: 1,
              experience: 10,
              enemyType: EnemyType.GOBLIN,
              killedByHeroId: null,
            },
          })
        )
      );

      // Act: Measure performance
      const startTime = Date.now();

      const requests = enemies.map(enemy =>
        request(app.getHttpServer())
          .put(`/combat/heroes/${hero.id}/kill/${EnemyType.GOBLIN}/${enemy.id}`)
      );

      await Promise.all(requests);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Assert: Should complete within reasonable time (adjust threshold as needed)
      expect(totalTime).toBeLessThan(5000); // 5 seconds for 10 concurrent requests

      // Verify all operations completed successfully
      const finalHero = await prismaService.hero.findUnique({
        where: {id: hero.id},
      });
      expect(finalHero.enemiesKilledAmount).toBe(10);
    });
  });
});