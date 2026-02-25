import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

function createClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export async function seed(injectedPrisma?: PrismaClient) {
  const prisma = injectedPrisma ?? createClient();

  try {
    // 1. Upsert default user
    const user = await prisma.user.upsert({
      where: { id: 'default-user' },
      update: { name: 'Default User' },
      create: { id: 'default-user', name: 'Default User' },
    });
    console.log(`Seeded user: ${user.id}`);

    // 2. Upsert 3 content items (using contentHash for uniqueness)
    const content1 = await prisma.content.upsert({
      where: { contentHash: 'hash-second-brain' },
      update: {},
      create: {
        userId: user.id,
        title: 'How to Build a Second Brain',
        author: 'Tiago Forte',
        rawText: 'Sample raw text for How to Build a Second Brain...',
        wordCount: 8420,
        sourceType: 'epub',
        contentHash: 'hash-second-brain',
      },
    });

    const content2 = await prisma.content.upsert({
      where: { contentHash: 'hash-paul-graham-dttds' },
      update: {},
      create: {
        userId: user.id,
        title: "Paul Graham: Do Things That Don't Scale",
        author: 'Paul Graham',
        rawText: "Sample raw text for Do Things That Don't Scale...",
        wordCount: 4200,
        sourceType: 'url',
        sourceUrl: 'https://paulgraham.com/ds.html',
        contentHash: 'hash-paul-graham-dttds',
      },
    });

    const content3 = await prisma.content.upsert({
      where: { contentHash: 'hash-stripe-annual-2024' },
      update: {},
      create: {
        userId: user.id,
        title: 'Stripe Annual Letter 2024',
        author: 'Patrick Collison',
        rawText: 'Sample raw text for Stripe Annual Letter 2024...',
        wordCount: 12000,
        sourceType: 'pdf',
        contentHash: 'hash-stripe-annual-2024',
      },
    });

    console.log(`Seeded 3 content items: ${content1.title}, ${content2.title}, ${content3.title}`);

    // 3. Create scripts (delete existing first for idempotency, then recreate)
    // Clean up existing scripts/audio/playback for these content items
    await prisma.playbackState.deleteMany({ where: { userId: user.id } });
    await prisma.audio.deleteMany({
      where: { script: { contentId: { in: [content1.id, content2.id, content3.id] } } },
    });
    await prisma.script.deleteMany({
      where: { contentId: { in: [content1.id, content2.id, content3.id] } },
    });

    const script1 = await prisma.script.create({
      data: {
        contentId: content1.id,
        format: 'narrator',
        targetDuration: 15,
        actualWordCount: 1920,
        compressionRatio: 0.23,
        scriptText: 'Sample narrator script for How to Build a Second Brain...',
        themes: ['productivity', 'knowledge-management'],
      },
    });

    const script2 = await prisma.script.create({
      data: {
        contentId: content2.id,
        format: 'conversation',
        targetDuration: 8,
        actualWordCount: 1200,
        compressionRatio: 0.29,
        scriptText: "Sample conversation script for Do Things That Don't Scale...",
        themes: ['startups', 'growth'],
      },
    });

    const script3 = await prisma.script.create({
      data: {
        contentId: content3.id,
        format: 'narrator',
        targetDuration: 22,
        actualWordCount: 3300,
        compressionRatio: 0.28,
        scriptText: 'Sample narrator script for Stripe Annual Letter 2024...',
        themes: ['fintech', 'business'],
      },
    });

    // 4. Create audio records
    const audio1 = await prisma.audio.create({
      data: {
        scriptId: script1.id,
        filePath: '/audio/second-brain-narrator.mp3',
        durationSecs: 768,
        voices: ['alloy'],
        ttsProvider: 'openai',
      },
    });

    await prisma.audio.create({
      data: {
        scriptId: script2.id,
        filePath: '/audio/paul-graham-dttds-conversation.mp3',
        durationSecs: 495,
        voices: ['alloy', 'echo'],
        ttsProvider: 'openai',
      },
    });

    await prisma.audio.create({
      data: {
        scriptId: script3.id,
        filePath: '/audio/stripe-annual-2024-narrator.mp3',
        durationSecs: 1350,
        voices: ['nova'],
        ttsProvider: 'openai',
      },
    });

    // 5. Create playback state (partially listened)
    await prisma.playbackState.create({
      data: {
        userId: user.id,
        audioId: audio1.id,
        position: 318,
        speed: 1.0,
        completed: false,
      },
    });

    console.log('Seeded 3 scripts, 3 audio records, 1 playback state');
  } finally {
    if (!injectedPrisma) {
      await prisma.$disconnect();
    }
  }
}

// Run when executed directly (npx tsx prisma/seed.ts)
const isDirectExecution =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('/seed.ts') || process.argv[1].endsWith('/seed'));

if (isDirectExecution) {
  seed().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}