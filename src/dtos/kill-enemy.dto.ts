import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsEnum } from 'class-validator';
import { EnemyType } from '@models/enemy.entity';

export class KillEnemyDto {
  @ApiProperty({
    description: 'The UUID of the hero performing the kill',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  heroId: string;

  @ApiProperty({
    description: 'The UUID of the enemy to be killed',
    example: '987fcdeb-51f2-4567-890a-123456789abc',
  })
  @IsUUID()
  enemyId: string;

  @ApiProperty({
    description: 'The type of enemy being killed',
    enum: EnemyType,
    example: EnemyType.DRAGON,
  })
  @IsEnum(EnemyType)
  enemyType: EnemyType;
}

export class KillEnemyResponseDto {
  @ApiProperty({
    description: 'The UUID of the killed enemy',
    example: '987fcdeb-51f2-4567-890a-123456789abc',
  })
  actionId: string;
}