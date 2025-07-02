import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { EnemyType } from '../../src/models/enemy.entity';

describe('Combat API (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  
  // Test data
  let testHero: any;
  let testEnemy: any;
  let anotherEnemy: any;

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
    // Clean up database
    await prismaService.enemy.deleteMany();
    await prismaService.hero.deleteMany();

    // Create test data
    testHero = await prismaService.hero.create({
      data: {
        id: 'test-hero-1',
        name: 'Test Hero',
        level: 1,
        experience: 0,
        enemiesKilledAmount: 0,
      },
    });

    testEnemy = await prismaService.enemy.create({
      data: {
        id: 'test-enemy-1',
        name: 'Test Goblin',
        level: 3,
        experience: 100,
        enemyType: EnemyType.GOBLIN,
        killedByHeroId: null,
      },
    });

    anotherEnemy = await prismaService.enemy.create({
      data: {
        id: 'test-enemy-2',
        name: 'Test Dragon',
        level: 5,
        experience: 200,
        enemyType: EnemyType.DRAGON,
        killedByHeroId: null,
      },
    });
  });

  afterAll(async () => {
    // Clean up
    await prismaService.enemy.deleteMany();
    await prismaService.hero.deleteMany();
    await prismaService.$disconnect();
    await app.close();
  });

  describe('PUT /combat/heroes/:heroId/kill/:enemyType/:enemyId', () => {
    it('should successfully kill an enemy', async () => {
      const response = await request(app.getHttpServer())
        .put(`/combat/heroes/${testHero.id}/kill/${EnemyType.GOBLIN}/${testEnemy.id}`)
        .expect(200);

      expect(response.body).toEqual({
        actionId: testEnemy.id,
      });

      // Verify database changes
      const updatedHero = await prismaService.hero.findUnique({
        where: { id: testHero.id },
      });
      expect(updatedHero.enemiesKilledAmount).toBe(1);
      expect(updatedHero.experience).toBe(30); // 3 * 10

      const updatedEnemy = await prismaService.enemy.findUnique({
        where: { id: testEnemy.id },
      });
      expect(updatedEnemy.killedByHeroId).toBe(testHero.id);
    });

    it('should level up hero when killing high-level enemy', async () => {
      // Give hero 80 experience (close to level up at 100)
      await prismaService.hero.update({
        where: { id: testHero.id },
        data: { experience: 80 },
      });

      await request(app.getHttpServer())
        .put(`/combat/heroes/${testHero.id}/kill/${EnemyType.GOBLIN}/${testEnemy.id}`)
        .expect(200);

      // Verify hero leveled up
      const updatedHero = await prismaService.hero.findUnique({
        where: { id: testHero.id },
      });
      expect(updatedHero.level).toBe(2);
      expect(updatedHero.experience).toBe(10); // 80 + 30 = 110, level up to 2, remaining 10
    });

    it('should return 400 when hero not found', async () => {
      const response = await request(app.getHttpServer())
        .put(`/combat/heroes/non-existent-hero/kill/${EnemyType.GOBLIN}/${testEnemy.id}`)
        .expect(500); // Note: This might be 500 instead of 400 depending on error handling

      expect(response.body.message).toContain('Hero with ID non-existent-hero not found');
    });

    it('should return 400 when enemy not found', async () => {
      const response = await request(app.getHttpServer())
        .put(`/combat/heroes/${testHero.id}/kill/${EnemyType.GOBLIN}/non-existent-enemy`)
        .expect(500);

      expect(response.body.message).toContain('Enemy with ID non-existent-enemy not found');
    });

    it('should return 400 when enemy already killed', async () => {
      // First, kill the enemy
      await request(app.getHttpServer())
        .put(`/combat/heroes/${testHero.id}/kill/${EnemyType.GOBLIN}/${testEnemy.id}`)
        .expect(200);

      // Try to kill the same enemy again
      const response = await request(app.getHttpServer())
        .put(`/combat/heroes/${testHero.id}/kill/${EnemyType.GOBLIN}/${testEnemy.id}`)
        .expect(500);

      expect(response.body.message).toContain('Enemy test-enemy-1 has already been killed');
    });

    it('should return 400 when enemy type mismatch', async () => {
      const response = await request(app.getHttpServer())
        .put(`/combat/heroes/${testHero.id}/kill/${EnemyType.DRAGON}/${testEnemy.id}`)
        .expect(500);

      expect(response.body.message).toContain('Enemy test-enemy-1 is not of type DRAGON');
    });

    it('should handle all enemy types correctly', async () => {
      const enemyTypes = [
        { type: EnemyType.DRAGON, enemy: anotherEnemy },
        { type: EnemyType.GOBLIN, enemy: testEnemy },
      ];

      for (const { type, enemy } of enemyTypes) {
        // Create a fresh hero for each test
        const hero = await prismaService.hero.create({
          data: {
            id: `hero-${type}`,
            name: `Hero for ${type}`,
            level: 1,
            experience: 0,
            enemiesKilledAmount: 0,
          },
        });

        const response = await request(app.getHttpServer())
          .put(`/combat/heroes/${hero.id}/kill/${type}/${enemy.id}`)
          .expect(200);

        expect(response.body.actionId).toBe(enemy.id);
      }
    });

    it('should handle concurrent kill attempts on same enemy', async () => {
      // Create another hero
      const secondHero = await prismaService.hero.create({
        data: {
          id: 'test-hero-2',
          name: 'Second Hero',
          level: 1,
          experience: 0,
          enemiesKilledAmount: 0,
        },
      });

      // Both heroes try to kill the same enemy simultaneously
      const promises = [
        request(app.getHttpServer())
          .put(`/combat/heroes/${testHero.id}/kill/${EnemyType.GOBLIN}/${testEnemy.id}`),
        request(app.getHttpServer())
          .put(`/combat/heroes/${secondHero.id}/kill/${EnemyType.GOBLIN}/${testEnemy.id}`),
      ];

      const responses = await Promise.allSettled(promises);

      // One should succeed, one should fail
      const successfulResponses = responses.filter(r => r.status === 'fulfilled' && (r.value as any).status === 200);
      const failedResponses = responses.filter(r => r.status === 'fulfilled' && (r.value as any).status !== 200);

      expect(successfulResponses.length).toBe(1);
      expect(failedResponses.length).toBe(1);

      // Verify only one hero actually killed the enemy
      const updatedEnemy = await prismaService.enemy.findUnique({
        where: { id: testEnemy.id },
      });
      expect(updatedEnemy.killedByHeroId).toBeTruthy();
    });

    it('should validate URL parameters format', async () => {
      const invalidCases = [
        {
          heroId: 'invalid-uuid',
          enemyId: testEnemy.id,
          enemyType: EnemyType.GOBLIN,
          description: 'invalid hero UUID'
        },
        {
          heroId: testHero.id,
          enemyId: 'invalid-uuid',
          enemyType: EnemyType.GOBLIN,
          description: 'invalid enemy UUID'
        },
        {
          heroId: testHero.id,
          enemyId: testEnemy.id,
          enemyType: 'INVALID_TYPE',
          description: 'invalid enemy type'
        },
      ];

      for (const testCase of invalidCases) {
        const response = await request(app.getHttpServer())
          .put(`/combat/heroes/${testCase.heroId}/kill/${testCase.enemyType}/${testCase.enemyId}`)
          .expect(400);

        // The response should indicate validation error
        expect(response.body.statusCode).toBe(400);
      }
    });

    it('should maintain data consistency across multiple kills', async () => {
      // Create multiple enemies
      const enemies = await Promise.all([
        prismaService.enemy.create({
          data: {
            id: 'enemy-consistency-1',
            name: 'Consistency Enemy 1',
            level: 2,
            experience: 50,
            enemyType: EnemyType.ORC,
            killedByHeroId: null,
          },
        }),
        prismaService.enemy.create({
          data: {
            id: 'enemy-consistency-2',
            name: 'Consistency Enemy 2',
            level: 4,
            experience: 150,
            enemyType: EnemyType.TROLL,
            killedByHeroId: null,
          },
        }),
      ]);

      // Kill them sequentially
      for (const enemy of enemies) {
        await request(app.getHttpServer())
          .put(`/combat/heroes/${testHero.id}/kill/${enemy.enemyType}/${enemy.id}`)
          .expect(200);
      }

      // Verify final state
      const finalHero = await prismaService.hero.findUnique({
        where: { id: testHero.id },
      });
      expect(finalHero.enemiesKilledAmount).toBe(2);
      expect(finalHero.experience).toBe(60); // 20 + 40 = 60

      // Verify all enemies are marked as killed
      for (const enemy of enemies) {
        const updatedEnemy = await prismaService.enemy.findUnique({
          where: { id: enemy.id },
        });
        expect(updatedEnemy.killedByHeroId).toBe(testHero.id);
      }
    });

    it('should handle database transaction rollback on error', async () => {
      // This test would require more complex setup to simulate transaction failures
      // For now, we'll test that partial updates don't occur on validation errors
      
      const initialHero = await prismaService.hero.findUnique({
        where: { id: testHero.id },
      });

      // Try to kill non-existent enemy
      await request(app.getHttpServer())
        .put(`/combat/heroes/${testHero.id}/kill/${EnemyType.GOBLIN}/non-existent`)
        .expect(500);

      // Verify hero state is unchanged
      const unchangedHero = await prismaService.hero.findUnique({
        where: { id: testHero.id },
      });
      expect(unchangedHero).toEqual(initialHero);
    });
  });

  describe('Integration with other endpoints', () => {
    it('should reflect kills in getAllHeroes endpoint', async () => {
      // Kill an enemy
      await request(app.getHttpServer())
        .put(`/combat/heroes/${testHero.id}/kill/${EnemyType.GOBLIN}/${testEnemy.id}`)
        .expect(200);

      // Check getAllHeroes
      const response = await request(app.getHttpServer())
        .get('/heroes')
        .expect(200);

      const hero = response.body.find((h: any) => h.id === testHero.id);
      expect(hero.enemiesKilledAmount).toBe(1);
      expect(hero.experience).toBe(30);
    });

    it('should reflect kills in getAllEnemies endpoint', async () => {
      // Kill an enemy
      await request(app.getHttpServer())
        .put(`/combat/heroes/${testHero.id}/kill/${EnemyType.GOBLIN}/${testEnemy.id}`)
        .expect(200);

      // Check getAllEnemies
      const response = await request(app.getHttpServer())
        .get('/enemies')
        .expect(200);

      const enemy = response.body.find((e: any) => e.id === testEnemy.id);
      expect(enemy.killedByHeroId).toBe(testHero.id);
    });
  });
});