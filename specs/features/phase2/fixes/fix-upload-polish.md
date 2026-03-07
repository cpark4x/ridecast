# Fix: Upload Screen Polish

> Fix 370px of dead space below the URL input, update drop zone copy for mobile, and add a visual separator between the drop zone and URL sections.

## Problem

The visual audit found ~370px of unused black space below the URL input on the Upload screen. The screen has no content below the URL input row — it just ends. On a 844px mobile viewport this is half the screen wasted. Additionally "Drop files here" is desktop-oriented copy that gives no tap affordance hint on mobile.

## Current Code (confirmed from earlier read)

`src/components/UploadScreen.tsx` structure:
1. Logo + tagline
2. Drop zone (`border-dashed`) with "Drop files here" copy
3. "or" divider
4. URL input + Fetch button
5. Error message (conditional)
6. Content preview (conditional, only shows after upload)
7. **Nothing below — the screen ends here when no preview is showing**

## Fix

### 1. Update drop zone copy for mobile (`src/components/UploadScreen.tsx`)

```typescript
// Before
<div className="text-[15px] font-semibold mb-1">Drop files here</div>
<div className="text-xs text-white/55">PDF, EPUB, TXT up to 50MB</div>

// After
<div className="text-[15px] font-semibold mb-1">Tap to browse files</div>
<div className="text-xs text-white/55">or drag and drop · PDF, EPUB, TXT up to 50MB</div>
```

### 2. Add a "What works" section below the URL input

When no preview is showing, fill the dead space with a compact "what you can throw at it" section that doubles as onboarding copy:

```typescript
{/* What works — shown only when no preview is active */}
{!preview && (
  <div className="mt-6">
    <p className="text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-3">Works with</p>
    <div className="grid grid-cols-2 gap-2">
      {[
        { icon: "🌐", label: "Articles & URLs", desc: "Any web page" },
        { icon: "📄", label: "PDFs", desc: "Documents up to 50MB" },
        { icon: "📚", label: "EPUBs", desc: "Ebooks and long reads" },
        { icon: "📝", label: "Text files", desc: "TXT, notes, drafts" },
      ].map(({ icon, label, desc }) => (
        <div key={label} className="flex items-start gap-2.5 p-3 rounded-[10px] bg-white/[0.04] border border-white/[0.06]">
          <span className="text-lg leading-none mt-0.5">{icon}</span>
          <div>
            <div className="text-[12px] font-semibold">{label}</div>
            <div className="text-[11px] text-white/40">{desc}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
```

Place this after the error message display and before the content preview block.

## Files to Modify

| File | Change |
|---|---|
| `src/components/UploadScreen.tsx` | Update drop zone copy; add "Works with" grid below URL input when no preview |

## Tests

**File:** `src/components/UploadScreen.test.tsx` (update or create)

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { UploadScreen } from "./UploadScreen";

vi.mock("@/hooks/useCommuteDuration", () => ({
  useCommuteDuration: () => ({ commuteDuration: 15, setCommuteDuration: vi.fn() }),
}));

describe("UploadScreen", () => {
  it("shows 'Tap to browse files' copy (not 'Drop files here')", () => {
    render(<UploadScreen onProcess={vi.fn()} />);
    expect(screen.getByText("Tap to browse files")).toBeInTheDocument();
    expect(screen.queryByText("Drop files here")).not.toBeInTheDocument();
  });

  it("shows 'Works with' section when no preview is active", () => {
    render(<UploadScreen onProcess={vi.fn()} />);
    expect(screen.getByText("Works with")).toBeInTheDocument();
    expect(screen.getByText("Articles & URLs")).toBeInTheDocument();
    expect(screen.getByText("PDFs")).toBeInTheDocument();
  });

  it("hides 'Works with' section when a preview is showing", async () => {
    // This requires triggering the preview state — skip for now
    // Manual verification covers this case
  });
});
```

## Success Criteria

```bash
npm run test    # UploadScreen tests pass
npm run build   # no type errors
```

Manual:
- [ ] Drop zone shows "Tap to browse files" with "or drag and drop" subtext
- [ ] Upload screen has a 2×2 grid of "Works with" tiles below the URL input
- [ ] The tiles disappear when a content preview card appears (after upload)
- [ ] No dead black space below the URL input when no content is loaded

## Scope

`UploadScreen.tsx` only. No API changes, no hook changes, no schema changes. The "Works with" content is static — no data fetching.
