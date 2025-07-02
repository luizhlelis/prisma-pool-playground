import { Test, TestingModule } from '@nestjs/testing';
import { KillEnemyHandler } from '../../src/handlers/commands/kill-enemy.handler';
import { KillEnemyCommand } from '../../src/commands/kill-enemy.command';
import { PrismaService } from '../../src/prisma/prisma.service';
import { HeroesRepository } from '../../src/repositories/heroes.repo';
import { EnemyType } from '../../src/models/enemy.entity';

// Create a type for our mocked PrismaService
type MockedPrismaService = {
  hero: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  enemy: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  $transaction: jest.Mock;
};

describe('KillEnemyHandler', () => {
  let handler: KillEnemyHandler;
  let prismaService: MockedPrismaService;
  let heroesRepository: any;

  const mockHeroData = {
    id: 'hero-1',
    name: 'Test Hero',
    level: 1,
    experience: 0,
    enemiesKilledAmount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    enemiesKilled: []
  };

  const mockEnemyData = {
    id: 'enemy-1',
    name: 'Test Enemy',
    level: 3,
    experience: 100,
    enemyType: 'GOBLIN' as any,
    killedByHeroId: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(async () => {
    const mockPrismaService: MockedPrismaService = {
      hero: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      enemy: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const mockHeroesRepository = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KillEnemyHandler,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: HeroesRepository,
          useValue: mockHeroesRepository,
        },
      ],
    }).compile();

    handler = module.get<KillEnemyHandler>(KillEnemyHandler);
    prismaService = module.get(PrismaService) as MockedPrismaService;
    heroesRepository = module.get(HeroesRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should successfully execute kill enemy command', async () => {
      // Arrange
      const command = new KillEnemyCommand('hero-1', 'enemy-1', EnemyType.GOBLIN);
      
      prismaService.hero.findUnique.mockResolvedValue(mockHeroData);
      prismaService.enemy.findUnique.mockResolvedValue(mockEnemyData);
      prismaService.$transaction.mockResolvedValue([{}, {}]);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result).toEqual({ actionId: 'enemy-1' });
      expect(prismaService.hero.findUnique).toHaveBeenCalledWith({
        where: { id: 'hero-1' },
        include: { enemiesKilled: true }
      });
      expect(prismaService.enemy.findUnique).toHaveBeenCalledWith({
        where: { id: 'enemy-1' }
      });
      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw error when hero is not found', async () => {
      // Arrange
      const command = new KillEnemyCommand('non-existent-hero', 'enemy-1', EnemyType.GOBLIN);
      
      prismaService.hero.findUnique.mockResolvedValue(null);
      prismaService.enemy.findUnique.mockResolvedValue(mockEnemyData);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Hero with ID non-existent-hero not found');
      expect(prismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should throw error when enemy is not found', async () => {
      // Arrange
      const command = new KillEnemyCommand('hero-1', 'non-existent-enemy', EnemyType.GOBLIN);
      
      prismaService.hero.findUnique.mockResolvedValue(mockHeroData);
      prismaService.enemy.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Enemy with ID non-existent-enemy not found');
      expect(prismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should throw error when enemy is already killed', async () => {
      // Arrange
      const command = new KillEnemyCommand('hero-1', 'enemy-1', EnemyType.GOBLIN);
      const deadEnemyData = { ...mockEnemyData, killedByHeroId: 'other-hero' };
      
      prismaService.hero.findUnique.mockResolvedValue(mockHeroData);
      prismaService.enemy.findUnique.mockResolvedValue(deadEnemyData);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Enemy enemy-1 has already been killed');
      expect(prismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should throw error when enemy type does not match', async () => {
      // Arrange
      const command = new KillEnemyCommand('hero-1', 'enemy-1', EnemyType.DRAGON);
      // Enemy is GOBLIN but command expects DRAGON
      
      prismaService.hero.findUnique.mockResolvedValue(mockHeroData);
      prismaService.enemy.findUnique.mockResolvedValue(mockEnemyData);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Enemy enemy-1 is not of type DRAGON');
      expect(prismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should handle multiple enemy types correctly', async () => {
      const enemyTypes = [
        { type: EnemyType.DRAGON, prismaType: 'DRAGON' },
        { type: EnemyType.ORC, prismaType: 'ORC' },
        { type: EnemyType.GOBLIN, prismaType: 'GOBLIN' },
        { type: EnemyType.TROLL, prismaType: 'TROLL' },
      ];

      for (const { type, prismaType } of enemyTypes) {
        // Arrange
        const command = new KillEnemyCommand('hero-1', `enemy-${type}`, type);
        const enemyData = { ...mockEnemyData, id: `enemy-${type}`, enemyType: prismaType as any };
        
        prismaService.hero.findUnique.mockResolvedValue(mockHeroData);
        prismaService.enemy.findUnique.mockResolvedValue(enemyData);
        prismaService.$transaction.mockResolvedValue([{}, {}]);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result).toEqual({ actionId: `enemy-${type}` });
        
        // Clear mocks for next iteration
        jest.clearAllMocks();
      }
    });

    it('should handle database transaction failures', async () => {
      // Arrange
      const command = new KillEnemyCommand('hero-1', 'enemy-1', EnemyType.GOBLIN);
      
      prismaService.hero.findUnique.mockResolvedValue(mockHeroData);
      prismaService.enemy.findUnique.mockResolvedValue(mockEnemyData);
      prismaService.$transaction.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Database connection failed');
    });
  });

  describe('error handling', () => {
    it('should provide meaningful error messages', async () => {
      const testCases = [
        {
          name: 'hero not found',
          heroData: null,
          enemyData: mockEnemyData,
          expectedError: 'Hero with ID hero-1 not found'
        },
        {
          name: 'enemy not found', 
          heroData: mockHeroData,
          enemyData: null,
          expectedError: 'Enemy with ID enemy-1 not found'
        },
        {
          name: 'enemy already killed',
          heroData: mockHeroData,
          enemyData: { ...mockEnemyData, killedByHeroId: 'other-hero' },
          expectedError: 'Enemy enemy-1 has already been killed'
        },
        {
          name: 'enemy type mismatch',
          heroData: mockHeroData,
          enemyData: { ...mockEnemyData, enemyType: 'DRAGON' },
          expectedError: 'Enemy enemy-1 is not of type GOBLIN'
        }
      ];

      for (const testCase of testCases) {
        const command = new KillEnemyCommand('hero-1', 'enemy-1', EnemyType.GOBLIN);
        
        prismaService.hero.findUnique.mockResolvedValue(testCase.heroData);
        prismaService.enemy.findUnique.mockResolvedValue(testCase.enemyData);

        await expect(handler.execute(command)).rejects.toThrow(testCase.expectedError);
        
        jest.clearAllMocks();
      }
    });
  });
});