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
  createdAt: string;
}

export async function GET() {
  try {
    const userId = await getCurrentUserId();

    const items = await prisma.content.findMany({
      where: { userId },
      include: {
        scripts: {
          include: {
            audio: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const library = items.map((item) => ({
      id: item.id,
      title: item.title,
      sourceType: item.sourceType,
      createdAt: item.createdAt.toISOString(),
      wordCount: item.wordCount,
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
                createdAt: script.createdAt.toISOString(),
              },
            ];
          }
          return script.audio.map((audio) => ({
            scriptId: script.id,
            audioId: audio.id,
            audioUrl: audio.filePath,
            durationSecs: audio.durationSecs,
            targetDuration: script.targetDuration,
            format: script.format,
            status: "ready" as const,
            createdAt: audio.createdAt.toISOString(),
          }));
        })
        .sort((a, b) => a.targetDuration - b.targetDuration), // shortest first
    }));

    return NextResponse.json(library);
  } catch (error) {
    return NextResponse.json({ error: "Failed to load library" }, { status: 500 });
  }
}
