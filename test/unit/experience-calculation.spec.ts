import { Hero } from '../../src/models/hero.entity';
import { Enemy, EnemyType } from '../../src/models/enemy.entity';

describe('Experience Calculation System', () => {
  let hero: Hero;

  beforeEach(() => {
    hero = new Hero('hero-1', 'Test Hero', 1, 0);
  });

  describe('Base Experience Calculation', () => {
    it('should calculate experience as enemy level * 10', () => {
      const testCases = [
        { enemyLevel: 1, expectedExp: 10, expectedLevel: 1 },
        { enemyLevel: 5, expectedExp: 50, expectedLevel: 1 },
        { enemyLevel: 9, expectedExp: 90, expectedLevel: 1 }, // Just below level up
        { enemyLevel: 10, expectedExp: 0, expectedLevel: 2 }, // Causes level up: 100 exp -> level 2, 0 remaining
      ];

      testCases.forEach(({ enemyLevel, expectedExp, expectedLevel }) => {
        const enemy = new Enemy(`enemy-${enemyLevel}`, 'Test Enemy', EnemyType.GOBLIN, enemyLevel);
        hero = new Hero('hero-test', 'Test Hero', 1, 0); // Create fresh hero for each test
        
        hero.killEnemy(enemy);
        
        expect(hero.experience).toBe(expectedExp);
        expect(hero.level).toBe(expectedLevel);
      });
    });

    it('should handle edge case of level 0 enemy', () => {
      const zeroLevelEnemy = new Enemy('enemy-0', 'Zero Enemy', EnemyType.GOBLIN, 0);
      
      hero.killEnemy(zeroLevelEnemy);
      
      expect(hero.experience).toBe(0);
    });

    it('should accumulate experience from multiple kills', () => {
      const enemy1 = new Enemy('enemy-1', 'Enemy 1', EnemyType.GOBLIN, 3); // 30 exp
      const enemy2 = new Enemy('enemy-2', 'Enemy 2', EnemyType.GOBLIN, 2); // 20 exp  
      const enemy3 = new Enemy('enemy-3', 'Enemy 3', EnemyType.GOBLIN, 4); // 40 exp
      
      hero.killEnemy(enemy1); // 30 exp, level 1
      hero.killEnemy(enemy2); // 50 exp, level 1
      hero.killEnemy(enemy3); // 90 exp, level 1
      
      expect(hero.experience).toBe(90); // 30 + 20 + 40 = 90 (below level up threshold)
      expect(hero.level).toBe(1);
    });
  });

  describe('Level Up Mechanics', () => {
    it('should level up when experience reaches level * 100', () => {
      // Level 1 threshold is 100 experience
      hero.gainExperience(100);
      
      expect(hero.level).toBe(2);
      expect(hero.experience).toBe(0);
    });

    it('should handle multiple level ups in single experience gain', () => {
      // Give enough experience for multiple levels
      // Level 1: 100 exp, Level 2: 200 exp, Level 3: 300 exp
      hero.gainExperience(650); // Should reach level 4 with 50 exp remaining
      
      expect(hero.level).toBe(4);
      expect(hero.experience).toBe(50);
    });

    it('should calculate correct thresholds for higher levels', () => {
      const testCases = [
        { level: 1, threshold: 100 },
        { level: 2, threshold: 200 },
        { level: 5, threshold: 500 },
        { level: 10, threshold: 1000 },
      ];

      testCases.forEach(({ level, threshold }) => {
        const testHero = new Hero('test-hero', 'Test', level, 0);
        
        testHero.gainExperience(threshold);
        
        expect(testHero.level).toBe(level + 1);
        expect(testHero.experience).toBe(0);
      });
    });

    it('should not level up if experience is just below threshold', () => {
      hero.gainExperience(99); // Just below level 1 threshold
      
      expect(hero.level).toBe(1);
      expect(hero.experience).toBe(99);
    });

    it('should handle exact threshold values', () => {
      hero.gainExperience(100); // Exactly level 1 threshold
      
      expect(hero.level).toBe(2);
      expect(hero.experience).toBe(0);
    });
  });

  describe('Level Up Through Combat', () => {
    it('should level up hero when killing enough enemies', () => {
      // Kill 10 level-1 enemies (10 * 10 = 100 exp)
      for (let i = 0; i < 10; i++) {
        const enemy = new Enemy(`enemy-${i}`, `Enemy ${i}`, EnemyType.GOBLIN, 1);
        hero.killEnemy(enemy);
      }
      
      expect(hero.level).toBe(2);
      expect(hero.experience).toBe(0);
      expect(hero.enemiesKilledAmount).toBe(10);
    });

    it('should level up multiple times from single high-level enemy kill', () => {
      // Create enemy that gives 350 experience (enough for multiple levels)
      const highLevelEnemy = new Enemy('boss', 'Boss Enemy', EnemyType.GOBLIN, 35);
      
      hero.killEnemy(highLevelEnemy);
      
      // 350 exp: Level 1 (100) -> Level 2, 250 remaining
      // Level 2 (200) -> Level 3, 50 remaining  
      expect(hero.level).toBe(3);
      expect(hero.experience).toBe(50);
    });

    it('should track enemy relationships after level up', () => {
      const powerfulEnemy = new Enemy('powerful', 'Powerful Enemy', EnemyType.GOBLIN, 15);
      
      hero.killEnemy(powerfulEnemy);
      
      expect(powerfulEnemy.killedByHeroId).toBe(hero.id);
      expect(hero.enemiesKilled).toContain(powerfulEnemy);
      expect(hero.level).toBe(2); // 150 exp > 100 threshold
    });
  });

  describe('Complex Combat Scenarios', () => {
    it('should handle mixed enemy levels correctly', () => {
      const weakEnemy = new Enemy('weak', 'Weak', EnemyType.GOBLIN, 1);     // 10 exp
      const strongEnemy = new Enemy('strong', 'Strong', EnemyType.GOBLIN, 12); // 120 exp
      const bossEnemy = new Enemy('boss', 'Boss', EnemyType.GOBLIN, 8);     // 80 exp
      
      hero.killEnemy(weakEnemy);   // 10 exp, level 1
      hero.killEnemy(strongEnemy); // 130 exp total, level 2, 30 remaining
      hero.killEnemy(bossEnemy);   // 210 exp total, level 2, 110 remaining
      
      expect(hero.level).toBe(2);
      expect(hero.experience).toBe(110);
      expect(hero.enemiesKilledAmount).toBe(3);
    });

    it('should maintain correct state across multiple level ups', () => {
      // Series of enemies that will cause multiple level ups
      const enemies = [
        new Enemy('e1', 'Enemy 1', EnemyType.GOBLIN, 8),   // 80 exp
        new Enemy('e2', 'Enemy 2', EnemyType.GOBLIN, 15),  // 150 exp
        new Enemy('e3', 'Enemy 3', EnemyType.GOBLIN, 12),  // 120 exp
        new Enemy('e4', 'Enemy 4', EnemyType.GOBLIN, 25),  // 250 exp
      ];
      
      enemies.forEach(enemy => hero.killEnemy(enemy));
      
      // Total: 600 exp
      // Level 1: 100 exp (level up to 2)
      // Level 2: 200 exp (level up to 3) 
      // Level 3: 300 exp (level up to 4)
      // Remaining: 0 exp
      
      expect(hero.level).toBe(4);
      expect(hero.experience).toBe(0);
      expect(hero.enemiesKilledAmount).toBe(4);
      expect(hero.enemiesKilled.length).toBe(4);
    });

    it('should handle hero starting at higher level', () => {
      const midLevelHero = new Hero('mid-hero', 'Mid Hero', 5, 250);
      const enemy = new Enemy('enemy', 'Test Enemy', EnemyType.GOBLIN, 30); // 300 exp
      
      midLevelHero.killEnemy(enemy);
      
      // Starting: Level 5, 250 exp
      // Gain: 300 exp = 550 total
      // Level 5 threshold: 500 exp
      // After level up: Level 6, 50 exp remaining
      
      expect(midLevelHero.level).toBe(6);
      expect(midLevelHero.experience).toBe(50);
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    it('should handle negative initial experience', () => {
      const negativeExpHero = new Hero('neg-hero', 'Negative Hero', 1, -50);
      const enemy = new Enemy('enemy', 'Test Enemy', EnemyType.GOBLIN, 8); // 80 exp
      
      negativeExpHero.killEnemy(enemy);
      
      expect(negativeExpHero.experience).toBe(30); // -50 + 80 = 30
      expect(negativeExpHero.level).toBe(1); // Still below threshold
    });

    it('should handle zero experience gain', () => {
      const zeroLevelEnemy = new Enemy('zero', 'Zero Enemy', EnemyType.GOBLIN, 0);
      const initialLevel = hero.level;
      const initialExp = hero.experience;
      
      hero.killEnemy(zeroLevelEnemy);
      
      expect(hero.level).toBe(initialLevel);
      expect(hero.experience).toBe(initialExp);
      expect(hero.enemiesKilledAmount).toBe(1); // Kill count should still increase
    });

    it('should handle very large experience values', () => {
      hero.gainExperience(100000);
      
      expect(hero.level).toBeGreaterThan(1);
      expect(hero.experience).toBeGreaterThanOrEqual(0);
      expect(hero.experience).toBeLessThan(hero.level * 100); // Should not exceed next threshold
    });

    it('should maintain precision with floating point calculations', () => {
      // Test that we don't have floating point precision issues
      hero.gainExperience(99.99);
      expect(hero.level).toBe(1); // Should not trigger level up due to floating point
      
      hero.gainExperience(0.01);
      expect(hero.level).toBe(2); // Now should level up
    });
  });
});