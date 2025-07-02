import {Controller, Param, HttpStatus, HttpCode, Put, HttpException, InternalServerErrorException} from '@nestjs/common';
import {CommandBus} from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import {KillEnemyCommand} from '@commands/kill-enemy.command';
import {KillEnemyResponseDto} from '@dtos/kill-enemy.dto';
import {EnemyType} from '@models/enemy.entity';

@ApiTags('Combat')
@Controller('combat')
export class CombatController {
  constructor(private commandBus: CommandBus) {
  }

  // RESTful approach with route parameters
  @ApiOperation({
    summary: 'Hero kills an enemy',
    description: 'Allows a hero to kill a specific enemy, gaining experience in the process'
  })
  @ApiParam({
    name: 'heroId',
    description: 'The UUID of the hero performing the kill',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'enemyId',
    description: 'The UUID of the enemy to be killed',
    example: '987fcdeb-51f2-4567-890a-123456789abc',
  })
  @ApiParam({
    name: 'enemyType',
    description: 'The type of enemy being killed',
    enum: EnemyType,
    example: EnemyType.DRAGON,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Enemy successfully killed',
    type: KillEnemyResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Hero or Enemy not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Enemy type mismatch',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Enemy already killed',
  })
  @HttpCode(HttpStatus.OK)
  @Put('heroes/:heroId/kill/:enemyType/:enemyId')
  async killEnemy(
    @Param('heroId') heroId: string,
    @Param('enemyId') enemyId: string,
    @Param('enemyType') enemyType: EnemyType,
  ): Promise<KillEnemyResponseDto> {
    try {
      return await this.commandBus.execute(
        new KillEnemyCommand(heroId, enemyId, enemyType)
      );
    } catch (error) {
      // Re-throw HTTP exceptions as-is
      if (error instanceof HttpException) {
        throw error;
      }
      // For any other errors, wrap in Internal Server Error
      throw new InternalServerErrorException(
        'An unexpected error occurred during combat'
      );
    }
  }
}