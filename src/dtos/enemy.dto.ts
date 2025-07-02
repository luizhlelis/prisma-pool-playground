import { ApiProperty } from '@nestjs/swagger';
import { EnemyType } from '@models/enemy.entity';

export class EnemyDto {
  @ApiProperty({
    description: 'The UUID of the enemy',
    example: '987fcdeb-51f2-4567-890a-123456789abc',
  })
  id: string;

  @ApiProperty({
    description: 'The name of the enemy',
    example: 'Smaug the Terrible',
  })
  name: string;

  @ApiProperty({
    description: 'The current level of the enemy',
    example: 10,
    minimum: 1,
  })
  level: number;

  @ApiProperty({
    description: 'The current experience points of the enemy',
    example: 500,
    minimum: 0,
  })
  experience: number;

  @ApiProperty({
    description: 'The type of enemy',
    enum: EnemyType,
    example: EnemyType.DRAGON,
  })
  enemyType: EnemyType;

  @ApiProperty({
    description: 'The UUID of the hero who killed this enemy (null if still alive)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  killedByHeroId: string | null;

  @ApiProperty({
    description: 'The date when the enemy was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The date when the enemy was last updated',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}