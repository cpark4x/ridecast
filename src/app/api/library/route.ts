import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

interface AudioVersion {
  scriptId: string;
  audioId: string | null;
  audioUrl: string | null;
  durationSecs: number | null;
  targetDuration: number;
  format: string;
  status: "ready" | "generating" | "processing";
  completed: boolean;
  position: number;
  createdAt: string;
  summary: string | null;
  contentType: string | null;
  themes: string[];
  compressionRatio: number;
  actualWordCount: number;
  voices: string[];
  ttsProvider: string;
}

export async function GET() {
  try {
    const userId = await getCurrentUserId();

    const items = await prisma.content.findMany({
      where: { userId },
      include: {
        scripts: {
          include: {
            audio: {
              include: {
                playbackState: {
                  where: { userId },
                  take: 1,
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const library = items.map((item) => ({
      id: item.id,
      title: item.title,
      author: item.author ?? null,
      sourceType: item.sourceType,
      sourceUrl: item.sourceUrl ?? null,
      createdAt: item.createdAt.toISOString(),
      wordCount: item.wordCount,
      pipelineStatus: item.pipelineStatus,
      pipelineError: item.pipelineError ?? null,
      versions: item.scripts
        .flatMap((script): AudioVersion[] => {
          if (script.audio.length === 0) {
            // Script exists but no audio yet
            return [
              {
                scriptId: script.id,
                audioId: null,
                audioUrl: null,
                durationSecs: null,
                targetDuration: script.targetDuration,
                format: script.format,
                status: "generating",
                completed: false,
                position: 0,
                createdAt: script.createdAt.toISOString(),
                summary: script.summary ?? null,
                contentType: script.contentType ?? null,
                themes: script.themes ?? [],
                compressionRatio: script.compressionRatio,
                actualWordCount: script.actualWordCount,
                voices: [],
                ttsProvider: "",
              },
            ];
          }
          return script.audio.map((audio) => {
            const pb = audio.playbackState?.[0];
            return {
              scriptId: script.id,
              audioId: audio.id,
              audioUrl: audio.filePath,
              durationSecs: audio.durationSecs,
              targetDuration: script.targetDuration,
              format: script.format,
              status: "ready" as const,
              completed: pb?.completed ?? false,
              position: pb?.position ?? 0,
              createdAt: audio.createdAt.toISOString(),
              summary: script.summary ?? null,
              contentType: script.contentType ?? null,
              themes: script.themes ?? [],
              compressionRatio: script.compressionRatio,
              actualWordCount: script.actualWordCount,
              voices: audio.voices ?? [],
              ttsProvider: audio.ttsProvider,
            };
          });
        })
        .sort((a, b) => a.targetDuration - b.targetDuration), // shortest first
    }));

    return NextResponse.json(library);
  } catch {
    return NextResponse.json({ error: "Failed to load library" }, { status: 500 });
  }
}
