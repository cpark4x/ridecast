import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

interface BatchStateInput {
  audioId: string;
  position: number;
  speed: number;
  completed: boolean;
  updatedAt: string;
}

/**
 * POST /api/playback/batch
 *
 * Accepts an array of local playback states and upserts each one using
 * server-wins-if-newer semantics: if the server already has a more recent
 * record for a given audioId, that state is left untouched.
 *
 * This collapses what was previously N+1 individual GET + POST calls from the
 * native client (one per episode) into a single round-trip.
 *
 * Body:   { states: BatchStateInput[] }
 * Response: { synced: number }   — count of records actually written
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const body = (await request.json()) as { states: BatchStateInput[] };
    const { states } = body;

    if (!Array.isArray(states) || states.length === 0) {
      return NextResponse.json({ synced: 0 });
    }

    // Fetch all existing server records for this user in one query so we can
    // apply server-wins-if-newer without a per-state round-trip.
    const audioIds = states.map((s) => s.audioId).filter(Boolean);
    const existing = await prisma.playbackState.findMany({
      where: { userId, audioId: { in: audioIds } },
      select: { audioId: true, updatedAt: true },
    });
    const serverTimes = new Map(
      existing.map((r) => [r.audioId, r.updatedAt.getTime()]),
    );

    let synced = 0;

    for (const state of states) {
      const { audioId, position, speed, completed, updatedAt } = state;
      if (!audioId) continue;

      // Server-wins-if-newer: skip this state if the server already has a
      // more recent record for this audioId.
      const serverTime = serverTimes.get(audioId);
      if (serverTime !== undefined) {
        const clientTime = new Date(updatedAt).getTime();
        if (serverTime > clientTime) continue;
      }

      // Replicate the same upsert pattern used by the single-state endpoint.
      await prisma.playbackState.upsert({
        where: { userId_audioId: { userId, audioId } },
        update: { position, speed, completed },
        create: { userId, audioId, position, speed, completed },
      });

      synced++;
    }

    return NextResponse.json({ synced });
  } catch {
    return NextResponse.json(
      { error: "Failed to batch sync playback" },
      { status: 500 },
    );
  }
}
