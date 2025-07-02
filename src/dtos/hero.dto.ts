import { ApiProperty } from '@nestjs/swagger';

export class HeroDto {
  @ApiProperty({
    description: 'The UUID of the hero',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'The name of the hero',
    example: 'Aragorn the Brave',
  })
  name: string;

  @ApiProperty({
    description: 'The current level of the hero',
    example: 5,
    minimum: 1,
  })
  level: number;

  @ApiProperty({
    description: 'The current experience points of the hero',
    example: 250,
    minimum: 0,
  })
  experience: number;

  @ApiProperty({
    description: 'The total number of enemies killed by this hero',
    example: 10,
    minimum: 0,
  })
  enemiesKilledAmount: number;

  @ApiProperty({
    description: 'The date when the hero was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The date when the hero was last updated',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}