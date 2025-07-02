import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';

export class EnemyAlreadyKilledException extends ConflictException {
  constructor(enemyId: string) {
    super(`Enemy ${enemyId} has already been killed`);
  }
}

export class EnemyTypeMismatchException extends BadRequestException {
  constructor(enemyId: string, expectedType: string) {
    super(`Enemy ${enemyId} is not of type ${expectedType}`);
  }
}

export class HeroNotFoundException extends NotFoundException {
  constructor(heroId: string) {
    super(`Hero with ID ${heroId} not found`);
  }
}

export class EnemyNotFoundException extends NotFoundException {
  constructor(enemyId: string) {
    super(`Enemy with ID ${enemyId} not found`);
  }
}