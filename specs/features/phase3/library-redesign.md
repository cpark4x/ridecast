> **Design reference:** `docs/mockups/archive/library-view.html`
> **Depends on:** home-screen-api ✓, home-screen-nav-restructure ✓, home-screen-content-display-utils ✓ (all completed session 10)

# Library Screen Redesign — Dev-Machine Spec

## Motivation

Turn the bare content list into a full management experience: search bar (200ms debounce), filter chips (All / Unplayed / In Progress / Completed / Generating), progress bars on cards from PlaybackState, played/dimmed state, author display, "Process new version" to regenerate a different duration cut, and Upload as a FAB modal (wired by home-screen-nav-restructure). Builds directly on completed prerequisites.

---

## Files Summary

**Create:**

| File | Purpose |
|---|---|
| `src/hooks/useLibraryFilter.ts` | Search + filter hook |
| `src/hooks/__tests__/useLibraryFilter.test.ts` | Filter hook tests |
| `src/lib/ui/library-progress.ts` | Progress calculation utilities |
| `src/lib/ui/__tests__/library-progress.test.ts` | Progress utility tests |
| `src/components/UploadModal.tsx` | Bottom sheet upload modal |
| `src/components/UploadModal.test.tsx` | UploadModal tests |
| `src/components/ProcessNewVersionModal.tsx` | Duration picker for re-processing |
| `src/components/ProcessNewVersionModal.test.tsx` | ProcessNewVersionModal tests |

**Rewrite / Modify:**

| File | Purpose |
|---|---|
| `src/components/LibraryScreen.tsx` | Complete rewrite |
| `src/components/LibraryScreen.test.tsx` | Complete rewrite of tests |
| `src/components/AppShell.tsx` | Use `<UploadModal>` instead of inline upload JSX |

---

## Table of Contents

1. [Task 1: Search and filter hook](#task-1-search-and-filter-hook)
2. [Task 2: Progress calculation utilities](#task-2-progress-calculation-utilities)
3. [Task 3: Card enhancement — author display and rich play()](#task-3-card-enhancement--author-display-and-rich-play)
4. [Task 4: UploadModal component](#task-4-uploadmodal-component)
5. [Task 5: Process new version modal](#task-5-process-new-version-modal)
6. [Task 6: LibraryScreen rewrite](#task-6-libraryscreen-rewrite)
7. [Task 7: Build verification](#task-7-build-verification)

---

## Task 1: Search and filter hook

**Feature ID:** `library-search-filter`
**depends_on:** `["home-screen-api"]` (completed ✓)

**Why:** Encapsulate search (200ms debounce, case-insensitive, title + author) and chip filter (AND composition) in a testable hook.

**Files:** `src/hooks/useLibraryFilter.ts` (create), `src/hooks/__tests__/useLibraryFilter.test.ts` (create)

### Tests

```typescript
// Fixtures: UNPLAYED (position:0, !completed), IN_PROGRESS (position:120, !completed),
//           COMPLETED (completed:true), GENERATING (status:"generating")
// ALL_ITEMS = [UNPLAYED, IN_PROGRESS, COMPLETED, GENERATING]
// beforeEach: vi.useFakeTimers(); afterEach: vi.useRealTimers()

describe("useLibraryFilter — initial state", () => {
  it("returns all 4 items by default");
  it("defaults query to ''");
  it("defaults activeFilter to 'all'");
});

describe("useLibraryFilter — search", () => {
  it("filters by title substring after 200ms debounce", () => {
    // setQuery("psychology") → before 200ms: still 4; after 200ms: 1 (id:"c1")
  });
  it("is case-insensitive");
  it("returns [] when no match");
  it("filters by author substring");
  it("items with null author still match on title");
  it("does NOT filter before 200ms");
});

describe("useLibraryFilter — filter chips", () => {
  it("'unplayed': items where all versions have position=0 and !completed");
  it("'in-progress': at least one version with position>0 and !completed");
  it("'completed': at least one version with completed=true");
  it("'generating': at least one version with status='generating'");
  it("'all': shows everything");
});

describe("useLibraryFilter — composed AND logic", () => {
  it("applies search AND chip filter together", () => {
    // 2 completed items; setFilter("completed") + setQuery("kleppmann") + 200ms → 1 result
  });
});
```

### Implementation

```typescript
import { useState, useEffect, useMemo } from "react";

export type FilterChip = "all" | "unplayed" | "in-progress" | "completed" | "generating";

interface FilterableItem {
  id: string; title: string; author?: string | null;
  versions: { status: string; completed: boolean; position: number; }[];
}

export function useLibraryFilter<T extends FilterableItem>(items: T[]) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterChip>("all");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  const filtered = useMemo(() => {
    let result = items;
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase();
      result = result.filter(i =>
        i.title.toLowerCase().includes(q) || (i.author?.toLowerCase().includes(q) ?? false)
      );
    }
    if (activeFilter !== "all") {
      result = result.filter(item => {
        const vs = item.versions ?? [];
        switch (activeFilter) {
          case "unplayed":    return vs.every(v => v.position === 0 && !v.completed);
          case "in-progress": return vs.some(v => v.position > 0 && !v.completed);
          case "completed":   return vs.some(v => v.completed);
          case "generating":  return vs.some(v => v.status === "generating");
          default: return true;
        }
      });
    }
    return result;
  }, [items, debouncedQuery, activeFilter]);

  return { query, setQuery, activeFilter, setActiveFilter, filtered };
}
```

### Commit
```bash
git add src/hooks/useLibraryFilter.ts src/hooks/__tests__/useLibraryFilter.test.ts
git commit -m "feat(library): add useLibraryFilter hook — search (200ms debounce) + chip filter (All/Unplayed/InProgress/Completed/Generating)"
```

---

## Task 2: Progress calculation utilities

**Feature ID:** `library-progress-display`
**depends_on:** `["home-screen-api", "home-screen-content-display-utils"]` (both completed ✓)

**Why:** Card-level and per-version progress calculation should be pure, independently testable utilities — not inline component logic.

**Files:** `src/lib/ui/library-progress.ts` (create), `src/lib/ui/__tests__/library-progress.test.ts` (create)

### Tests

```typescript
// Fixtures: UNLISTENED (position:0, !completed, dur:600), PARTIAL (position:300, dur:600),
//           COMPLETED_V (position:600, completed:true), NO_DURATION (audioId:null, durationSecs:null)

describe("getMostListenedVersion", () => {
  it("returns version with highest position/duration ratio");
  it("returns only version in single-item array");
  it("returns null for empty array");
  it("skips versions with null durationSecs");
  it("returns null when all versions have null duration");
});

describe("getCardProgress", () => {
  it("returns 0 when all have position=0");
  it("returns ~0.5 for PARTIAL as most-listened");
  it("returns 1.0 when a version is completed");
  it("returns 0 for empty array");
  it("returns 0 when only generating versions exist");
  it("is capped at 1.0 even if position exceeds duration");
});

describe("getVersionProgress", () => {
  it("returns 0 for unlistened");  it("returns ~0.5 for halfway");
  it("returns 1.0 for completed"); it("returns 0 when durationSecs null");
});

describe("isItemPlayed", () => {
  it("returns true when at least one version is completed");
  it("returns false when none completed");
  it("returns false for empty array");
});
```

### Implementation

```typescript
interface ProgressVersion {
  audioId: string | null; durationSecs: number | null;
  position: number; completed: boolean; status: string;
}

export function getMostListenedVersion<T extends ProgressVersion>(versions: T[]): T | null {
  let best: T | null = null, bestRatio = -1;
  for (const v of versions) {
    if (!v.durationSecs || v.durationSecs <= 0) continue;
    const ratio = Math.min(1, v.position / v.durationSecs);
    if (ratio > bestRatio) { bestRatio = ratio; best = v; }
  }
  return best;
}

export function getCardProgress(versions: ProgressVersion[]): number {
  const v = getMostListenedVersion(versions);
  if (!v || !v.durationSecs || v.durationSecs <= 0) return 0;
  return Math.min(1, v.position / v.durationSecs);
}

export function getVersionProgress(v: ProgressVersion): number {
  if (!v.durationSecs || v.durationSecs <= 0) return 0;
  return Math.min(1, v.position / v.durationSecs);
}

export function isItemPlayed(versions: ProgressVersion[]): boolean {
  return versions.some(v => v.completed);
}
```

### Commit
```bash
git add src/lib/ui/library-progress.ts src/lib/ui/__tests__/library-progress.test.ts
git commit -m "feat(library): add library-progress utilities — getMostListenedVersion, getCardProgress, getVersionProgress, isItemPlayed"
```

---

## Task 3: Card enhancement — author display and rich play()

**Feature ID:** `library-card-enhancement`
**depends_on:** `["home-screen-api", "home-screen-content-display-utils"]` (both completed ✓)

**Why:** Define the data contract for LibraryScreen↔play(). Update interfaces and handlePlay to pass rich PlayableItem fields (needed by ExpandedPlayer). Add author to card subtitle.

**Files:** `src/components/LibraryScreen.tsx`, `src/components/LibraryScreen.test.tsx`

### Tests — add at end of existing test suite

```typescript
describe("LibraryScreen — author display", () => {
  // fetch returns [{ id:"c1", title:"Thinking Fast", author:"Daniel Kahneman", ... },
  //               { id:"c2", title:"A PDF", author:null, ... }]
  it("shows author name in subtitle when present", async () => {
    // expect /Daniel Kahneman/ in document
  });
  it("does not show 'By null' when author absent", async () => {
    // queryByText(/By null/) → not in document
  });
});
```

### Implementation

**Update `LibraryItem` interface:**
```typescript
interface LibraryItem {
  id: string; title: string; author: string | null;
  sourceType: string; sourceUrl: string | null;
  createdAt: string; wordCount: number; versions: AudioVersion[];
}
```

**Update `AudioVersion` interface** to add `completed: boolean; position: number`.

**Update card subtitle row:**
```tsx
<div className="text-xs text-[var(--text-mid)] flex items-center gap-2 flex-wrap">
  {item.author && <><span>{item.author}</span><span>&middot;</span></>}
  <span className="uppercase">{item.sourceType}</span>
  <span>&middot;</span><span>{timeAgo(item.createdAt)}</span>
</div>
```

**Update `handlePlay`** to pass rich fields:
```typescript
  play({
    id: version.audioId, audioUrl: version.audioUrl,
    title: item.title || (item.sourceUrl ? new URL(item.sourceUrl).hostname.replace(/^www\./, "") : item.sourceType.toUpperCase()),
    duration: version.durationSecs ?? 0, format: version.format ?? "narrator",
    author: item.author ?? null, sourceType: item.sourceType, sourceUrl: item.sourceUrl ?? null,
    targetDuration: version.targetDuration, wordCount: item.wordCount,
  });
```

### Commit
```bash
git add src/components/LibraryScreen.tsx src/components/LibraryScreen.test.tsx
git commit -m "feat(library): add author display to cards, extend handlePlay with rich PlayableItem fields"
```

---

## Task 4: UploadModal component

**Feature ID:** `library-upload-modal`
**depends_on:** `["home-screen-nav-restructure"]` (completed ✓)

**Why:** Extract the inline upload modal JSX from AppShell into a reusable `UploadModal` component. AppShell keeps `showUploadModal` state; this task just extracts the presentation layer.

**Files:** `src/components/UploadModal.tsx` (create), `src/components/UploadModal.test.tsx` (create), `src/components/AppShell.tsx` (modify)

### Tests

```typescript
// vi.mock("./UploadScreen") with stub that renders "Upload Form Content" and a "Generate Audio" button

describe("UploadModal", () => {
  it("renders nothing when isOpen=false");
  it("renders 'Add Content' heading when isOpen=true");
  it("renders UploadScreen form content inside modal");
  it("calls onClose when X button clicked");     // aria-label /close/i
  it("calls onClose when backdrop clicked");      // data-testid="upload-modal-backdrop"
  it("calls onProcess(contentId, mins) when form submits");
  it("has a drag handle at top");                 // data-testid="drag-handle"
});
```

### Implementation

```tsx
"use client";
import { UploadScreen } from "./UploadScreen";

interface UploadModalProps {
  isOpen: boolean; onClose: () => void;
  onProcess: (contentId: string, targetMinutes: number) => void;
  onImportPocket: () => void;
}

export function UploadModal({ isOpen, onClose, onProcess, onImportPocket }: UploadModalProps) {
  if (!isOpen) return null;
  return (
    <div className="absolute inset-0 z-[60] flex flex-col">
      <div data-testid="upload-modal-backdrop" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative mt-auto bg-[var(--bg)] rounded-t-[20px] max-h-[90%] overflow-y-auto">
        <div data-testid="drag-handle" className="w-10 h-1 bg-black/20 rounded-full mx-auto mt-3 mb-1" />
        <div className="flex items-center justify-between px-5 py-3">
          <h2 className="text-lg font-bold">Add Content</h2>
          <button onClick={onClose} aria-label="Close upload modal"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--surface-2)] active:scale-90">
            {/* X SVG: M18 6L6 18M6 6l12 12 */}
          </button>
        </div>
        <UploadScreen onProcess={onProcess} onImportPocket={onImportPocket} />
      </div>
    </div>
  );
}
```

**Update AppShell.tsx:** add `import { UploadModal } from "./UploadModal"`, then replace the inline `{showUploadModal && (<div>...)</div>)}` block with:
```tsx
<UploadModal
  isOpen={showUploadModal}
  onClose={() => setShowUploadModal(false)}
  onProcess={handleProcess}
  onImportPocket={() => { setShowUploadModal(false); setActiveTab("pocket-import"); }}
/>
```

### Commit
```bash
git add src/components/UploadModal.tsx src/components/UploadModal.test.tsx src/components/AppShell.tsx
git commit -m "feat(library): extract UploadModal component from AppShell — bottom sheet, drag handle, backdrop dismiss"
```

---

## Task 5: Process new version modal

**Feature ID:** `library-process-new-version`
**depends_on:** `["library-upload-modal"]`

**Why:** Let users regenerate a different duration cut from an existing Content record — reuses `/api/process` without re-uploading.

**Files:** `src/components/ProcessNewVersionModal.tsx` (create), `src/components/ProcessNewVersionModal.test.tsx` (create)

### Tests

```typescript
// Props: isOpen, contentId:"content-abc", contentTitle:"Psychology...", onClose, onVersionCreated
// beforeEach: vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ok:true, json:async()=>({scriptId:"new-1"})}))

describe("ProcessNewVersionModal", () => {
  it("renders nothing when isOpen=false");
  it("shows content title");
  it("shows preset buttons: 2, 3, 5, 15, 30 min");
  it("shows Generate button");
  it("has 5 min selected by default", () => {
    // getByRole("button", {name:/5 min/i}).className matches /accent/i
  });
  it("changes selected preset on click");
  it("POSTs to /api/process with contentId and targetMinutes on Generate", async () => {
    // select 15 min, click Generate → fetch("/api/process", {method:"POST", body: JSON containing contentId:"content-abc", targetMinutes:15})
  });
  it("calls onVersionCreated after successful API call");
  it("calls onClose when X button clicked");
  it("shows 'Generating…' loading state while fetch pending");
});
```

### Implementation

```tsx
"use client";
import { useState } from "react";

const PRESETS = [
  { minutes: 2, label: "Quick Take" }, { minutes: 3, label: "Brief" },
  { minutes: 5, label: "Summary" }, { minutes: 15, label: "Main Points" },
  { minutes: 30, label: "Deep Dive" },
];

export function ProcessNewVersionModal({ isOpen, contentId, contentTitle, onClose, onVersionCreated }) {
  const [selectedMinutes, setSelectedMinutes] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleGenerate() {
    setIsGenerating(true); setError(null);
    try {
      const res = await fetch("/api/process", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId, targetMinutes: selectedMinutes }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed");
      onVersionCreated(); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong"); }
    finally { setIsGenerating(false); }
  }

  return (
    <div className="absolute inset-0 z-[70] flex flex-col">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative mt-auto bg-[var(--bg)] rounded-t-[20px] pb-8">
        {/* drag handle, header with "New Version" + close button */}
        {/* content title display (read-only) */}
        {/* preset buttons: aria-label="{n} min", selected gets accent bg */}
        {/* error display */}
        <button onClick={handleGenerate} disabled={isGenerating}
          className="w-full py-3.5 rounded-[14px] bg-gradient-to-br from-[#EA580C] to-[#F97316] text-white font-semibold text-sm disabled:opacity-60">
          {isGenerating ? "Generating…" : `Generate ${selectedMinutes}-min Version`}
        </button>
      </div>
    </div>
  );
}
```

### Commit
```bash
git add src/components/ProcessNewVersionModal.tsx src/components/ProcessNewVersionModal.test.tsx
git commit -m "feat(library): add ProcessNewVersionModal — duration preset picker, calls /api/process, onVersionCreated callback"
```

---

## Task 6: LibraryScreen rewrite

**Feature ID:** `library-screen-rewrite`
**depends_on:** `["library-search-filter", "library-progress-display", "library-card-enhancement", "library-upload-modal", "library-process-new-version"]`

**Why:** Full assembly of all library pieces: search bar, filter chips, per-card progress bars, played/dimmed state, expanded version list with per-version progress, "Process new version", empty states.

**Files:** `src/components/LibraryScreen.tsx` (rewrite), `src/components/LibraryScreen.test.tsx` (rewrite)

### Tests — replace entire LibraryScreen.test.tsx

```tsx
// Mocks: content-display (gradients, getGradient, sourceIcons, timeAgo, getTitleFallback)
// Mock UploadModal and ProcessNewVersionModal as simple stubs:
//   UploadModal: isOpen ? <div data-testid="upload-modal">...</div> : null
//   ProcessNewVersionModal: isOpen ? <div data-testid="process-modal">...</div> : null
// Mock usePlayer → { play: mockPlay, currentItem:null, ... }
// Fixtures: UNPLAYED_ITEM, IN_PROGRESS_ITEM, COMPLETED_ITEM, GENERATING_ITEM, MULTI_VERSION_ITEM
//   All have: id, title, author (or null), sourceType, sourceUrl, createdAt, wordCount, versions[]

describe("LibraryScreen — loading state", () => {
  it("shows loading spinner before fetch resolves");
});

describe("LibraryScreen — item rendering", () => {
  it("shows all item titles after loading");
  it("shows author name in subtitle when present");
  it("does not show 'By null' when author is null");
  it("shows 'Generating' badge for items still processing");
  it("shows version count badge for multi-version items"); // "2 versions"
});

describe("LibraryScreen — played state", () => {
  it("shows 'Played' badge for completed items");
});

describe("LibraryScreen — search", () => {
  it("renders a search input with placeholder /search/i");
  it("filters by title after debounce (vi.useFakeTimers)", () => {
    // type "sapiens" + 200ms → only Sapiens visible
  });
  it("shows 'No results' empty state when search has no matches");
});

describe("LibraryScreen — filter chips", () => {
  it("renders 5 filter chips: All, Unplayed, In Progress, Completed, Generating");
  it("'All' chip is active by default");
  it("'Completed' chip filters to completed items only");
  it("'Generating' chip filters to generating items only");
  it("shows 'No completed content' when completed filter matches nothing");
});

describe("LibraryScreen — expand/collapse", () => {
  it("clicking multi-version card expands to show version rows (5 min, 15 min)");
  it("clicking expanded card collapses it");
  it("expanded view shows '+ Process new version' link");
  it("clicking '+ Process new version' opens ProcessNewVersionModal");
});

describe("LibraryScreen — play behavior", () => {
  it("clicking single-version ready card calls play()", () => {
    // expect mockPlay called with objectContaining({ id: "a1" })
  });
  it("clicking version row play button calls play() with that version");
});

describe("LibraryScreen — empty states", () => {
  it("shows 'Your library is empty' when no items");
  it("does not fetch when visible=false");
});
```

### Implementation — replace entire LibraryScreen.tsx

```tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { formatDuration } from "@/lib/utils/duration";
import { usePlayer } from "./PlayerContext";
import { getGradient, sourceIcons, timeAgo, getTitleFallback } from "@/lib/ui/content-display";
import { getCardProgress, getVersionProgress, isItemPlayed } from "@/lib/ui/library-progress";
import { useLibraryFilter, FilterChip } from "@/hooks/useLibraryFilter";
import { ProcessNewVersionModal } from "./ProcessNewVersionModal";

// Interfaces: AudioVersion (with completed, position, optional expanded-player fields),
//             LibraryItem (with author, sourceUrl), LibraryScreenProps { visible?: boolean }

const CHIPS: { id: FilterChip; label: string }[] = [
  { id: "all", label: "All" }, { id: "unplayed", label: "Unplayed" },
  { id: "in-progress", label: "In Progress" }, { id: "completed", label: "Completed" },
  { id: "generating", label: "Generating" },
];

const FILTER_EMPTY: Record<FilterChip, string> = {
  all: "Your library is empty", unplayed: "No unplayed content",
  "in-progress": "Nothing in progress", completed: "No completed content",
  generating: "Nothing generating",
};

export function LibraryScreen({ visible }: LibraryScreenProps) {
  const [items, setItems] = useState<LibraryItem[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processModalContentId, setProcessModalContentId] = useState<string | null>(null);
  const [processModalTitle, setProcessModalTitle] = useState("");
  const { play } = usePlayer();
  const { query, setQuery, activeFilter, setActiveFilter, filtered } = useLibraryFilter(items ?? []);

  const loadLibrary = useCallback(async () => {
    try { const r = await fetch("/api/library"); setItems(await r.json()); }
    catch { setItems([]); }
  }, []);

  useEffect(() => { if (visible) loadLibrary(); }, [visible, loadLibrary]);

  if (items === null) return <div className="p-6 pt-16 text-center">Loading...</div>;

  const isEmpty = filtered.length === 0;
  const emptyMsg = query.trim() ? `No results for "${query}"` : FILTER_EMPTY[activeFilter];

  function handlePlay(item: LibraryItem, version: AudioVersion) {
    if (version.status !== "ready" || !version.audioUrl || !version.audioId) return;
    play({
      id: version.audioId,
      title: getTitleFallback(item.title, item.sourceUrl, item.sourceType, item.createdAt),
      duration: version.durationSecs ?? 0, format: version.format ?? "narrator",
      audioUrl: version.audioUrl,
      author: item.author ?? null, sourceType: item.sourceType, sourceUrl: item.sourceUrl ?? null,
      targetDuration: version.targetDuration, wordCount: item.wordCount,
      summary: version.summary ?? null, contentType: version.contentType ?? null,
      themes: version.themes ?? [], compressionRatio: version.compressionRatio,
      voices: version.voices ?? [], ttsProvider: version.ttsProvider ?? null,
      createdAt: version.createdAt,
    });
  }

  function handleCardTap(item: LibraryItem) {
    const hasMultiple = item.versions.length > 1;
    if (hasMultiple) { setExpandedId(expandedId === item.id ? null : item.id); }
    else {
      const pv = item.versions.find(v => v.status === "ready") ?? item.versions[0];
      if (pv) handlePlay(item, pv);
    }
  }

  return (
    <div className="p-5 pb-32">
      {/* Header: "Library" h1 + item count */}
      {/* Search bar: input placeholder="Search by title or author…", onChange setQuery */}
      {/* Filter chips: map CHIPS, active gets accent bg, onClick setActiveFilter */}

      {isEmpty ? (
        <div className="text-center py-16">
          {/* headphone icon */}
          <p className="text-base font-semibold">{emptyMsg}</p>
          {activeFilter === "all" && !query && (
            <p className="text-sm text-[var(--text-mid)]">Tap the <strong>+</strong> button to add content.</p>
          )}
        </div>
      ) : (
        <div>
          {filtered.map((item, i) => {
            const isExpanded = expandedId === item.id;
            const played = isItemPlayed(item.versions);
            const cardProgress = getCardProgress(item.versions);
            const gradient = getGradient(i);
            const displayTitle = getTitleFallback(item.title, item.sourceUrl, item.sourceType, item.createdAt);
            const primaryVersion = item.versions.find(v => v.status === "ready") ?? item.versions[0];

            return (
              <div key={item.id} className="mb-2.5">
                {/* Main card: data-testid="library-item", onClick handleCardTap */}
                <div data-testid="library-item" onClick={() => handleCardTap(item)}
                  className={`flex items-center gap-3.5 p-4 rounded-[14px] bg-[var(--surface)] border border-black/[0.07] cursor-pointer active:scale-[0.98] ${played ? "opacity-70" : ""} relative overflow-hidden`}>
                  {/* Gradient thumbnail: getGradient(i), sourceIcons[sourceType] */}
                  <div className={`w-[52px] h-[52px] rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
                    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white opacity-85">
                      <path d={sourceIcons[item.sourceType] ?? sourceIcons.txt} />
                    </svg>
                  </div>
                  {/* Content info: displayTitle, author·sourceType·timeAgo subtitle */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate mb-0.5">{displayTitle}</div>
                    <div className="text-xs text-[var(--text-mid)] flex items-center gap-1.5 flex-wrap">
                      {item.author && <><span>{item.author}</span><span>&middot;</span></>}
                      <span className="uppercase">{item.sourceType}</span>
                      <span>&middot;</span><span>{timeAgo(item.createdAt)}</span>
                    </div>
                  </div>
                  {/* Status badges: Played (green), Generating (amber pulse), Ready/N versions, duration */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {played ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--green-dim)] text-[var(--green)]">
                        ✓ Played
                      </span>
                    ) : primaryVersion?.status === "generating" ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--amber-dim)] text-[var(--amber)]">
                        Generating
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--green-dim)] text-[var(--green)]">
                        {item.versions.length > 1 ? `${item.versions.length} versions` : "Ready"}
                      </span>
                    )}
                  </div>
                  {/* Card-level progress bar at bottom edge when cardProgress > 0 */}
                  {cardProgress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/[0.05] rounded-b-[14px]">
                      <div className="h-full rounded-b-[14px] bg-gradient-to-r from-[var(--accent)] to-[#F97316]"
                        style={{ width: `${cardProgress * 100}%` }} />
                    </div>
                  )}
                </div>

                {/* Expanded version rows */}
                {isExpanded && (
                  <div className="mt-1 ml-4 border-l-2 border-[var(--accent)]/20 pl-3">
                    {item.versions.map(version => {
                      const vPct = Math.round(getVersionProgress(version) * 100);
                      return (
                        <div key={version.scriptId}
                          className={`flex items-center gap-3 p-3 mb-1 rounded-[10px] ${version.status === "ready" ? "bg-[var(--surface)] cursor-pointer" : "bg-[var(--surface-2)] opacity-60"}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[12px] font-semibold">{version.targetDuration} min</span>
                              {version.durationSecs && <span className="text-[11px] text-[var(--text-dim)]">{formatDuration(version.durationSecs)}</span>}
                              {version.completed && <span className="text-[10px] font-semibold text-[var(--green)]">✓ Done</span>}
                            </div>
                            {vPct > 0 && (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1 bg-black/[0.08] rounded-full overflow-hidden">
                                  <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${vPct}%` }} />
                                </div>
                                <span className="text-[10px] tabular-nums">{vPct}%</span>
                              </div>
                            )}
                          </div>
                          <button onClick={e => { e.stopPropagation(); handlePlay(item, version); }}
                            aria-label="Play" disabled={version.status !== "ready"}
                            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-[var(--green-dim)] text-[var(--green)] disabled:opacity-40">
                            {/* play triangle SVG */}
                          </button>
                        </div>
                      );
                    })}
                    <button onClick={() => { setProcessModalContentId(item.id); setProcessModalTitle(displayTitle); }}
                      className="w-full text-left px-3 py-2.5 text-[12px] font-semibold text-[var(--accent-text)]">
                      + Process new version
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {processModalContentId && (
        <ProcessNewVersionModal
          isOpen={true} contentId={processModalContentId} contentTitle={processModalTitle}
          onClose={() => setProcessModalContentId(null)}
          onVersionCreated={() => { setProcessModalContentId(null); loadLibrary(); }}
        />
      )}
    </div>
  );
}
```

### Commit
```bash
git add src/components/LibraryScreen.tsx src/components/LibraryScreen.test.tsx
git commit -m "feat(library): rewrite LibraryScreen — search, filter chips, progress bars, played state, process new version, empty states"
```

---

## Task 7: Build verification

```bash
npx vitest run    # All tests pass (~40+ new tests), 0 failures
npm run build     # Build succeeds
npm run lint      # No new errors
git add .; git commit -m "chore(library): build verification — all tests pass, no regressions"
```

---

## Success Criteria

- [ ] Search filters by title and author (case-insensitive, 200ms debounce)
- [ ] All 5 filter chips work; search + chip compose with AND logic
- [ ] Card-level progress bar from PlaybackState
- [ ] Completed items: dimmed + "Played" badge
- [ ] Author in card subtitle when present; gracefully absent otherwise
- [ ] Expanded version view: per-version progress bar + percentage
- [ ] "Process new version" opens modal with duration presets (2/3/5/15/30 min)
- [ ] ProcessNewVersionModal POSTs to `/api/process`, calls onVersionCreated on success
- [ ] Library refreshes to show "Generating" after new version created
- [ ] UploadModal: drag handle, backdrop dismiss, "Add Content" heading, X button
- [ ] Empty states: "Your library is empty", `No results for "{query}"`, "No {filter} content"
- [ ] All existing tests pass; `npm run build` succeeds

---

## Out of Scope

| What | Why |
|---|---|
| Server-side search | Client-side sufficient for personal libraries |
| Drag-to-reorder, bulk actions, deletion | Future features |
| Tags / folders | Future feature |
| Sort controls (A-Z, by duration) | Newest-first sufficient for now |
| Swipe-to-delete | Future feature |
| Offline caching | Out of scope for this release |
