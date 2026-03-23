import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LibraryScreen } from "./LibraryScreen";

const mockPlay = vi.fn();

vi.mock("./PlayerContext", () => ({
  usePlayer: () => ({ play: mockPlay, currentItem: null }),
}));

vi.mock("@/lib/ui/content-display", () => ({
  gradients: ["from-a to-b", "from-c to-d", "from-e to-f", "from-g to-h"],
  getGradient: (i: number) => ["from-a to-b", "from-c to-d"][i % 2],
  sourceIcons: {
    pdf: "M14 2H6",
    url: "M12 2a10",
    epub: "M4 19.5",
    txt: "M14 2H6",
  },
  timeAgo: () => "2h ago",
  getTitleFallback: (title: string) => title || "fallback.com",
}));

vi.mock("@/lib/utils/duration", () => ({
  formatDuration: (s: number) => `${Math.floor(s / 60)} min`,
}));

/* ---------- Fixtures ---------- */

const UNPLAYED_ITEM = {
  id: "c1",
  title: "Sapiens",
  author: "Yuval Harari",
  sourceType: "pdf",
  sourceUrl: null,
  createdAt: "2026-03-10T12:00:00Z",
  wordCount: 5000,
  versions: [
    {
      scriptId: "s1",
      audioId: "a1",
      audioUrl: "/audio/a1.mp3",
      durationSecs: 900,
      targetDuration: 15,
      format: "narrator",
      status: "ready",
      completed: false,
      position: 0,
      createdAt: "2026-03-10T12:00:00Z",
    },
  ],
};

const IN_PROGRESS_ITEM = {
  id: "c2",
  title: "Deep Work",
  author: "Cal Newport",
  sourceType: "epub",
  sourceUrl: null,
  createdAt: "2026-03-09T12:00:00Z",
  wordCount: 3000,
  versions: [
    {
      scriptId: "s2",
      audioId: "a2",
      audioUrl: "/audio/a2.mp3",
      durationSecs: 600,
      targetDuration: 10,
      format: "conversation",
      status: "ready",
      completed: false,
      position: 300,
      createdAt: "2026-03-09T12:00:00Z",
    },
  ],
};

const COMPLETED_ITEM = {
  id: "c3",
  title: "Atomic Habits",
  author: "James Clear",
  sourceType: "url",
  sourceUrl: "https://example.com/article",
  createdAt: "2026-03-08T12:00:00Z",
  wordCount: 2000,
  versions: [
    {
      scriptId: "s3",
      audioId: "a3",
      audioUrl: "/audio/a3.mp3",
      durationSecs: 300,
      targetDuration: 5,
      format: "narrator",
      status: "ready",
      completed: true,
      position: 300,
      createdAt: "2026-03-08T12:00:00Z",
    },
  ],
};

const GENERATING_ITEM = {
  id: "c4",
  title: "The Algorithm",
  author: null,
  sourceType: "txt",
  sourceUrl: null,
  createdAt: "2026-03-11T12:00:00Z",
  wordCount: 1500,
  versions: [
    {
      scriptId: "s4",
      audioId: null,
      audioUrl: null,
      durationSecs: null,
      targetDuration: 5,
      format: "narrator",
      status: "generating",
      completed: false,
      position: 0,
      createdAt: "2026-03-11T12:00:00Z",
    },
  ],
};

const MULTI_VERSION_ITEM = {
  id: "c5",
  title: "Thinking Fast and Slow",
  author: "Daniel Kahneman",
  sourceType: "pdf",
  sourceUrl: null,
  createdAt: "2026-03-07T12:00:00Z",
  wordCount: 8000,
  versions: [
    {
      scriptId: "s5a",
      audioId: "a5a",
      audioUrl: "/audio/a5a.mp3",
      durationSecs: 310,
      targetDuration: 5,
      format: "narrator",
      status: "ready",
      completed: false,
      position: 150,
      createdAt: "2026-03-07T12:00:00Z",
    },
    {
      scriptId: "s5b",
      audioId: "a5b",
      audioUrl: "/audio/a5b.mp3",
      durationSecs: 920,
      targetDuration: 15,
      format: "conversation",
      status: "ready",
      completed: false,
      position: 0,
      createdAt: "2026-03-07T13:00:00Z",
    },
  ],
};

const ALL_ITEMS = [
  UNPLAYED_ITEM,
  IN_PROGRESS_ITEM,
  COMPLETED_ITEM,
  GENERATING_ITEM,
  MULTI_VERSION_ITEM,
];

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockClear();
  mockPlay.mockClear();
});

function mockLibraryResponse(items: unknown[]) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => items,
  });
}

/* ---------- Tests ---------- */

describe("LibraryScreen — loading state", () => {
  it("shows loading text before fetch resolves", () => {
    mockFetch.mockReturnValueOnce(new Promise(() => {}));
    render(<LibraryScreen visible={true} />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});

describe("LibraryScreen — item rendering", () => {
  it("shows all item titles after loading", async () => {
    mockLibraryResponse(ALL_ITEMS);
    render(<LibraryScreen visible={true} />);
    await waitFor(() =>
      expect(screen.getAllByTestId("library-item")).toHaveLength(5),
    );
    expect(screen.getByText("Sapiens")).toBeInTheDocument();
    expect(screen.getByText("Deep Work")).toBeInTheDocument();
    expect(screen.getByText("Atomic Habits")).toBeInTheDocument();
    expect(screen.getByText("The Algorithm")).toBeInTheDocument();
    expect(screen.getByText("Thinking Fast and Slow")).toBeInTheDocument();
  });

  it("shows author name in subtitle when present", async () => {
    mockLibraryResponse([UNPLAYED_ITEM]);
    render(<LibraryScreen visible={true} />);
    await waitFor(() =>
      expect(screen.getByText("Yuval Harari")).toBeInTheDocument(),
    );
  });

  it("does not show 'By null' when author is null", async () => {
    mockLibraryResponse([GENERATING_ITEM]);
    render(<LibraryScreen visible={true} />);
    await waitFor(() =>
      expect(screen.getByText("The Algorithm")).toBeInTheDocument(),
    );
    expect(screen.queryByText("null")).not.toBeInTheDocument();
  });

  it("shows 'Generating' badge for items still processing", async () => {
    mockLibraryResponse([GENERATING_ITEM]);
    render(<LibraryScreen visible={true} />);
    await waitFor(() =>
      expect(screen.getByTestId("library-item")).toBeInTheDocument(),
    );
    // "Generating" appears both as a filter chip and as a badge — check badge (span)
    const badges = screen.getAllByText("Generating");
    const badgeSpan = badges.find((el) => el.tagName === "SPAN");
    expect(badgeSpan).toBeDefined();
  });

  it("shows version count badge for multi-version items", async () => {
    mockLibraryResponse([MULTI_VERSION_ITEM]);
    render(<LibraryScreen visible={true} />);
    await waitFor(() =>
      expect(screen.getByText("2 versions")).toBeInTheDocument(),
    );
  });
});

describe("LibraryScreen — played state", () => {
  it("shows 'Played' badge for completed items", async () => {
    mockLibraryResponse([COMPLETED_ITEM]);
    render(<LibraryScreen visible={true} />);
    await waitFor(() =>
      expect(screen.getByText(/Played/)).toBeInTheDocument(),
    );
  });
});

describe("LibraryScreen — search", () => {
  it("renders a search input with placeholder /search/i", async () => {
    mockLibraryResponse(ALL_ITEMS);
    render(<LibraryScreen visible={true} />);
    await waitFor(() =>
      expect(screen.getAllByTestId("library-item")).toHaveLength(5),
    );
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it("filters by title after debounce", async () => {
    mockLibraryResponse(ALL_ITEMS);
    render(<LibraryScreen visible={true} />);
    await waitFor(() =>
      expect(screen.getAllByTestId("library-item")).toHaveLength(5),
    );

    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "sapiens" },
    });

    await waitFor(() =>
      expect(screen.getAllByTestId("library-item")).toHaveLength(1),
    );
    expect(screen.getByText("Sapiens")).toBeInTheDocument();
  });

  it("shows 'No results' empty state when search has no matches", async () => {
    mockLibraryResponse(ALL_ITEMS);
    render(<LibraryScreen visible={true} />);
    await waitFor(() =>
      expect(screen.getAllByTestId("library-item")).toHaveLength(5),
    );

    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "nonexistent" },
    });

    await waitFor(() =>
      expect(screen.getByText(/No results/i)).toBeInTheDocument(),
    );
  });
});

describe("LibraryScreen — filter chips", () => {
  it("renders 5 filter chips: All, Unplayed, In Progress, Completed, Generating", async () => {
    mockLibraryResponse(ALL_ITEMS);
    render(<LibraryScreen visible={true} />);
    await waitFor(() =>
      expect(screen.getAllByTestId("library-item")).toHaveLength(5),
    );
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Unplayed" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "In Progress" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Completed" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Generating" }),
    ).toBeInTheDocument();
  });

  it("'All' chip is active by default", async () => {
    mockLibraryResponse(ALL_ITEMS);
    render(<LibraryScreen visible={true} />);
    await waitFor(() =>
      expect(screen.getAllByTestId("library-item")).toHaveLength(5),
    );
    const allChip = screen.getByRole("button", { name: "All" });
    expect(allChip.className).toMatch(/from-\[#EA580C\]/);
  });

  it("'Completed' chip filters to completed items only", async () => {
    mockLibraryResponse(ALL_ITEMS);
    render(<LibraryScreen visible={true} />);
    await waitFor(() =>
      expect(screen.getAllByTestId("library-item")).toHaveLength(5),
    );

    fireEvent.click(screen.getByRole("button", { name: "Completed" }));

    await waitFor(() =>
      expect(screen.getAllByTestId("library-item")).toHaveLength(1),
    );
    expect(screen.getByText("Atomic Habits")).toBeInTheDocument();
  });

  it("'Generating' chip filters to generating items only", async () => {
    mockLibraryResponse(ALL_ITEMS);
    render(<LibraryScreen visible={true} />);
    await waitFor(() =>
      expect(screen.getAllByTestId("library-item")).toHaveLength(5),
    );

    fireEvent.click(screen.getByRole("button", { name: "Generating" }));

    await waitFor(() =>
      expect(screen.getAllByTestId("library-item")).toHaveLength(1),
    );
    expect(screen.getByText("The Algorithm")).toBeInTheDocument();
  });

  it("shows 'No completed content' when completed filter matches nothing", async () => {
    mockLibraryResponse([UNPLAYED_ITEM, GENERATING_ITEM]);
    render(<LibraryScreen visible={true} />);
    await waitFor(() =>
      expect(screen.getAllByTestId("library-item")).toHaveLength(2),
    );

    fireEvent.click(screen.getByRole("button", { name: "Completed" }));

    await waitFor(() =>
      expect(screen.getByText("No completed content")).toBeInTheDocument(),
    );
  });
});

describe("LibraryScreen — expand/collapse", () => {
  it("clicking multi-version card expands to show version rows", async () => {
    mockLibraryResponse([MULTI_VERSION_ITEM]);
    render(<LibraryScreen visible={true} />);
    await waitFor(() =>
      expect(screen.getByTestId("library-item")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId("library-item"));

    expect(screen.getAllByLabelText("Play")).toHaveLength(2);
    expect(screen.getByText("+ Process new version")).toBeInTheDocument();
  });

  it("clicking expanded card collapses it", async () => {
    mockLibraryResponse([MULTI_VERSION_ITEM]);
    render(<LibraryScreen visible={true} />);
    await waitFor(() =>
      expect(screen.getByTestId("library-item")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId("library-item")); // expand
    expect(screen.getAllByLabelText("Play")).toHaveLength(2);

    fireEvent.click(screen.getByTestId("library-item")); // collapse
    expect(screen.queryAllByLabelText("Play")).toHaveLength(0);
  });

  it("expanded view shows '+ Process new version' link", async () => {
    mockLibraryResponse([MULTI_VERSION_ITEM]);
    render(<LibraryScreen visible={true} />);
    await waitFor(() =>
      expect(screen.getByTestId("library-item")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId("library-item"));

    expect(screen.getByText("+ Process new version")).toBeInTheDocument();
  });

  it("clicking '+ Process new version' opens ProcessNewVersionModal", async () => {
    mockLibraryResponse([MULTI_VERSION_ITEM]);
    render(<LibraryScreen visible={true} />);
    await waitFor(() =>
      expect(screen.getByTestId("library-item")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId("library-item")); // expand
    fireEvent.click(screen.getByText("+ Process new version"));

    // Real ProcessNewVersionModal renders "New Version" heading
    expect(screen.getByText("New Version")).toBeInTheDocument();
  });
});

describe("LibraryScreen — play behavior", () => {
  it("clicking single-version ready card calls play()", async () => {
    mockLibraryResponse([UNPLAYED_ITEM]);
    render(<LibraryScreen visible={true} />);
    await waitFor(() =>
      expect(screen.getByTestId("library-item")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId("library-item"));

    expect(mockPlay).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a1", title: "Sapiens" }),
    );
  });

  it("clicking version row play button calls play() with that version", async () => {
    mockLibraryResponse([MULTI_VERSION_ITEM]);
    render(<LibraryScreen visible={true} />);
    await waitFor(() =>
      expect(screen.getByTestId("library-item")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId("library-item")); // expand

    const playButtons = screen.getAllByLabelText("Play");
    fireEvent.click(playButtons[0]);

    expect(mockPlay).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a5a" }),
    );
  });
});

describe("LibraryScreen — empty states", () => {
  it("shows 'Your library is empty' when no items", async () => {
    mockLibraryResponse([]);
    render(<LibraryScreen visible={true} />);
    await waitFor(() =>
      expect(screen.getByText("Your library is empty")).toBeInTheDocument(),
    );
  });

  it("does not fetch when visible=false", () => {
    render(<LibraryScreen visible={false} />);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("LibraryScreen — defensive rendering", () => {
  it("renders without crashing when item.versions is null", async () => {
    mockLibraryResponse([
      {
        id: "c1",
        title: "Broken API Item",
        sourceType: "url",
        author: null,
        sourceUrl: null,
        createdAt: new Date().toISOString(),
        wordCount: 500,
        versions: null,
      },
    ]);
    render(<LibraryScreen visible={true} />);
    await waitFor(() =>
      expect(screen.getByTestId("library-item")).toBeInTheDocument(),
    );
    expect(screen.getByText("Processing")).toBeInTheDocument();
  });

  it("renders without crashing when item.versions is undefined", async () => {
    mockLibraryResponse([
      {
        id: "c2",
        title: "Undefined Versions Item",
        sourceType: "pdf",
        author: null,
        sourceUrl: null,
        createdAt: new Date().toISOString(),
        wordCount: 300,
      },
    ]);
    render(<LibraryScreen visible={true} />);
    await waitFor(() =>
      expect(screen.getByTestId("library-item")).toBeInTheDocument(),
    );
    expect(screen.getByText("Processing")).toBeInTheDocument();
  });
});
