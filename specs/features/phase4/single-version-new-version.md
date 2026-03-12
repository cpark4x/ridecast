# Feature: Single-Version "New Version" Access

> Make it easy to create a second version from a single-version card — today it's only accessible via the expanded multi-version view (proposed-001).

## Motivation

The "New Version" action is currently surfaced only in the long-press action sheet — which users don't discover naturally. For single-version cards, there's no visible affordance that a second version (different duration, different format) is even possible. Adding a direct path — either a "+" button on the card footer or a context menu entry — surfaces this core feature and drives repeat usage.

## Changes

### 1. Current state

In `native/components/EpisodeCard.tsx`:
- The "+" pill in the footer calls `onNewVersion?.(item)` — this already exists
- Long-press action sheet has "New Version" option (index 1)
- Both work, but users don't discover either

The "+" pill is present but visually minimal (`text-xs font-medium text-gray-500`). Upgrade it.

### 2. Option A — Upgrade the "+" pill (recommended)

Make the "+" pill more discoverable by styling it as a labeled button rather than a bare "+":

```typescript
// In EpisodeCard.tsx footer, replace the "+" pill:

// Before:
<TouchableOpacity
  onPress={() => onNewVersion(item)}
  className="bg-gray-100 px-2 py-0.5 rounded-full"
>
  <Text className="text-xs font-medium text-gray-500">+</Text>
</TouchableOpacity>

// After:
<TouchableOpacity
  onPress={() => {
    void Haptics.light();
    onNewVersion(item);
  }}
  className="flex-row items-center gap-1 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200"
  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
>
  <Ionicons name="add" size={12} color="#6B7280" />
  <Text className="text-xs font-medium text-gray-500">Version</Text>
</TouchableOpacity>
```

This makes it read as an action ("+ Version") rather than a meaningless symbol.

### 3. Option B — Direct tap on the card opens NewVersionSheet (alternative)

For single-version cards with all versions completed, tapping the card has no action (no ready audio to play). In this case, re-route the tap to `onNewVersion`:

```typescript
function handleCardPress(item: LibraryItem) {
  const readyVersion = item.versions.find(v => v.status === "ready" && v.audioId && v.audioUrl);

  if (!readyVersion) {
    // If no ready audio but has a completed version, offer new version
    const hasCompleted = item.versions.some(v => v.completed);
    if (hasCompleted) {
      onNewVersion?.(item);
      return;
    }
    // Still generating — error haptic
    void Haptics.error();
    return;
  }
  // Normal play flow
  ...
}
```

**Recommendation:** Implement both A and B. A improves discoverability. B improves the completed-card dead-tap experience.

### 4. Long-press action sheet — add to single-version cards

Verify that `handleLongPress` in `EpisodeCard.tsx` already shows "New Version" regardless of version count. Current implementation shows it unconditionally, which is correct.

No change needed here — just confirm it works for single-version cards during testing.

### 5. NewVersionSheet — confirm it handles single-version case

`native/components/NewVersionSheet.tsx` — read this file. Ensure it renders correctly when `episode.versions.length === 1` (no "you already have X versions" confusing copy).

If it shows version count context that assumes multiple versions, adjust the copy for the single-version case:

```typescript
// In NewVersionSheet:
const versionCount = episode.versions.length;
const headerText = versionCount === 0
  ? "Create your first episode"
  : versionCount === 1
    ? "Create a second version"
    : `Add version ${versionCount + 1}`;
```

## Files to Create/Modify

| File | Change |
|------|--------|
| `native/components/EpisodeCard.tsx` | Upgrade "+" pill to labeled "⊕ Version" button; re-route completed single-version tap to `onNewVersion` |
| `native/components/NewVersionSheet.tsx` | Verify/fix copy for single-version case |

## Tests

Manual verification:
- [ ] Single-version card footer shows "+ Version" button (labeled, not bare "+")
- [ ] Tapping "+ Version" opens `NewVersionSheet`
- [ ] Long-pressing a single-version card shows "New Version" in action sheet
- [ ] Tapping a fully-completed single-version card opens `NewVersionSheet` (not a dead tap)
- [ ] Tapping a generating single-version card fires error haptic (no sheet)
- [ ] `NewVersionSheet` shows "Create a second version" for single-version items

## Success Criteria

```bash
cd native && npx tsc --noEmit
```

- "New Version" is discoverable without requiring long-press discovery
- No regression: multi-version cards still work correctly

## Scope

- **No** new UI for in-card duration picker — `NewVersionSheet` handles duration selection
- **No** backend changes — `NewVersionSheet` already calls the correct API
- **No** auto-suggest duration for the second version (stretch goal)
