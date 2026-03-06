import "dotenv/config"; // load DATABASE_URL from .env before creating the Prisma client
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { fileURLToPath } from "node:url";

function createClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export async function seed(injectedPrisma?: PrismaClient) {
  const prisma = injectedPrisma ?? createClient();

  try {
    // Create default user (no auth for v1)
    const user = await prisma.user.upsert({
      where: { id: "default-user" },
      update: {},
      create: {
        id: "default-user",
        name: "Default User",
      },
    });

    console.log(`Seeded user: ${user.id}`);

    // Create sample content
    const content1 = await prisma.content.upsert({
      where: { contentHash: "seed-hash-001" },
      update: {},
      create: {
        userId: user.id,
        title: "How to Build a Second Brain",
        author: "Tiago Forte",
        rawText:
          "This is a placeholder for the full text of the book. In production this would be thousands of words extracted from the original PDF or EPUB file.",
        wordCount: 8420,
        sourceType: "epub",
        contentHash: "seed-hash-001",
      },
    });

    const content2 = await prisma.content.upsert({
      where: { contentHash: "seed-hash-002" },
      update: {},
      create: {
        userId: user.id,
        title: "Paul Graham: Do Things That Don't Scale",
        author: "Paul Graham",
        rawText:
          "This is a placeholder for the full essay. In production this would be the complete article text extracted from the URL.",
        wordCount: 4200,
        sourceType: "url",
        sourceUrl: "https://paulgraham.com/ds.html",
        contentHash: "seed-hash-002",
      },
    });

    const content3 = await prisma.content.upsert({
      where: { contentHash: "seed-hash-003" },
      update: {},
      create: {
        userId: user.id,
        title: "Stripe Annual Letter 2024",
        author: "Patrick Collison",
        rawText:
          "This is a placeholder for the full annual letter. In production this would be the complete document text.",
        wordCount: 12000,
        sourceType: "pdf",
        contentHash: "seed-hash-003",
      },
    });

    // Clean up existing scripts/audio/playback for idempotent re-seeding
    const contentIds = [content1.id, content2.id, content3.id];
    await prisma.playbackState.deleteMany({ where: { userId: user.id } });
    await prisma.audio.deleteMany({
      where: { script: { contentId: { in: contentIds } } },
    });
    await prisma.script.deleteMany({
      where: { contentId: { in: contentIds } },
    });

    // Create scripts for content
    const script1 = await prisma.script.create({
      data: {
        contentId: content1.id,
        format: "narrator",
        targetDuration: 15,
        actualWordCount: 1920,
        compressionRatio: 0.23,
        scriptText:
          "Welcome to your audio summary of How to Build a Second Brain by Tiago Forte. The core idea is simple but powerful...",
        contentType: "business_book",
        themes: ["productivity", "knowledge management", "note-taking"],
      },
    });

    const script2 = await prisma.script.create({
      data: {
        contentId: content2.id,
        format: "conversation",
        targetDuration: 8,
        actualWordCount: 1200,
        compressionRatio: 0.29,
        scriptText: `[Host A] So I just read this classic Paul Graham essay about doing things that don't scale. Have you read it?\n[Host B] Oh yeah, it's one of the most important essays for startup founders. The key insight is counterintuitive.\n[Host A] Right, he argues that in the early days you should deliberately do things that won't scale.\n[Host B] Exactly. Like Airbnb's founders personally going door to door taking photos of listings.`,
        contentType: "essay",
        themes: ["startups", "growth", "strategy"],
      },
    });

    const script3 = await prisma.script.create({
      data: {
        contentId: content3.id,
        format: "narrator",
        targetDuration: 22,
        actualWordCount: 3300,
        compressionRatio: 0.28,
        scriptText:
          "Stripe's 2024 annual letter reveals several key trends shaping the future of internet commerce...",
        contentType: "business_report",
        themes: ["fintech", "payments", "commerce"],
      },
    });

    // Create audio for completed scripts
    const audio1 = await prisma.audio.create({
      data: {
        scriptId: script1.id,
        filePath: "/audio/seed-audio-001.mp3",
        durationSecs: 768,
        voices: ["alloy"],
        ttsProvider: "openai",
      },
    });

    const audio2 = await prisma.audio.create({
      data: {
        scriptId: script2.id,
        filePath: "/audio/seed-audio-002.mp3",
        durationSecs: 495,
        voices: ["echo", "nova"],
        ttsProvider: "openai",
      },
    });

    const audio3 = await prisma.audio.create({
      data: {
        scriptId: script3.id,
        filePath: "/audio/seed-audio-003.mp3",
        durationSecs: 1350,
        voices: ["alloy"],
        ttsProvider: "openai",
      },
    });

    // Create playback state (partially listened)
    await prisma.playbackState.create({
      data: {
        userId: user.id,
        audioId: audio1.id,
        position: 318,
        speed: 1.0,
        completed: false,
      },
    });

    console.log(
      "Seeded 3 content items, 3 scripts, 3 audio records, 1 playback state."
    );
  } finally {
    if (!injectedPrisma) {
      await prisma.$disconnect();
    }
  }
}

// Run when executed directly (npx tsx prisma/seed.ts)
const isDirectExecution =
  typeof process !== "undefined" &&
  process.argv[1] &&
  process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  seed().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
