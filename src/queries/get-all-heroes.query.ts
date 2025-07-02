import { Query } from '@nestjs/cqrs';
import { HeroDto } from '@dtos/hero.dto';

export class GetAllHeroesQuery extends Query<HeroDto[]> {
  constructor() {
    super();
  }
}