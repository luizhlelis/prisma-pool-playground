import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetAllHeroesQuery } from '@queries/get-all-heroes.query';
import { PrismaService } from '@prisma/prisma.service';
import { HeroDto } from '@dtos/hero.dto';

@QueryHandler(GetAllHeroesQuery)
export class GetAllHeroesHandler implements IQueryHandler<GetAllHeroesQuery> {
  constructor(private prisma: PrismaService) {}

  async execute(query: GetAllHeroesQuery): Promise<HeroDto[]> {
    return await this.prisma.hero.findMany({
      select: {
        id: true,
        name: true,
        level: true,
        experience: true,
        enemiesKilledAmount: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { level: 'desc' },
        { enemiesKilledAmount: 'desc' },
        { name: 'asc' }
      ]
    }) as HeroDto[];
  }
}