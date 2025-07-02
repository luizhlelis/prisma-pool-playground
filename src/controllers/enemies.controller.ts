import { Controller, Get, HttpStatus } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { EnemyDto } from '@dtos/enemy.dto';
import { GetAllEnemiesQuery } from '@queries/get-all-enemies.query';

@ApiTags('Enemies')
@Controller('enemies')
export class EnemiesController {
  constructor(private queryBus: QueryBus) {}

  @ApiOperation({ 
    summary: 'Get all enemies',
    description: 'Retrieves a list of all enemies in the system'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of enemies retrieved successfully',
    type: [EnemyDto],
  })
  @Get()
  async getAllEnemies(): Promise<EnemyDto[]> {
    return await this.queryBus.execute(new GetAllEnemiesQuery());
  }
}