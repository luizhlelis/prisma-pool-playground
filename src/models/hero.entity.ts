import {Enemy} from '@models/enemy.entity';
import {IDomainModel} from '@models/domain-model.interface';
import {Hero as PrismaHero, Enemy as PrismaEnemy} from '@prisma/client';

export class Hero implements IDomainModel<Omit<PrismaHero, 'createdAt' | 'updatedAt' | 'enemiesKilled'>> {
  public id: string;
  public name: string;
  public level: number;
  public experience: number;
  public enemiesKilledAmount: number = 0;
  public enemiesKilled: Enemy[] = [];

  constructor(id: string, name: string, level: number = 1, experience: number = 0) {
    this.id = id;
    this.name = name;
    this.level = level;
    this.experience = experience;
  }

  public gainExperience(amount: number): boolean {
    const previousLevel = this.level;
    this.experience += amount;
    while (this.experience >= this.level * 100) {
      this.experience -= this.level * 100;
      this.level++;
    }
    return this.level > previousLevel;
  }

  public killEnemy(enemy: Enemy): { levelUp: boolean } {
    this.enemiesKilledAmount++;
    enemy.getKilledBy(this.id);
    this.enemiesKilled.push(enemy);

    // Hero gains experience from killing the enemy
    const experienceGained = enemy.level * 10;
    const levelUp = this.gainExperience(experienceGained);
    
    return { levelUp };
  }

  /**
   * Converts Prisma data to Hero domain model
   */
  static toDomain(data: PrismaHero & { enemiesKilled?: PrismaEnemy[] }): Hero {
    const hero = new Hero(
      data.id,
      data.name,
      data.level,
      data.experience
    );
    hero.enemiesKilledAmount = data.enemiesKilledAmount;

    if (data.enemiesKilled) {
      hero.enemiesKilled = data.enemiesKilled.map(enemy => Enemy.toDomain(enemy));
    }

    return hero;
  }

  /**
   * Converts Hero domain model to persistence format
   */
  toPersistence(): Omit<PrismaHero, 'createdAt' | 'updatedAt' | 'enemiesKilled'> {
    // Note: enemiesKilled is a relation field managed by Prisma through the Enemy's killedByHeroId
    // We don't update it directly - instead we update the Enemy's killedByHeroId field
    return {
      id: this.id,
      name: this.name,
      level: this.level,
      experience: this.experience,
      enemiesKilledAmount: this.enemiesKilledAmount
    };
  }
}