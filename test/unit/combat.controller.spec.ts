import { Test, TestingModule } from '@nestjs/testing';
import { CombatController } from '../../src/controllers/combat.controller';
import { CommandBus } from '@nestjs/cqrs';
import { EnemyType } from '../../src/models/enemy.entity';
import { KillEnemyCommand } from '../../src/commands/kill-enemy.command';

describe('CombatController', () => {
  let controller: CombatController;
  let commandBus: jest.Mocked<CommandBus>;

  beforeEach(async () => {
    const mockCommandBus = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CombatController],
      providers: [
        {
          provide: CommandBus,
          useValue: mockCommandBus,
        },
      ],
    }).compile();

    controller = module.get<CombatController>(CombatController);
    commandBus = module.get(CommandBus) as jest.Mocked<CommandBus>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('killEnemy', () => {
    const validHeroId = '123e4567-e89b-12d3-a456-426614174000';
    const validEnemyId = '987fcdeb-51f2-4567-890a-123456789abc';
    const validEnemyType = EnemyType.DRAGON;

    it('should successfully kill an enemy', async () => {
      // Arrange
      const expectedResponse = { actionId: validEnemyId };
      commandBus.execute.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.killEnemy(validHeroId, validEnemyId, validEnemyType);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(commandBus.execute).toHaveBeenCalledWith(
        new KillEnemyCommand(validHeroId, validEnemyId, validEnemyType)
      );
      expect(commandBus.execute).toHaveBeenCalledTimes(1);
    });

    it('should handle all enemy types correctly', async () => {
      const enemyTypes = [EnemyType.DRAGON, EnemyType.ORC, EnemyType.GOBLIN, EnemyType.TROLL];

      for (const enemyType of enemyTypes) {
        // Arrange
        const expectedResponse = { actionId: validEnemyId };
        commandBus.execute.mockResolvedValue(expectedResponse);

        // Act
        const result = await controller.killEnemy(validHeroId, validEnemyId, enemyType);

        // Assert
        expect(result).toEqual(expectedResponse);
        expect(commandBus.execute).toHaveBeenCalledWith(
          new KillEnemyCommand(validHeroId, validEnemyId, enemyType)
        );

        // Clear for next iteration
        jest.clearAllMocks();
      }
    });

    it('should pass through command bus errors', async () => {
      // Arrange
      const error = new Error('Hero not found');
      commandBus.execute.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.killEnemy(validHeroId, validEnemyId, validEnemyType)
      ).rejects.toThrow('Hero not found');

      expect(commandBus.execute).toHaveBeenCalledWith(
        new KillEnemyCommand(validHeroId, validEnemyId, validEnemyType)
      );
    });

    it('should handle empty string parameters', async () => {
      // Arrange
      const expectedResponse = { actionId: '' };
      commandBus.execute.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.killEnemy('', '', validEnemyType);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(commandBus.execute).toHaveBeenCalledWith(
        new KillEnemyCommand('', '', validEnemyType)
      );
    });

    it('should create command with correct parameters', async () => {
      // Arrange
      const heroId = 'hero-123';
      const enemyId = 'enemy-456';
      const enemyType = EnemyType.TROLL;
      commandBus.execute.mockResolvedValue({ actionId: enemyId });

      // Act
      await controller.killEnemy(heroId, enemyId, enemyType);

      // Assert
      const executedCommand = commandBus.execute.mock.calls[0][0] as KillEnemyCommand;
      expect(executedCommand).toBeInstanceOf(KillEnemyCommand);
      expect(executedCommand.heroId).toBe(heroId);
      expect(executedCommand.enemyId).toBe(enemyId);
      expect(executedCommand.enemyType).toBe(enemyType);
    });

    it('should handle async command execution', async () => {
      // Arrange
      const expectedResponse = { actionId: validEnemyId };
      commandBus.execute.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(expectedResponse), 100))
      );

      // Act
      const startTime = Date.now();
      const result = await controller.killEnemy(validHeroId, validEnemyId, validEnemyType);
      const endTime = Date.now();

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });

    it('should handle command bus returning different response formats', async () => {
      const testCases = [
        { actionId: validEnemyId },
        { actionId: 'different-id' },
        { actionId: 'uuid-format-id-123e4567-e89b-12d3-a456-426614174000' },
      ];

      for (const testCase of testCases) {
        // Arrange
        commandBus.execute.mockResolvedValue(testCase);

        // Act
        const result = await controller.killEnemy(validHeroId, validEnemyId, validEnemyType);

        // Assert
        expect(result).toEqual(testCase);

        // Clear for next iteration
        jest.clearAllMocks();
      }
    });
  });

  describe('parameter validation', () => {
    it('should accept valid UUID formats', async () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        '00000000-0000-0000-0000-000000000000',
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      ];

      for (const uuid of validUUIDs) {
        // Arrange
        commandBus.execute.mockResolvedValue({ actionId: uuid });

        // Act
        const result = await controller.killEnemy(uuid, uuid, EnemyType.GOBLIN);

        // Assert
        expect(result).toEqual({ actionId: uuid });
        expect(commandBus.execute).toHaveBeenCalledWith(
          new KillEnemyCommand(uuid, uuid, EnemyType.GOBLIN)
        );

        // Clear for next iteration
        jest.clearAllMocks();
      }
    });

    it('should handle special characters in IDs gracefully', async () => {
      // Note: This tests the controller's behavior, actual validation would be done by pipes
      const specialIds = [
        'hero-with-dashes',
        'hero_with_underscores',
        'hero123',
        'HERO_UPPERCASE',
      ];

      for (const specialId of specialIds) {
        // Arrange
        commandBus.execute.mockResolvedValue({ actionId: specialId });

        // Act
        const result = await controller.killEnemy(specialId, specialId, EnemyType.ORC);

        // Assert
        expect(result).toEqual({ actionId: specialId });

        // Clear for next iteration
        jest.clearAllMocks();
      }
    });
  });

  describe('error scenarios', () => {
    const testErrorCases = [
      {
        name: 'hero not found',
        error: new Error('Hero with ID hero-1 not found'),
        expectedMessage: 'Hero with ID hero-1 not found'
      },
      {
        name: 'enemy not found',
        error: new Error('Enemy with ID enemy-1 not found'),
        expectedMessage: 'Enemy with ID enemy-1 not found'
      },
      {
        name: 'enemy already killed',
        error: new Error('Enemy enemy-1 has already been killed'),
        expectedMessage: 'Enemy enemy-1 has already been killed'
      },
      {
        name: 'enemy type mismatch',
        error: new Error('Enemy enemy-1 is not of type DRAGON'),
        expectedMessage: 'Enemy enemy-1 is not of type DRAGON'
      },
      {
        name: 'database error',
        error: new Error('Database connection failed'),
        expectedMessage: 'Database connection failed'
      },
    ];

    testErrorCases.forEach(({ name, error, expectedMessage }) => {
      it(`should handle ${name} error`, async () => {
        // Arrange
        commandBus.execute.mockRejectedValue(error);

        // Act & Assert
        await expect(
          controller.killEnemy('hero-1', 'enemy-1', EnemyType.DRAGON)
        ).rejects.toThrow(expectedMessage);

        expect(commandBus.execute).toHaveBeenCalledWith(
          new KillEnemyCommand('hero-1', 'enemy-1', EnemyType.DRAGON)
        );
      });
    });

    it('should handle timeout errors', async () => {
      // Arrange
      commandBus.execute.mockRejectedValue(new Error('Request timeout'));

      // Act & Assert
      await expect(
        controller.killEnemy('hero-1', 'enemy-1', EnemyType.GOBLIN)
      ).rejects.toThrow('Request timeout');
    });

    it('should handle unexpected errors', async () => {
      // Arrange
      commandBus.execute.mockRejectedValue(new Error('Unexpected error occurred'));

      // Act & Assert
      await expect(
        controller.killEnemy('hero-1', 'enemy-1', EnemyType.TROLL)
      ).rejects.toThrow('Unexpected error occurred');
    });
  });

  describe('performance', () => {
    it('should execute within reasonable time', async () => {
      // Arrange
      commandBus.execute.mockResolvedValue({ actionId: 'enemy-1' });

      // Act
      const startTime = Date.now();
      await controller.killEnemy('hero-1', 'enemy-1', EnemyType.DRAGON);
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent requests', async () => {
      // Arrange
      const requests = Array.from({ length: 10 }, (_, i) => ({
        heroId: `hero-${i}`,
        enemyId: `enemy-${i}`,
        enemyType: EnemyType.GOBLIN,
        expectedResponse: { actionId: `enemy-${i}` }
      }));

      requests.forEach(req => {
        commandBus.execute.mockResolvedValueOnce(req.expectedResponse);
      });

      // Act
      const promises = requests.map(req =>
        controller.killEnemy(req.heroId, req.enemyId, req.enemyType)
      );
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result).toEqual(requests[index].expectedResponse);
      });
      expect(commandBus.execute).toHaveBeenCalledTimes(10);
    });
  });
});