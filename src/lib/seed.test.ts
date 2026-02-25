import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from './db';

// Seed IDs used in the seed script - must match seed.ts
const DEFAULT_USER_ID = 'default-user';

describe('Seed script', () => {
  beforeAll(async () => {
    // Clean up any existing seed data in reverse dependency order
    await prisma.playbackState.deleteMany({ where: { userId: DEFAULT_USER_ID } });
    await prisma.audio.deleteMany({
      where: { script: { content: { userId: DEFAULT_USER_ID } } },
    });
    await prisma.script.deleteMany({
      where: { content: { userId: DEFAULT_USER_ID } },
    });
    await prisma.content.deleteMany({ where: { userId: DEFAULT_USER_ID } });
    await prisma.user.deleteMany({ where: { id: DEFAULT_USER_ID } });

    // Run the seed function
    const { seed } = await import('../../prisma/seed');
    await seed();
  });

  afterAll(async () => {
    // Clean up seed data
    await prisma.playbackState.deleteMany({ where: { userId: DEFAULT_USER_ID } });
    await prisma.audio.deleteMany({
      where: { script: { content: { userId: DEFAULT_USER_ID } } },
    });
    await prisma.script.deleteMany({
      where: { content: { userId: DEFAULT_USER_ID } },
    });
    await prisma.content.deleteMany({ where: { userId: DEFAULT_USER_ID } });
    await prisma.user.deleteMany({ where: { id: DEFAULT_USER_ID } });
    await prisma.$disconnect();
  });

  it('creates 1 default user with id "default-user"', async () => {
    const user = await prisma.user.findUnique({ where: { id: DEFAULT_USER_ID } });
    expect(user).not.toBeNull();
    expect(user!.id).toBe(DEFAULT_USER_ID);
    expect(user!.name).toBeDefined();
  });

  it('creates 3 content items', async () => {
    const contents = await prisma.content.findMany({
      where: { userId: DEFAULT_USER_ID },
      orderBy: { title: 'asc' },
    });
    expect(contents).toHaveLength(3);

    // Verify specific content items
    const titles = contents.map((c) => c.title);
    expect(titles).toContain('How to Build a Second Brain');
    expect(titles).toContain('Paul Graham: Do Things That Don\'t Scale');
    expect(titles).toContain('Stripe Annual Letter 2024');

    // Verify source types and word counts
    const brain = contents.find((c) => c.title === 'How to Build a Second Brain')!;
    expect(brain.sourceType).toBe('epub');
    expect(brain.wordCount).toBe(8420);

    const pg = contents.find((c) => c.title.includes('Paul Graham'))!;
    expect(pg.sourceType).toBe('url');
    expect(pg.wordCount).toBe(4200);

    const stripe = contents.find((c) => c.title.includes('Stripe'))!;
    expect(stripe.sourceType).toBe('pdf');
    expect(stripe.wordCount).toBe(12000);
  });

  it('creates 3 scripts with correct formats and metrics', async () => {
    const scripts = await prisma.script.findMany({
      where: { content: { userId: DEFAULT_USER_ID } },
      include: { content: true },
    });
    expect(scripts).toHaveLength(3);

    // Script for content1 (Second Brain): narrator, 15min, 1920 words, 0.23 ratio
    const s1 = scripts.find((s) => s.content.title === 'How to Build a Second Brain')!;
    expect(s1.format).toBe('narrator');
    expect(s1.targetDuration).toBe(15);
    expect(s1.actualWordCount).toBe(1920);
    expect(s1.compressionRatio).toBeCloseTo(0.23, 2);

    // Script for content2 (Paul Graham): conversation, 8min, 1200 words, 0.29 ratio
    const s2 = scripts.find((s) => s.content.title.includes('Paul Graham'))!;
    expect(s2.format).toBe('conversation');
    expect(s2.targetDuration).toBe(8);
    expect(s2.actualWordCount).toBe(1200);
    expect(s2.compressionRatio).toBeCloseTo(0.29, 2);

    // Script for content3 (Stripe): narrator, 22min, 3300 words, 0.28 ratio
    const s3 = scripts.find((s) => s.content.title.includes('Stripe'))!;
    expect(s3.format).toBe('narrator');
    expect(s3.targetDuration).toBe(22);
    expect(s3.actualWordCount).toBe(3300);
    expect(s3.compressionRatio).toBeCloseTo(0.28, 2);
  });

  it('creates 3 audio records with file paths, durations, and voices', async () => {
    const audios = await prisma.audio.findMany({
      where: { script: { content: { userId: DEFAULT_USER_ID } } },
      include: { script: { include: { content: true } } },
    });
    expect(audios).toHaveLength(3);

    const a1 = audios.find((a) => a.script.content.title === 'How to Build a Second Brain')!;
    expect(a1.durationSecs).toBe(768);
    expect(a1.filePath).toBeDefined();
    expect(a1.voices.length).toBeGreaterThan(0);

    const a2 = audios.find((a) => a.script.content.title.includes('Paul Graham'))!;
    expect(a2.durationSecs).toBe(495);

    const a3 = audios.find((a) => a.script.content.title.includes('Stripe'))!;
    expect(a3.durationSecs).toBe(1350);
  });

  it('creates 1 playback state (partially listened, position 318)', async () => {
    const states = await prisma.playbackState.findMany({
      where: { userId: DEFAULT_USER_ID },
    });
    expect(states).toHaveLength(1);
    expect(states[0].position).toBe(318);
    expect(states[0].completed).toBe(false);
  });

  it('is idempotent (running seed twice produces same counts)', async () => {
    // Run seed again
    const { seed } = await import('../../prisma/seed');
    await seed();

    // Should still have the same counts
    const userCount = await prisma.user.count({ where: { id: DEFAULT_USER_ID } });
    const contentCount = await prisma.content.count({ where: { userId: DEFAULT_USER_ID } });

    expect(userCount).toBe(1);
    expect(contentCount).toBe(3);
  });
});