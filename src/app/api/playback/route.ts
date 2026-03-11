import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const { audioId, position, speed, completed } = await request.json();

    if (!audioId) {
      return NextResponse.json({ error: "audioId is required" }, { status: 400 });
    }

    const state = await prisma.playbackState.upsert({
      where: {
        userId_audioId: { userId, audioId },
      },
      update: {
        position: position ?? undefined,
        speed: speed ?? undefined,
        completed: completed ?? undefined,
      },
      create: {
        userId,
        audioId,
        position: position ?? 0,
        speed: speed ?? 1.0,
        completed: completed ?? false,
      },
    });

    return NextResponse.json(state);
  } catch {
    return NextResponse.json({ error: "Failed to save playback state" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const audioId = new URL(request.url).searchParams.get("audioId");
    if (!audioId) {
      return NextResponse.json({ error: "audioId is required" }, { status: 400 });
    }

    const state = await prisma.playbackState.findUnique({
      where: {
        userId_audioId: { userId, audioId },
      },
    });

    if (!state) {
      return NextResponse.json({ position: 0, speed: 1.0, completed: false });
    }

    return NextResponse.json(state);
  } catch {
    return NextResponse.json({ error: "Failed to get playback state" }, { status: 500 });
  }
}
