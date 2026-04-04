import { describe, it, expect, vi } from "vitest";
import { GET } from "./route";

// Mock auth
vi.mock("@/lib/auth", () => ({
  getCurrentUserId: vi.fn().mockResolvedValue("user_test123"),
}));

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
    author: "Jane Doe",
    sourceType: "url",
    sourceUrl: "https://example.com/article",
    createdAt: new Date("2026-03-01"),
    wordCount: 3000,
    pipelineStatus: "idle",
    pipelineError: null,
    scripts: [
      {
        id: "s1",
        format: "narrator",
        targetDuration: 5,
        contentType: "science_article",
        themes: ["cognitive bias", "decision making"],
        compressionRatio: 0.15,
        actualWordCount: 450,
        summary: "A fascinating exploration of cognitive biases.",
        createdAt: new Date("2026-03-01"),
        audio: [
          {
            id: "a1",
            filePath: "/audio/a1.mp3",
            durationSecs: 310,
            voices: ["alloy"],
            ttsProvider: "openai",
            createdAt: new Date(),
            playbackState: [{ position: 120.5, completed: false }],
          },
        ],
      },
      {
        id: "s2",
        format: "conversation",
        targetDuration: 15,
        contentType: "science_article",
        themes: ["cognitive bias", "decision making"],
        compressionRatio: 0.15,
        actualWordCount: 450,
        summary: "A fascinating exploration of cognitive biases.",
        createdAt: new Date("2026-03-01"),
        audio: [
          {
            id: "a2",
            filePath: "/audio/a2.mp3",
            durationSecs: 920,
            voices: ["alloy", "echo"],
            ttsProvider: "openai",
            createdAt: new Date(),
            playbackState: [],
          },
        ],
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
        author: null,
        sourceType: "pdf",
        sourceUrl: null,
        createdAt: new Date(),
        wordCount: 1000,
        pipelineStatus: "idle",
        pipelineError: null,
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
        author: null,
        sourceType: "txt",
        sourceUrl: null,
        createdAt: new Date(),
        wordCount: 500,
        pipelineStatus: "idle",
        pipelineError: null,
        scripts: [],
      },
    ]);
    const res = await GET();
    const data = await res.json();
    expect(data[0].versions).toHaveLength(0);
  });

  it("includes completed and position from PlaybackState", async () => {
    mockFindMany.mockResolvedValueOnce(twoScriptItem);
    const res = await GET();
    const data = await res.json();
    // First version has playbackState with position 120.5
    expect(data[0].versions[0].completed).toBe(false);
    expect(data[0].versions[0].position).toBe(120.5);
    // Second version has empty playbackState → defaults
    expect(data[0].versions[1].completed).toBe(false);
    expect(data[0].versions[1].position).toBe(0);
  });

  it("includes author field from content", async () => {
    mockFindMany.mockResolvedValueOnce(twoScriptItem);
    const res = await GET();
    const data = await res.json();
    expect(data[0].author).toBe("Jane Doe");
  });

  it("includes sourceUrl field from content", async () => {
    mockFindMany.mockResolvedValueOnce(twoScriptItem);
    const res = await GET();
    const data = await res.json();
    expect(data[0].sourceUrl).toBe("https://example.com/article");
  });

  it("returns null author when content has no author", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: "c4",
        title: "No Author Article",
        author: null,
        sourceType: "txt",
        sourceUrl: null,
        createdAt: new Date(),
        wordCount: 800,
        pipelineStatus: "idle",
        pipelineError: null,
        scripts: [],
      },
    ]);
    const res = await GET();
    const data = await res.json();
    expect(data[0].author).toBeNull();
  });

  it("returns contentType on each version", async () => {
    mockFindMany.mockResolvedValueOnce(twoScriptItem);
    const res = await GET();
    const data = await res.json();
    expect(data[0].versions[0].contentType).toBe("science_article");
  });

  it("returns themes array on each version", async () => {
    mockFindMany.mockResolvedValueOnce(twoScriptItem);
    const res = await GET();
    const data = await res.json();
    expect(data[0].versions[0].themes).toEqual(["cognitive bias", "decision making"]);
  });

  it("returns summary on each version", async () => {
    mockFindMany.mockResolvedValueOnce(twoScriptItem);
    const res = await GET();
    const data = await res.json();
    expect(data[0].versions[0].summary).toBe("A fascinating exploration of cognitive biases.");
    expect(data[0].versions[1].summary).toBe("A fascinating exploration of cognitive biases.");
  });

  it("returns null summary when script has no summary", async () => {
    mockFindMany.mockResolvedValueOnce([{
      ...twoScriptItem[0],
      scripts: [{
        ...twoScriptItem[0].scripts[0],
        summary: null,
        audio: twoScriptItem[0].scripts[0].audio,
      }],
    }]);
    const res = await GET();
    const data = await res.json();
    expect(data[0].versions[0].summary).toBeNull();
  });

  it("returns compressionRatio and actualWordCount", async () => {
    mockFindMany.mockResolvedValueOnce(twoScriptItem);
    const res = await GET();
    const data = await res.json();
    expect(data[0].versions[0].compressionRatio).toBe(0.15);
    expect(data[0].versions[0].actualWordCount).toBe(450);
  });

  it("returns voices array and ttsProvider", async () => {
    mockFindMany.mockResolvedValueOnce(twoScriptItem);
    const res = await GET();
    const data = await res.json();
    expect(data[0].versions[0].voices).toEqual(["alloy"]);
    expect(data[0].versions[0].ttsProvider).toBe("openai");
    expect(data[0].versions[1].voices).toEqual(["alloy", "echo"]);
  });

  it("includes pipelineStatus in each library item", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: "c5",
        title: "In Progress Article",
        author: null,
        sourceType: "url",
        sourceUrl: null,
        createdAt: new Date(),
        wordCount: 2000,
        pipelineStatus: "scripting",
        pipelineError: null,
        scripts: [],
      },
    ]);
    const res = await GET();
    const data = await res.json();
    expect(data[0].pipelineStatus).toBe("scripting");
  });

  it("includes pipelineError in each library item (null when no error)", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: "c6",
        title: "Clean Article",
        author: null,
        sourceType: "url",
        sourceUrl: null,
        createdAt: new Date(),
        wordCount: 1500,
        pipelineStatus: "idle",
        pipelineError: null,
        scripts: [],
      },
    ]);
    const res = await GET();
    const data = await res.json();
    expect(data[0].pipelineError).toBeNull();
  });

  it("includes pipelineError message when set", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: "c7",
        title: "Failed Article",
        author: null,
        sourceType: "url",
        sourceUrl: null,
        createdAt: new Date(),
        wordCount: 1000,
        pipelineStatus: "error",
        pipelineError: "Claude failed",
        scripts: [],
      },
    ]);
    const res = await GET();
    const data = await res.json();
    expect(data[0].pipelineStatus).toBe("error");
    expect(data[0].pipelineError).toBe("Claude failed");
  });

  it("includes pipelineStatus for items with no scripts yet", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: "c8",
        title: "Just Uploaded",
        author: null,
        sourceType: "txt",
        sourceUrl: null,
        createdAt: new Date(),
        wordCount: 800,
        pipelineStatus: "idle",
        pipelineError: null,
        scripts: [],
      },
    ]);
    const res = await GET();
    const data = await res.json();
    expect(data[0].versions).toHaveLength(0);
    expect(data[0].pipelineStatus).toBe("idle");
  });
});
