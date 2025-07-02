import { PrismaClient, EnemyType } from '@prisma/client';

const prisma = new PrismaClient();

// Hero names for generation
const heroNames = [
  'Aragorn the Brave',
  'Gandalf the Wise',
  'Legolas Swiftarrow',
  'Gimli Ironbeard',
  'Frodo the Courageous',
  'Samwise the Loyal',
  'Boromir the Bold',
  'Elrond the Ancient',
  'Galadriel the Fair',
  'Thorin Oakenshield'
];

// Enemy name prefixes and suffixes
const enemyPrefixes = {
  [EnemyType.DRAGON]: ['Smaug', 'Fafnir', 'Balerion', 'Viserion', 'Drogon'],
  [EnemyType.ORC]: ['Azog', 'Bolg', 'Gorbag', 'Shagrat', 'Ugluk'],
  [EnemyType.GOBLIN]: ['Griphook', 'Boggart', 'Grishnak', 'Snaga', 'Golfimbul'],
  [EnemyType.TROLL]: ['Bert', 'Tom', 'William', 'Olog', 'Mountain']
};

const enemySuffixes = {
  [EnemyType.DRAGON]: ['the Terrible', 'the Destroyer', 'the Ancient', 'the Firebreather', 'the Mighty'],
  [EnemyType.ORC]: ['the Defiler', 'the Cruel', 'the Warrior', 'the Fierce', 'the Bloodthirsty'],
  [EnemyType.GOBLIN]: ['the Sneaky', 'the Cunning', 'the Quick', 'the Sly', 'the Treacherous'],
  [EnemyType.TROLL]: ['the Crusher', 'the Stomper', 'the Huge', 'the Brute', 'the Strong']
};

async function seed() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  await prisma.enemy.deleteMany();
  await prisma.hero.deleteMany();
  console.log('🧹 Cleared existing data');

  // Create 10 heroes
  const heroes = [] as any[];
  for (let i = 0; i < 10; i++) {
    const hero = await prisma.hero.create({
      data: {
        name: heroNames[i],
        level: Math.floor(Math.random() * 10) + 1, // Random level 1-10
        experience: Math.floor(Math.random() * 100), // Random experience 0-99
        enemiesKilledAmount: 0
      }
    });
    heroes.push(hero);
    console.log(`✅ Created hero: ${hero.name} (Level ${hero.level})`);
  }

  // Create 50 enemies (distributed among types)
  const enemyTypes = Object.values(EnemyType);
  const enemiesPerType = Math.floor(50 / enemyTypes.length);
  const extraEnemies = 50 % enemyTypes.length;

  let enemyCount = 0;
  for (const [index, type] of enemyTypes.entries()) {
    const count = enemiesPerType + (index < extraEnemies ? 1 : 0);
    
    for (let i = 0; i < count; i++) {
      const prefixes = enemyPrefixes[type];
      const suffixes = enemySuffixes[type];
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
      
      const enemy = await prisma.enemy.create({
        data: {
          name: `${prefix} ${suffix}`,
          enemyType: type,
          level: Math.floor(Math.random() * 15) + 1, // Random level 1-15
          experience: Math.floor(Math.random() * 150), // Random experience 0-149
          killedByHeroId: null // All enemies start alive
        }
      });
      enemyCount++;
      console.log(`✅ Created ${type.toLowerCase()}: ${enemy.name} (Level ${enemy.level})`);
    }
  }

  console.log('\n📊 Seed Summary:');
  console.log(`- Created ${heroes.length} heroes`);
  console.log(`- Created ${enemyCount} enemies`);
  console.log(`  - Dragons: ${enemiesPerType + (0 < extraEnemies ? 1 : 0)}`);
  console.log(`  - Orcs: ${enemiesPerType + (1 < extraEnemies ? 1 : 0)}`);
  console.log(`  - Goblins: ${enemiesPerType + (2 < extraEnemies ? 1 : 0)}`);
  console.log(`  - Trolls: ${enemiesPerType + (3 < extraEnemies ? 1 : 0)}`);
  console.log('\n✨ Database seeded successfully!');
}

seed()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });