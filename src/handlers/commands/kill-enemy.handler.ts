import {CommandHandler, ICommandHandler} from "@nestjs/cqrs";
import {KillEnemyCommand} from "@commands/kill-enemy.command";
import {HeroesRepository} from "@repositories/heroes.repo";
import {PrismaService} from "@prisma/prisma.service";
import {Hero} from "@models/hero.entity";
import {Enemy} from "@models/enemy.entity";
import {
  EnemyAlreadyKilledException,
  EnemyTypeMismatchException,
  HeroNotFoundException,
  EnemyNotFoundException
} from "@exceptions/combat.exceptions";

@CommandHandler(KillEnemyCommand)
export class KillEnemyHandler implements ICommandHandler<KillEnemyCommand> {
  constructor(
    private repository: HeroesRepository,
    private prisma: PrismaService
  ) {
  }

  async execute(command: KillEnemyCommand) {
    const {heroId, enemyId, enemyType} = command;
      
    // Fetch hero with enemies relationship and enemy data
    const [heroData, enemyData] = await Promise.all([
      this.prisma.hero.findUnique({
        where: {id: heroId},
        include: {
          enemiesKilled: true
        }
      }),
      this.prisma.enemy.findUnique({
        where: {id: enemyId}
      })
    ]);

    if (!heroData) {
      throw new HeroNotFoundException(heroId);
    }

    if (!enemyData) {
      throw new EnemyNotFoundException(enemyId);
    }

    if (enemyData.killedByHeroId) {
      throw new EnemyAlreadyKilledException(enemyId);
    }

    // Validate enemy type matches the requested type
    if (enemyData.enemyType !== enemyType) {
      throw new EnemyTypeMismatchException(enemyId, enemyType);
    }

    // Convert to domain models
    const hero = Hero.toDomain(heroData);
    const enemy = Enemy.toDomain(enemyData);

    // Execute domain logic
    const domainResult = hero.killEnemy(enemy);

    // Convert back to persistence format
    const updatedHeroData = hero.toPersistence();
    const updatedEnemyData = enemy.toPersistence();
      
    // Persist changes using a transaction
    await this.prisma.$transaction([
      // Update hero
      this.prisma.hero.update({
        where: {id: heroId},
        data: updatedHeroData
      }),
      // Update enemy
      this.prisma.enemy.update({
        where: {id: enemyId},
        data: updatedEnemyData
      })
    ]);

    return {
      actionId: enemyId,
    }
  }
}
