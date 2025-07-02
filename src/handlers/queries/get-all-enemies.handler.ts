import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetAllEnemiesQuery } from '@queries/get-all-enemies.query';
import { PrismaService } from '@prisma/prisma.service';
import { EnemyDto } from '@dtos/enemy.dto';

@QueryHandler(GetAllEnemiesQuery)
export class GetAllEnemiesHandler implements IQueryHandler<GetAllEnemiesQuery> {
  constructor(private prisma: PrismaService) {}

  async execute(query: GetAllEnemiesQuery): Promise<EnemyDto[]> {
    return await this.prisma.enemy.findMany({
      select: {
        id: true,
        name: true,
        level: true,
        experience: true,
        enemyType: true,
        killedByHeroId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { enemyType: 'asc' },
        { level: 'desc' },
        { name: 'asc' }
      ]
    }) as EnemyDto[];
  }
}