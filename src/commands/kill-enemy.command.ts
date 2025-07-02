import {Command} from "@nestjs/cqrs";
import {EnemyType} from "@models/enemy.entity";

export class KillEnemyCommand extends Command<{ actionId: string }> {
  constructor(
    public readonly heroId: string,
    public readonly enemyId: string,
    public readonly enemyType: EnemyType,
  ) {
    super();
  }
}
