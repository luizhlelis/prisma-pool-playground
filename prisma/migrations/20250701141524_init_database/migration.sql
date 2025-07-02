-- CreateEnum
CREATE TYPE "EnemyType" AS ENUM ('DRAGON', 'ORC', 'GOBLIN', 'TROLL');

-- CreateTable
CREATE TABLE "Hero" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "enemiesKilledAmount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enemy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "enemyType" "EnemyType" NOT NULL,
    "killedByHeroId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enemy_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Enemy" ADD CONSTRAINT "Enemy_killedByHeroId_fkey" FOREIGN KEY ("killedByHeroId") REFERENCES "Hero"("id") ON DELETE SET NULL ON UPDATE CASCADE;
