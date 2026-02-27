import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DEFAULT_USER_ID = "default-user";

export async function GET() {
  try {
    const items = await prisma.content.findMany({
      where: { userId: DEFAULT_USER_ID },
      include: {
        scripts: {
          include: {
            audio: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const library = items.map((item) => {
      const latestScript = item.scripts[item.scripts.length - 1];
      const latestAudio = latestScript?.audio[latestScript.audio.length - 1];

      return {
        id: item.id,
        title: item.title,
        sourceType: item.sourceType,
        createdAt: item.createdAt,
        status: latestAudio ? "ready" : latestScript ? "generating" : "processing",
        format: latestScript?.format ?? null,
        durationSecs: latestAudio?.durationSecs ?? null,
        audioId: latestAudio?.id ?? null,
        audioUrl: latestAudio?.filePath ?? null,
      };
    });

    return NextResponse.json(library);
  } catch (error) {
    return NextResponse.json({ error: "Failed to load library" }, { status: 500 });
  }
}
