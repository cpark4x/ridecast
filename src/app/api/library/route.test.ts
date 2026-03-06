import { describe, it, expect, vi } from "vitest";
import { GET } from "./route";

// vi.mock is hoisted — declare mockFindMany with vi.hoisted() so it's available in the factory
const { mockFindMany } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    content: {
      findMany: mockFindMany,
    },
  },
}));

const twoScriptItem = [
  {
    id: "c1",
    title: "Test Article",
    sourceType: "url",
    createdAt: new Date("2026-03-01"),
    wordCount: 3000,
    scripts: [
      {
        id: "s1",
        format: "narrator",
        targetDuration: 5,
        createdAt: new Date("2026-03-01"),
        audio: [{ id: "a1", filePath: "/audio/a1.mp3", durationSecs: 310, createdAt: new Date() }],
      },
      {
        id: "s2",
        format: "conversation",
        targetDuration: 15,
        createdAt: new Date("2026-03-01"),
        audio: [{ id: "a2", filePath: "/audio/a2.mp3", durationSecs: 920, createdAt: new Date() }],
      },
    ],
  },
];

describe("GET /api/library", () => {
  it("returns versions array with one entry per audio", async () => {
    mockFindMany.mockResolvedValueOnce(twoScriptItem);
    const res = await GET();
    const data = await res.json();
    expect(data[0].versions).toHaveLength(2);
    expect(data[0].versions[0].targetDuration).toBe(5); // sorted shortest first
    expect(data[0].versions[1].targetDuration).toBe(15);
  });

  it("versions contain expected fields (audioId, audioUrl, durationSecs, format, status)", async () => {
    mockFindMany.mockResolvedValueOnce(twoScriptItem);
    const res = await GET();
    const data = await res.json();
    const v = data[0].versions[0];
    expect(v.scriptId).toBe("s1");
    expect(v.audioId).toBe("a1");
    expect(v.audioUrl).toBe("/audio/a1.mp3");
    expect(v.durationSecs).toBe(310);
    expect(v.format).toBe("narrator");
    expect(v.status).toBe("ready");
  });

  it("returns status 'generating' for scripts with no audio", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: "c2",
        title: "Processing",
        sourceType: "pdf",
        createdAt: new Date(),
        wordCount: 1000,
        scripts: [
          {
            id: "s3",
            format: "narrator",
            targetDuration: 10,
            createdAt: new Date(),
            audio: [],
          },
        ],
      },
    ]);
    const res = await GET();
    const data = await res.json();
    expect(data[0].versions[0].status).toBe("generating");
    expect(data[0].versions[0].audioId).toBeNull();
    expect(data[0].versions[0].audioUrl).toBeNull();
  });

  it("returns versions:[] for items with no scripts yet", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: "c3",
        title: "Fresh Upload",
        sourceType: "txt",
        createdAt: new Date(),
        wordCount: 500,
        scripts: [],
      },
    ]);
    const res = await GET();
    const data = await res.json();
    expect(data[0].versions).toHaveLength(0);
  });
});
