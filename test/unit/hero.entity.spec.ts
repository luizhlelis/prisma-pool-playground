import { Hero } from '../../src/models/hero.entity';
import { Enemy, EnemyType } from '../../src/models/enemy.entity';

describe('Hero', () => {
  let hero: Hero;
  let enemy: Enemy;

  beforeEach(() => {
    hero = new Hero('hero-1', 'Test Hero', 1, 0);
    enemy = new Enemy('enemy-1', 'Test Enemy', EnemyType.GOBLIN, 1, 0);
  });

  describe('constructor', () => {
    it('should create a hero with default values', () => {
      const newHero = new Hero('hero-2', 'New Hero');
      
      expect(newHero.id).toBe('hero-2');
      expect(newHero.name).toBe('New Hero');
      expect(newHero.level).toBe(1);
      expect(newHero.experience).toBe(0);
      expect(newHero.enemiesKilledAmount).toBe(0);
      expect(newHero.enemiesKilled).toEqual([]);
    });

    it('should create a hero with custom values', () => {
      const customHero = new Hero('hero-3', 'Custom Hero', 5, 200);
      
      expect(customHero.level).toBe(5);
      expect(customHero.experience).toBe(200);
    });
  });

  describe('killEnemy', () => {
    it('should increase enemiesKilledAmount when killing an enemy', () => {
      const initialKillCount = hero.enemiesKilledAmount;
      
      hero.killEnemy(enemy);
      
      expect(hero.enemiesKilledAmount).toBe(initialKillCount + 1);
    });

    it('should mark enemy as killed by hero', () => {
      hero.killEnemy(enemy);
      
      expect(enemy.killedByHeroId).toBe(hero.id);
    });

    it('should add enemy to enemiesKilled array', () => {
      hero.killEnemy(enemy);
      
      expect(hero.enemiesKilled).toContain(enemy);
      expect(hero.enemiesKilled.length).toBe(1);
    });

    it('should gain experience equal to enemy level * 10', () => {
      const level3Enemy = new Enemy('enemy-2', 'Level 3 Enemy', EnemyType.ORC, 3, 0);
      const initialExperience = hero.experience;
      
      hero.killEnemy(level3Enemy);
      
      expect(hero.experience).toBe(initialExperience + (3 * 10));
    });

    it('should handle multiple enemy kills', () => {
      const enemy2 = new Enemy('enemy-2', 'Second Enemy', EnemyType.DRAGON, 2, 0);
      
      hero.killEnemy(enemy);
      hero.killEnemy(enemy2);
      
      expect(hero.enemiesKilledAmount).toBe(2);
      expect(hero.enemiesKilled.length).toBe(2);
      expect(hero.experience).toBe(30); // 10 (level 1) + 20 (level 2)
    });

    it('should trigger level up when experience threshold is reached', () => {
      // Create a high level enemy that will give enough experience to level up
      const highLevelEnemy = new Enemy('enemy-high', 'High Level Enemy', EnemyType.DRAGON, 10, 0);
      
      hero.killEnemy(highLevelEnemy);
      
      expect(hero.level).toBe(2);
      expect(hero.experience).toBe(0); // Experience resets after level up
    });
  });

  describe('gainExperience', () => {
    it('should increase experience by the given amount', () => {
      const initialExperience = hero.experience;
      
      hero.gainExperience(50);
      
      expect(hero.experience).toBe(initialExperience + 50);
    });

    it('should level up when experience reaches level * 100', () => {
      hero.gainExperience(100); // Exactly the threshold for level 1
      
      expect(hero.level).toBe(2);
      expect(hero.experience).toBe(0);
    });

    it('should level up multiple times if experience is high enough', () => {
      hero.gainExperience(350); // Should level up to level 3
      
      expect(hero.level).toBe(3);
      expect(hero.experience).toBe(50); // 350 - 100 (level 1) - 200 (level 2) = 50
    });

    it('should handle exact threshold values', () => {
      hero.gainExperience(99); // Just below threshold
      expect(hero.level).toBe(1);
      
      hero.gainExperience(1); // Now at threshold
      expect(hero.level).toBe(2);
      expect(hero.experience).toBe(0);
    });
  });

  describe('toDomain', () => {
    it('should convert Prisma data to Hero domain model', () => {
      const prismaData = {
        id: 'prisma-hero-1',
        name: 'Prisma Hero',
        level: 3,
        experience: 150,
        enemiesKilledAmount: 5,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const domainHero = Hero.toDomain(prismaData);
      
      expect(domainHero.id).toBe(prismaData.id);
      expect(domainHero.name).toBe(prismaData.name);
      expect(domainHero.level).toBe(prismaData.level);
      expect(domainHero.experience).toBe(prismaData.experience);
      expect(domainHero.enemiesKilledAmount).toBe(prismaData.enemiesKilledAmount);
    });

    it('should convert Prisma data with enemies killed', () => {
      const prismaEnemyData = {
        id: 'enemy-1',
        name: 'Test Enemy',
        level: 2,
        experience: 50,
        enemyType: 'GOBLIN' as any,
        killedByHeroId: 'hero-1',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const prismaData = {
        id: 'prisma-hero-1',
        name: 'Prisma Hero',
        level: 3,
        experience: 150,
        enemiesKilledAmount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        enemiesKilled: [prismaEnemyData]
      };
      
      const domainHero = Hero.toDomain(prismaData);
      
      expect(domainHero.enemiesKilled.length).toBe(1);
      expect(domainHero.enemiesKilled[0].id).toBe('enemy-1');
      expect(domainHero.enemiesKilled[0].name).toBe('Test Enemy');
    });
  });

  describe('toPersistence', () => {
    it('should convert Hero domain model to persistence format', () => {
      hero.level = 3;
      hero.experience = 150;
      hero.enemiesKilledAmount = 5;
      
      const persistenceData = hero.toPersistence();
      
      expect(persistenceData.id).toBe(hero.id);
      expect(persistenceData.name).toBe(hero.name);
      expect(persistenceData.level).toBe(hero.level);
      expect(persistenceData.experience).toBe(hero.experience);
      expect(persistenceData.enemiesKilledAmount).toBe(hero.enemiesKilledAmount);
      expect(persistenceData).not.toHaveProperty('createdAt');
      expect(persistenceData).not.toHaveProperty('updatedAt');
      expect(persistenceData).not.toHaveProperty('enemiesKilled');
    });
  });

  describe('experience calculation edge cases', () => {
    it('should handle zero level enemy', () => {
      const zeroLevelEnemy = new Enemy('enemy-zero', 'Zero Level', EnemyType.GOBLIN, 0, 0);
      const initialExperience = hero.experience;
      
      hero.killEnemy(zeroLevelEnemy);
      
      expect(hero.experience).toBe(initialExperience); // 0 * 10 = 0
    });

    it('should handle negative experience values', () => {
      hero.experience = -50;
      
      hero.gainExperience(30);
      
      expect(hero.experience).toBe(-20);
      expect(hero.level).toBe(1); // Should not level up with negative experience
    });

    it('should handle level threshold calculation for higher levels', () => {
      hero.level = 5;
      hero.experience = 0;
      
      hero.gainExperience(500); // Exactly level 5 threshold (5 * 100)
      
      expect(hero.level).toBe(6);
      expect(hero.experience).toBe(0);
    });
  });
});