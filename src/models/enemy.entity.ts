import { IDomainModel } from '@models/domain-model.interface';
import { Enemy as PrismaEnemy, EnemyType as PrismaEnemyType } from '@prisma/client';

export enum EnemyType {
  DRAGON = 'DRAGON',
  ORC = 'ORC',
  GOBLIN = 'GOBLIN',
  TROLL = 'TROLL'
}

export class Enemy implements IDomainModel<Omit<PrismaEnemy, 'createdAt' | 'updatedAt'>> {
  public id: string;
  public name: string;
  public level: number;
  public experience: number;
  public enemyType: EnemyType;
  public killedByHeroId?: string;

  constructor(
    id: string, 
    name: string, 
    enemyType: EnemyType,
    level: number = 1, 
    experience: number = 0,
    killedByHeroId?: string
  ) {
    this.id = id;
    this.name = name;
    this.enemyType = enemyType;
    this.level = level;
    this.experience = experience;
    this.killedByHeroId = killedByHeroId;
  }

  public gainExperience(amount: number): void {
    this.experience += amount;
    while (this.experience >= this.level * 100) {
      this.experience -= this.level * 100;
      this.level++;
    }
  }

  public getKilledBy(heroId: string): void {
    this.killedByHeroId = heroId;
  }

  /**
   * Converts Prisma data to Enemy domain model
   */
  static toDomain(data: PrismaEnemy): Enemy {
    return new Enemy(
      data.id,
      data.name,
      data.enemyType as EnemyType,
      data.level,
      data.experience,
      data.killedByHeroId || undefined
    );
  }

  /**
   * Converts Enemy domain model to persistence format
   */
  toPersistence(): Omit<PrismaEnemy, 'createdAt' | 'updatedAt'> {
    return {
      id: this.id,
      name: this.name,
      level: this.level,
      experience: this.experience,
      enemyType: this.enemyType as PrismaEnemyType,
      killedByHeroId: this.killedByHeroId || null
    };
  }
}