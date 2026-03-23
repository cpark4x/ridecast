import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth
vi.mock("@/lib/auth", () => ({
  getCurrentUserId: vi.fn().mockResolvedValue("user_test123"),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    playbackState: {
      upsert: vi.fn().mockImplementation((args) =>
        Promise.resolve({
          id: "ps-1",
          ...args.create,
          updatedAt: new Date(),
        })
      ),
      findUnique: vi.fn(),
    },
  },
}));

import { POST, GET } from "./route";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

describe("Playback state API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUserId).mockResolvedValue("user_test123");
    vi.mocked(prisma.playbackState.upsert).mockImplementation((args) =>
      Promise.resolve({
        id: "ps-1",
        ...args.create,
        updatedAt: new Date(),
      })
    );
  });

  it("saves playback position and speed", async () => {
    const request = new NextRequest("http://localhost:3000/api/playback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioId: "audio-1", position: 120.5, speed: 1.5 }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    expect(prisma.playbackState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_audioId: { userId: "user_test123", audioId: "audio-1" } },
        update: { position: 120.5, speed: 1.5 },
        create: expect.objectContaining({ audioId: "audio-1", position: 120.5, speed: 1.5 }),
      })
    );
  });

  it("retrieves playback state", async () => {
    (prisma.playbackState.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: "ps-1",
      position: 250,
      speed: 1.25,
      completed: false,
    });

    const request = new NextRequest("http://localhost:3000/api/playback?audioId=audio-1");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.position).toBe(250);
    expect(body.speed).toBe(1.25);
  });

  it("uses authenticated user ID (not hardcoded default-user)", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValueOnce("user_clerk_abc");

    const request = new NextRequest("http://localhost:3000/api/playback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioId: "audio-2", position: 30, speed: 1.0 }),
    });

    await POST(request);

    expect(prisma.playbackState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_audioId: { userId: "user_clerk_abc", audioId: "audio-2" } },
      })
    );
  });
});
