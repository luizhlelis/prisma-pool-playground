import { Controller, Get, HttpStatus } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { HeroDto } from '@dtos/hero.dto';
import { GetAllHeroesQuery } from '@queries/get-all-heroes.query';

@ApiTags('Heroes')
@Controller('heroes')
export class HeroesController {
  constructor(private queryBus: QueryBus) {}

  @ApiOperation({ 
    summary: 'Get all heroes',
    description: 'Retrieves a list of all heroes in the system'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of heroes retrieved successfully',
    type: [HeroDto],
  })
  @Get()
  async getAllHeroes(): Promise<HeroDto[]> {
    return await this.queryBus.execute(new GetAllHeroesQuery());
  }
}