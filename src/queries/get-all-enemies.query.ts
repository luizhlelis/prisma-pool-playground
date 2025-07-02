import { Query } from '@nestjs/cqrs';
import { EnemyDto } from '@dtos/enemy.dto';

export class GetAllEnemiesQuery extends Query<EnemyDto[]> {
  constructor() {
    super();
  }
}