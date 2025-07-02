import { Module } from '@nestjs/common';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { CqrsModule } from '@nestjs/cqrs/dist';
import { KillEnemyHandler } from "@handlers/commands/kill-enemy.handler";
import { GetAllHeroesHandler } from "@handlers/queries/get-all-heroes.handler";
import { GetAllEnemiesHandler } from "@handlers/queries/get-all-enemies.handler";
import { HeroesRepository } from "@repositories/heroes.repo";
import { PrismaModule } from '@prisma/prisma.module';
import { HeroesController } from '@controllers/heroes.controller';
import { EnemiesController } from '@controllers/enemies.controller';
import { CombatController } from '@controllers/combat.controller';

@Module({
  imports: [CqrsModule.forRoot(), PrismaModule],
  controllers: [
    AppController,
    HeroesController,
    EnemiesController,
    CombatController
  ],
  providers: [
    AppService,
    KillEnemyHandler,
    GetAllHeroesHandler,
    GetAllEnemiesHandler,
    HeroesRepository,
  ],
})
export class AppModule {}
