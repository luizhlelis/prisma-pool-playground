import { Enemy, EnemyType } from '../../src/models/enemy.entity';

describe('Enemy', () => {
  let enemy: Enemy;

  beforeEach(() => {
    enemy = new Enemy('enemy-1', 'Test Enemy', EnemyType.GOBLIN, 1, 0);
  });

  describe('constructor', () => {
    it('should create an enemy with default values', () => {
      const newEnemy = new Enemy('enemy-2', 'New Enemy', EnemyType.ORC);
      
      expect(newEnemy.id).toBe('enemy-2');
      expect(newEnemy.name).toBe('New Enemy');
      expect(newEnemy.enemyType).toBe(EnemyType.ORC);
      expect(newEnemy.level).toBe(1);
      expect(newEnemy.experience).toBe(0);
      expect(newEnemy.killedByHeroId).toBeUndefined();
    });

    it('should create an enemy with custom values', () => {
      const customEnemy = new Enemy('enemy-3', 'Custom Enemy', EnemyType.DRAGON, 5, 200, 'hero-1');
      
      expect(customEnemy.level).toBe(5);
      expect(customEnemy.experience).toBe(200);
      expect(customEnemy.killedByHeroId).toBe('hero-1');
    });

    it('should create enemies of all types', () => {
      const dragon = new Enemy('dragon', 'Dragon Enemy', EnemyType.DRAGON);
      const orc = new Enemy('orc', 'Orc Enemy', EnemyType.ORC);
      const goblin = new Enemy('goblin', 'Goblin Enemy', EnemyType.GOBLIN);
      const troll = new Enemy('troll', 'Troll Enemy', EnemyType.TROLL);
      
      expect(dragon.enemyType).toBe(EnemyType.DRAGON);
      expect(orc.enemyType).toBe(EnemyType.ORC);
      expect(goblin.enemyType).toBe(EnemyType.GOBLIN);
      expect(troll.enemyType).toBe(EnemyType.TROLL);
    });
  });

  describe('gainExperience', () => {
    it('should increase experience by the given amount', () => {
      const initialExperience = enemy.experience;
      
      enemy.gainExperience(50);
      
      expect(enemy.experience).toBe(initialExperience + 50);
    });

    it('should level up when experience reaches level * 100', () => {
      enemy.gainExperience(100); // Exactly the threshold for level 1
      
      expect(enemy.level).toBe(2);
      expect(enemy.experience).toBe(0);
    });

    it('should level up multiple times if experience is high enough', () => {
      enemy.gainExperience(350); // Should level up to level 3
      
      expect(enemy.level).toBe(3);
      expect(enemy.experience).toBe(50); // 350 - 100 (level 1) - 200 (level 2) = 50
    });

    it('should handle exact threshold values', () => {
      enemy.gainExperience(99); // Just below threshold
      expect(enemy.level).toBe(1);
      
      enemy.gainExperience(1); // Now at threshold
      expect(enemy.level).toBe(2);
      expect(enemy.experience).toBe(0);
    });

    it('should handle level threshold calculation for higher levels', () => {
      enemy.level = 5;
      enemy.experience = 0;
      
      enemy.gainExperience(500); // Exactly level 5 threshold (5 * 100)
      
      expect(enemy.level).toBe(6);
      expect(enemy.experience).toBe(0);
    });
  });

  describe('getKilledBy', () => {
    it('should set killedByHeroId when killed by a hero', () => {
      const heroId = 'hero-123';
      
      enemy.getKilledBy(heroId);
      
      expect(enemy.killedByHeroId).toBe(heroId);
    });

    it('should overwrite previous killedByHeroId', () => {
      enemy.killedByHeroId = 'old-hero';
      
      enemy.getKilledBy('new-hero');
      
      expect(enemy.killedByHeroId).toBe('new-hero');
    });
  });

  describe('toDomain', () => {
    it('should convert Prisma data to Enemy domain model', () => {
      const prismaData = {
        id: 'prisma-enemy-1',
        name: 'Prisma Enemy',
        level: 3,
        experience: 150,
        enemyType: 'DRAGON' as any,
        killedByHeroId: 'hero-1',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const domainEnemy = Enemy.toDomain(prismaData);
      
      expect(domainEnemy.id).toBe(prismaData.id);
      expect(domainEnemy.name).toBe(prismaData.name);
      expect(domainEnemy.level).toBe(prismaData.level);
      expect(domainEnemy.experience).toBe(prismaData.experience);
      expect(domainEnemy.enemyType).toBe(EnemyType.DRAGON);
      expect(domainEnemy.killedByHeroId).toBe(prismaData.killedByHeroId);
    });

    it('should handle null killedByHeroId', () => {
      const prismaData = {
        id: 'prisma-enemy-2',
        name: 'Alive Enemy',
        level: 2,
        experience: 50,
        enemyType: 'GOBLIN' as any,
        killedByHeroId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const domainEnemy = Enemy.toDomain(prismaData);
      
      expect(domainEnemy.killedByHeroId).toBeUndefined();
    });

    it('should handle all enemy types conversion', () => {
      const dragonData = { ...createBasePrismaData(), enemyType: 'DRAGON' as any };
      const orcData = { ...createBasePrismaData(), enemyType: 'ORC' as any };
      const goblinData = { ...createBasePrismaData(), enemyType: 'GOBLIN' as any };
      const trollData = { ...createBasePrismaData(), enemyType: 'TROLL' as any };

      expect(Enemy.toDomain(dragonData).enemyType).toBe(EnemyType.DRAGON);
      expect(Enemy.toDomain(orcData).enemyType).toBe(EnemyType.ORC);
      expect(Enemy.toDomain(goblinData).enemyType).toBe(EnemyType.GOBLIN);
      expect(Enemy.toDomain(trollData).enemyType).toBe(EnemyType.TROLL);
    });
  });

  describe('toPersistence', () => {
    it('should convert Enemy domain model to persistence format', () => {
      enemy.level = 3;
      enemy.experience = 150;
      enemy.killedByHeroId = 'hero-123';
      
      const persistenceData = enemy.toPersistence();
      
      expect(persistenceData.id).toBe(enemy.id);
      expect(persistenceData.name).toBe(enemy.name);
      expect(persistenceData.level).toBe(enemy.level);
      expect(persistenceData.experience).toBe(enemy.experience);
      expect(persistenceData.enemyType).toBe(enemy.enemyType);
      expect(persistenceData.killedByHeroId).toBe(enemy.killedByHeroId);
      expect(persistenceData).not.toHaveProperty('createdAt');
      expect(persistenceData).not.toHaveProperty('updatedAt');
    });

    it('should convert undefined killedByHeroId to null', () => {
      enemy.killedByHeroId = undefined;
      
      const persistenceData = enemy.toPersistence();
      
      expect(persistenceData.killedByHeroId).toBeNull();
    });

    it('should preserve killedByHeroId when set', () => {
      enemy.killedByHeroId = 'hero-456';
      
      const persistenceData = enemy.toPersistence();
      
      expect(persistenceData.killedByHeroId).toBe('hero-456');
    });
  });

  describe('EnemyType enum', () => {
    it('should have all expected enemy types', () => {
      expect(EnemyType.DRAGON).toBe('DRAGON');
      expect(EnemyType.ORC).toBe('ORC');
      expect(EnemyType.GOBLIN).toBe('GOBLIN');
      expect(EnemyType.TROLL).toBe('TROLL');
    });

    it('should maintain string values for persistence compatibility', () => {
      // Ensures enum values are strings that match Prisma schema
      expect(typeof EnemyType.DRAGON).toBe('string');
      expect(typeof EnemyType.ORC).toBe('string');
      expect(typeof EnemyType.GOBLIN).toBe('string');
      expect(typeof EnemyType.TROLL).toBe('string');
    });
  });

  describe('experience calculation edge cases', () => {
    it('should handle zero experience gain', () => {
      const initialLevel = enemy.level;
      
      enemy.gainExperience(0);
      
      expect(enemy.level).toBe(initialLevel);
      expect(enemy.experience).toBe(0);
    });

    it('should handle negative experience values', () => {
      enemy.experience = -50;
      
      enemy.gainExperience(30);
      
      expect(enemy.experience).toBe(-20);
      expect(enemy.level).toBe(1); // Should not level up with negative experience
    });

    it('should handle very large experience gains', () => {
      enemy.gainExperience(10000);
      
      // Should level up many times
      expect(enemy.level).toBeGreaterThan(1);
      expect(enemy.experience).toBeGreaterThanOrEqual(0);
    });
  });
});

function createBasePrismaData() {
  return {
    id: 'test-enemy',
    name: 'Test Enemy',
    level: 1,
    experience: 0,
    killedByHeroId: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}