import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { LibraryScreen } from "./LibraryScreen";

vi.mock("./PlayerContext", () => ({
  usePlayer: () => ({ play: vi.fn() }),
}));

vi.mock("@/lib/utils/duration", () => ({
  formatDuration: (s: number) => `${Math.floor(s / 60)} min`,
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => mockFetch.mockClear());

describe("LibraryScreen", () => {
  it("renders without crashing when item.versions is null", async () => {
    // Simulates the post-schema-migration API shape where versions can be null
    const itemsWithNullVersions = [
      {
        id: "c1",
        title: "Broken API Item",
        sourceType: "url",
        createdAt: new Date().toISOString(),
        wordCount: 500,
        versions: null, // <-- the bad API shape
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => itemsWithNullVersions,
    });

    render(<LibraryScreen visible={true} />);

    // If item.versions is not guarded the component crashes here and the
    // library-item card never appears in the DOM.
    await waitFor(() =>
      expect(screen.getByTestId("library-item")).toBeInTheDocument()
    );

    // With versions coerced to [], the item should show "Processing" status
    expect(screen.getByText("Processing")).toBeInTheDocument();
  });

  it("renders without crashing when item.versions is undefined", async () => {
    const itemsWithUndefinedVersions = [
      {
        id: "c2",
        title: "Undefined Versions Item",
        sourceType: "pdf",
        createdAt: new Date().toISOString(),
        wordCount: 300,
        // versions key omitted — arrives as undefined at runtime
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => itemsWithUndefinedVersions,
    });

    render(<LibraryScreen visible={true} />);

    await waitFor(() =>
      expect(screen.getByTestId("library-item")).toBeInTheDocument()
    );
    expect(screen.getByText("Processing")).toBeInTheDocument();
  });

  it("renders normally when item.versions is a valid array", async () => {
    const items = [
      {
        id: "c3",
        title: "Good Article",
        sourceType: "pdf",
        createdAt: new Date().toISOString(),
        wordCount: 800,
        versions: [
          {
            scriptId: "s1",
            audioId: "a1",
            audioUrl: "/audio/a1.mp3",
            durationSecs: 900,
            targetDuration: 15,
            format: "narrator",
            status: "ready",
            createdAt: new Date().toISOString(),
          },
        ],
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => items,
    });

    render(<LibraryScreen visible={true} />);

    await waitFor(() =>
      expect(screen.getByTestId("library-item")).toBeInTheDocument()
    );
    expect(screen.getByText("Good Article")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });
});
