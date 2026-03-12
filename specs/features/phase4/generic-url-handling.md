# Feature: Generic URL Handling

> When a user pastes a homepage URL (espn.com, cnn.com), detect it's not an article, scrape top headlines via cheerio + RSS fallback, and present a multi-select article picker to batch-create episodes.

## Motivation

A common power-user workflow is "I want to listen to stuff from ESPN today" — but pasting `https://espn.com` currently produces useless output (the homepage HTML has no article text). Instead of failing silently, detect homepage URLs and surface the actual articles. This turns a dead end into the app's most powerful discovery feature.

## Scope

- **`src/lib/extractors/url-detect.ts`** — `isLikelyHomepage()` heuristic (new)
- **`src/lib/extractors/homepage.ts`** — cheerio scrape + RSS fallback (new)
- **`src/app/api/discover/route.ts`** — `POST /api/discover` endpoint (new)
- **`native/components/ArticlePickerSheet.tsx`** — multi-select bottom sheet (new)
- **`native/components/UploadModal.tsx`** — wire homepage detection → picker → batch upload
- **No** AI article ranking or curation — DOM order only
- **No** pagination or "load more" — max 10 articles per homepage
- **No** image thumbnails — title + description text only
- **No** authentication for paywalled sites
- Heuristic will have false positives/negatives — acceptable for v1

## Changes

### 1. Homepage detection heuristic — `src/lib/extractors/url-detect.ts` (new)

```typescript
// src/lib/extractors/url-detect.ts

/**
 * Returns true if the URL looks like a homepage/section page rather than a specific article.
 *
 * Heuristics (in order of confidence):
 * 1. Path is "/" or empty → definitely homepage
 * 2. Single short path segment with no hyphens → likely section (e.g. /sports, /news)
 * 3. No date segment AND no long slug → likely not an article
 */
export function isLikelyHomepage(url: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname;

    // Root path
    if (path === "/" || path === "") return true;

    // Trailing slash only
    if (path === "//") return true;

    const segments = path.split("/").filter(Boolean);

    // Single short segment with no hyphens (e.g. /sports, /nfl, /tech)
    if (segments.length === 1 && !segments[0].includes("-") && segments[0].length < 20) {
      return true;
    }

    // Check for article-like characteristics
    const hasDateSegment = /\/\d{4}\/\d{2}\//.test(path);
    const hasLongHyphenatedSlug = segments.some(
      (s) => s.length > 30 && s.includes("-"),
    );
    const hasNumericId = segments.some((s) => /^\d{5,}$/.test(s));

    const looksLikeArticle = hasDateSegment || hasLongHyphenatedSlug || hasNumericId;
    return !looksLikeArticle;
  } catch {
    return false;
  }
}
```

### 2. Article extraction from homepage — `src/lib/extractors/homepage.ts` (new)

```bash
# Install in server package
npm install cheerio
npm install --save-dev @types/cheerio
```

```typescript
// src/lib/extractors/homepage.ts
import * as cheerio from "cheerio";
import { isLikelyHomepage } from "./url-detect";

export interface ArticleCandidate {
  url: string;
  title: string;
  description: string | null;
}

const COMMON_RSS_PATHS = [
  "/feed",
  "/rss",
  "/feed.xml",
  "/rss.xml",
  "/atom.xml",
  "/index.xml",
  "/feeds/posts/default",
];

const USER_AGENT = "Mozilla/5.0 (compatible; Ridecast/1.0; +https://ridecast.app)";

/**
 * Fetches a homepage and extracts up to 10 article candidates.
 * Falls back to RSS if scraping returns < 3 results.
 */
export async function extractArticlesFromHomepage(
  homepageUrl: string,
): Promise<ArticleCandidate[]> {
  const [scraped, rss] = await Promise.allSettled([
    scrapeHomepageLinks(homepageUrl),
    tryRSSFeed(homepageUrl),
  ]);

  const scrapedItems = scraped.status === "fulfilled" ? scraped.value : [];
  const rssItems     = rss.status     === "fulfilled" ? rss.value     : [];

  // Prefer scraped; fill with RSS if scraped is sparse
  const combined = scrapedItems.length >= 3
    ? scrapedItems
    : [...scrapedItems, ...rssItems];

  // Deduplicate by URL
  const seen = new Set<string>();
  return combined
    .filter((c) => {
      if (seen.has(c.url)) return false;
      seen.add(c.url);
      return true;
    })
    .slice(0, 10);
}

async function scrapeHomepageLinks(homepageUrl: string): Promise<ArticleCandidate[]> {
  const response = await fetch(homepageUrl, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const html = await response.text();
  const $ = cheerio.load(html);
  const baseUrl = new URL(homepageUrl);
  const candidates: ArticleCandidate[] = [];

  $("a[href]").each((_, el) => {
    if (candidates.length >= 15) return false; // stop early

    const href = $(el).attr("href") ?? "";
    let articleUrl: string;
    try {
      articleUrl = new URL(href, homepageUrl).toString();
    } catch {
      return;
    }

    // Same domain only
    try {
      if (new URL(articleUrl).hostname !== baseUrl.hostname) return;
    } catch {
      return;
    }

    // Must look like an article
    if (isLikelyHomepage(articleUrl)) return;

    // Extract title: prefer nearby heading text, then link text
    const $el = $(el);
    const nearbyHeading = $el
      .closest("article, [class*='story'], [class*='card'], [class*='item'], li")
      .find("h1, h2, h3, h4")
      .first()
      .text()
      .trim();
    const linkText = $el.text().trim();
    const title = (nearbyHeading || linkText).replace(/\s+/g, " ");

    if (title.length < 15) return; // skip nav labels, button text

    // Description from nearby paragraph
    const description =
      $el
        .closest("article, [class*='story'], [class*='card'], [class*='item']")
        .find("p")
        .first()
        .text()
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 300) || null;

    candidates.push({
      url: articleUrl,
      title: title.slice(0, 200),
      description,
    });
  });

  return candidates.filter((c) => c.title.length >= 15);
}

async function tryRSSFeed(homepageUrl: string): Promise<ArticleCandidate[]> {
  for (const rssPath of COMMON_RSS_PATHS) {
    try {
      const rssUrl = new URL(rssPath, homepageUrl).toString();
      const response = await fetch(rssUrl, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(4000),
      });
      if (!response.ok) continue;

      const contentType = response.headers.get("content-type") ?? "";
      if (
        !contentType.includes("xml") &&
        !contentType.includes("rss") &&
        !contentType.includes("atom")
      )
        continue;

      const xml = await response.text();
      const items = parseRSSItems(xml, homepageUrl);
      if (items.length > 0) return items;
    } catch {
      continue;
    }
  }
  return [];
}

function parseRSSItems(xml: string, homepageUrl: string): ArticleCandidate[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  const items: ArticleCandidate[] = [];

  $("item, entry").each((_, el) => {
    if (items.length >= 10) return false;

    const $el = $(el);
    const title = ($el.find("title").first().text() || "").trim();
    const link =
      $el.find("link").first().text().trim() ||
      $el.find("link").first().attr("href") ||
      "";
    const description =
      ($el.find("description, summary").first().text() || "")
        .replace(/<[^>]*>/g, "") // strip HTML tags
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 300) || null;

    if (!title || title.length < 5) return;
    if (!link) return;

    let articleUrl: string;
    try {
      articleUrl = new URL(link, homepageUrl).toString();
    } catch {
      return;
    }

    items.push({ url: articleUrl, title, description });
  });

  return items;
}
```

### 3. Discover API endpoint — `src/app/api/discover/route.ts` (new)

```typescript
// src/app/api/discover/route.ts
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { isLikelyHomepage } from "@/lib/extractors/url-detect";
import { extractArticlesFromHomepage } from "@/lib/extractors/homepage";

export async function POST(req: NextRequest) {
  // Auth check — must be signed in
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let url: string;
  try {
    const body = await req.json();
    url = body.url;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  // Validate URL
  try {
    new URL(url);
  } catch {
    return NextResponse.json(
      { error: "Invalid URL format" },
      { status: 400 },
    );
  }

  const homepage = isLikelyHomepage(url);
  if (!homepage) {
    // Not a homepage — caller should use /api/upload directly
    return NextResponse.json({ articles: [], isHomepage: false });
  }

  try {
    const articles = await extractArticlesFromHomepage(url);
    return NextResponse.json({ articles, isHomepage: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Discovery failed: ${message}` },
      { status: 500 },
    );
  }
}
```

### 4. Article picker bottom sheet — `native/components/ArticlePickerSheet.tsx` (new)

```tsx
// native/components/ArticlePickerSheet.tsx
import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface ArticleCandidate {
  url: string;
  title: string;
  description: string | null;
}

interface ArticlePickerSheetProps {
  visible: boolean;
  homepageUrl: string;
  articles: ArticleCandidate[];
  onDismiss: () => void;
  onSubmit: (selected: ArticleCandidate[]) => void;
}

export default function ArticlePickerSheet({
  visible,
  homepageUrl,
  articles,
  onDismiss,
  onSubmit,
}: ArticlePickerSheetProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleArticle(url: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  }

  function handleSubmit() {
    const selectedArticles = articles.filter((a) => selected.has(a.url));
    setSelected(new Set());
    onSubmit(selectedArticles);
  }

  let hostname = homepageUrl;
  try {
    hostname = new URL(homepageUrl).hostname.replace(/^www\./, "");
  } catch { /* use raw URL */ }

  const selectedCount = selected.size;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      {/* Backdrop */}
      <TouchableOpacity
        className="flex-1 bg-black/40"
        activeOpacity={1}
        onPress={onDismiss}
      />

      {/* Sheet */}
      <View
        className="bg-white rounded-t-3xl"
        style={{ maxHeight: "78%" }}
      >
        {/* Drag handle */}
        <View className="items-center pt-3 pb-2">
          <View className="w-10 h-1 rounded-full bg-gray-300" />
        </View>

        {/* Header */}
        <View className="px-5 pb-3">
          <Text className="text-lg font-bold text-gray-900">
            Articles from {hostname}
          </Text>
          <Text className="text-sm text-gray-500 mt-0.5">
            Select articles to create episodes from
          </Text>
        </View>

        {/* Divider */}
        <View className="h-px bg-gray-100" />

        {/* Article list */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12 }}
        >
          {articles.map((article) => {
            const isSelected = selected.has(article.url);
            return (
              <TouchableOpacity
                key={article.url}
                onPress={() => toggleArticle(article.url)}
                className={`flex-row items-start gap-3 p-3 rounded-2xl mb-2 border ${
                  isSelected
                    ? "border-brand bg-orange-50"
                    : "border-gray-100 bg-gray-50"
                }`}
                activeOpacity={0.7}
              >
                {/* Checkbox */}
                <View
                  className={`w-5 h-5 rounded-full border-2 mt-0.5 flex-shrink-0 items-center justify-center ${
                    isSelected ? "border-brand bg-brand" : "border-gray-300 bg-white"
                  }`}
                >
                  {isSelected && (
                    <Ionicons name="checkmark" size={12} color="white" />
                  )}
                </View>

                {/* Text */}
                <View className="flex-1">
                  <Text
                    className="text-sm font-semibold text-gray-900"
                    numberOfLines={3}
                  >
                    {article.title}
                  </Text>
                  {article.description ? (
                    <Text
                      className="text-xs text-gray-500 mt-1"
                      numberOfLines={2}
                    >
                      {article.description}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}

          {articles.length === 0 && (
            <View className="items-center py-8">
              <Ionicons name="newspaper-outline" size={36} color="#D1D5DB" />
              <Text className="text-sm text-gray-400 mt-3 text-center">
                No articles found on this page.{"\n"}Try pasting a direct article URL instead.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Action row */}
        <View className="px-5 pb-8 pt-2 border-t border-gray-100">
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={selectedCount === 0}
            className={`py-4 rounded-2xl items-center ${
              selectedCount > 0 ? "bg-brand" : "bg-gray-200"
            }`}
          >
            <Text
              className={`text-base font-bold ${
                selectedCount > 0 ? "text-white" : "text-gray-400"
              }`}
            >
              {selectedCount === 0
                ? "Select Articles"
                : `Create ${selectedCount} Episode${selectedCount === 1 ? "" : "s"}`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
```

### 5. Wire into UploadModal — `native/components/UploadModal.tsx`

**Add imports:**
```typescript
import ArticlePickerSheet, {
  type ArticleCandidate,
} from "./ArticlePickerSheet";
import { API_URL } from "../lib/constants";
import { authHeaders } from "../lib/api"; // or inline the auth header fetch
```

**Add state:**
```typescript
const [discoveredArticles, setDiscoveredArticles] = useState<ArticleCandidate[]>([]);
const [articlePickerVisible, setArticlePickerVisible] = useState(false);
const [batchToast, setBatchToast] = useState<string | null>(null);
```

**Replace `handleUrlSubmit` function:**

**Before:**
```typescript
async function handleUrlSubmit() {
  const trimmed = urlText.trim();
  if (!trimmed) return;

  setLoading(true);
  setErrorMsg(null);
  try {
    const result = await uploadUrl(trimmed);
    setUploadResult(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    setErrorMsg(msg);
  } finally {
    setLoading(false);
  }
}
```

**After:**
```typescript
async function handleUrlSubmit() {
  const trimmed = urlText.trim();
  if (!trimmed) return;

  setLoading(true);
  setErrorMsg(null);
  try {
    // Step 1: Check if this looks like a homepage
    const auth = await authHeaders();
    const discoverRes = await fetch(`${API_URL}/api/discover`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ url: trimmed }),
    });

    if (discoverRes.ok) {
      const discover = await discoverRes.json() as {
        isHomepage: boolean;
        articles: ArticleCandidate[];
      };

      if (discover.isHomepage && discover.articles.length > 0) {
        // Show article picker instead of proceeding directly
        setDiscoveredArticles(discover.articles);
        setArticlePickerVisible(true);
        return; // don't fall through to normal upload
      }
    }
    // Not a homepage (or discover failed) — proceed with normal upload
    const result = await uploadUrl(trimmed);
    setUploadResult(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    setErrorMsg(msg);
  } finally {
    setLoading(false);
  }
}

async function handleArticleSelection(selected: ArticleCandidate[]) {
  setArticlePickerVisible(false);
  if (selected.length === 0) return;

  const countLabel = `${selected.length} episode${selected.length === 1 ? "" : "s"}`;
  setBatchToast(`Creating ${countLabel}…`);
  setLoading(true);

  let successCount = 0;
  for (const article of selected) {
    try {
      await uploadUrl(article.url);
      successCount++;
    } catch {
      // Skip failed articles, continue batch
    }
  }

  setLoading(false);
  setBatchToast(
    successCount === selected.length
      ? `✓ ${countLabel} added to your library`
      : `${successCount}/${selected.length} episodes added`,
  );
  setTimeout(() => setBatchToast(null), 3000);

  // Close modal after batch (go back to library to see items generating)
  if (successCount > 0) handleDismiss();
}
```

**Add ArticlePickerSheet and toast to render (inside the Modal, at the bottom):**
```tsx
{/* Batch status toast */}
{batchToast && (
  <View className="absolute top-4 left-4 right-4 bg-gray-900 rounded-2xl px-4 py-3 z-50">
    <Text className="text-sm text-white text-center font-medium">{batchToast}</Text>
  </View>
)}

{/* Article picker — shown when homepage is detected */}
<ArticlePickerSheet
  visible={articlePickerVisible}
  homepageUrl={urlText.trim()}
  articles={discoveredArticles}
  onDismiss={() => setArticlePickerVisible(false)}
  onSubmit={handleArticleSelection}
/>
```

## Files to Create/Modify

| File | Change |
|------|--------|
| `src/lib/extractors/url-detect.ts` | **New** — `isLikelyHomepage()` heuristic |
| `src/lib/extractors/homepage.ts` | **New** — cheerio scrape + RSS fallback → `ArticleCandidate[]` |
| `src/app/api/discover/route.ts` | **New** — `POST /api/discover` endpoint |
| `native/components/ArticlePickerSheet.tsx` | **New** — multi-select article picker bottom sheet |
| `native/components/UploadModal.tsx` | Wire homepage detection → article picker → batch submit with toast |
| `package.json` (server) | Add `cheerio` |

## Tests

```typescript
// src/lib/extractors/url-detect.test.ts
import { isLikelyHomepage } from "./url-detect";

describe("isLikelyHomepage", () => {
  it("detects root path as homepage", () => {
    expect(isLikelyHomepage("https://espn.com/")).toBe(true);
    expect(isLikelyHomepage("https://espn.com")).toBe(true);
  });

  it("detects section-level path as homepage", () => {
    expect(isLikelyHomepage("https://espn.com/nfl")).toBe(true);
    expect(isLikelyHomepage("https://cnn.com/politics")).toBe(true);
    expect(isLikelyHomepage("https://nytimes.com/sports")).toBe(true);
  });

  it("does not flag articles with long hyphenated slug", () => {
    expect(
      isLikelyHomepage(
        "https://espn.com/nfl/story/_/id/12345/super-bowl-preview-chiefs-versus-eagles",
      ),
    ).toBe(false);
  });

  it("does not flag articles with date segments", () => {
    expect(
      isLikelyHomepage("https://nytimes.com/2024/01/15/sports/article.html"),
    ).toBe(false);
  });

  it("does not flag articles with numeric IDs", () => {
    expect(
      isLikelyHomepage("https://theatlantic.com/ideas/archive/678901/title"),
    ).toBe(false);
  });

  it("returns false for invalid URL", () => {
    expect(isLikelyHomepage("not-a-url")).toBe(false);
  });
});

// native/__tests__/ArticlePickerSheet.test.tsx
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import ArticlePickerSheet, {
  type ArticleCandidate,
} from "../components/ArticlePickerSheet";

const mockArticles: ArticleCandidate[] = [
  { url: "https://espn.com/a1", title: "Yankees Bullpen Analysis", description: null },
  { url: "https://espn.com/a2", title: "AL East Power Rankings",   description: "MLB standings..." },
  { url: "https://espn.com/a3", title: "Spring Training Recap",    description: null },
];

describe("ArticlePickerSheet", () => {
  it("renders all article titles", () => {
    const { getByText } = render(
      <ArticlePickerSheet
        visible={true}
        homepageUrl="https://espn.com"
        articles={mockArticles}
        onDismiss={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );
    expect(getByText("Yankees Bullpen Analysis")).toBeTruthy();
    expect(getByText("AL East Power Rankings")).toBeTruthy();
    expect(getByText("Spring Training Recap")).toBeTruthy();
  });

  it("submit button disabled when no articles selected", () => {
    const { getByText } = render(
      <ArticlePickerSheet
        visible={true}
        homepageUrl="https://espn.com"
        articles={mockArticles}
        onDismiss={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );
    expect(getByText("Select Articles")).toBeTruthy();
  });

  it("submit button shows count after selection", () => {
    const { getByText } = render(
      <ArticlePickerSheet
        visible={true}
        homepageUrl="https://espn.com"
        articles={mockArticles}
        onDismiss={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );
    fireEvent.press(getByText("Yankees Bullpen Analysis"));
    expect(getByText("Create 1 Episode")).toBeTruthy();

    fireEvent.press(getByText("AL East Power Rankings"));
    expect(getByText("Create 2 Episodes")).toBeTruthy();
  });

  it("calls onSubmit with selected articles", () => {
    const onSubmit = jest.fn();
    const { getByText } = render(
      <ArticlePickerSheet
        visible={true}
        homepageUrl="https://espn.com"
        articles={mockArticles}
        onDismiss={jest.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.press(getByText("Yankees Bullpen Analysis"));
    fireEvent.press(getByText("Create 1 Episode"));

    expect(onSubmit).toHaveBeenCalledWith([mockArticles[0]]);
  });

  it("deselects article on second tap", () => {
    const { getByText } = render(
      <ArticlePickerSheet
        visible={true}
        homepageUrl="https://espn.com"
        articles={mockArticles}
        onDismiss={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );
    fireEvent.press(getByText("Yankees Bullpen Analysis")); // select
    fireEvent.press(getByText("Yankees Bullpen Analysis")); // deselect
    expect(getByText("Select Articles")).toBeTruthy();
  });

  it("shows empty state when no articles", () => {
    const { getByText } = render(
      <ArticlePickerSheet
        visible={true}
        homepageUrl="https://espn.com"
        articles={[]}
        onDismiss={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );
    expect(getByText(/No articles found/)).toBeTruthy();
  });

  it("extracts hostname from URL for header", () => {
    const { getByText } = render(
      <ArticlePickerSheet
        visible={true}
        homepageUrl="https://www.espn.com"
        articles={mockArticles}
        onDismiss={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );
    expect(getByText("Articles from espn.com")).toBeTruthy();
  });
});
```

## Success Criteria

```bash
# Server unit tests
npm run test -- --testPathPattern="url-detect"
# → url-detect.test.ts: 7 tests passed

# TypeScript clean (server)
npm run build
# → 0 errors

# TypeScript clean (native)
cd native && npx tsc --noEmit
# → 0 errors

# Native unit tests
cd native && npx jest __tests__/ArticlePickerSheet.test.tsx --no-coverage
# → 7 tests passed

# Manual end-to-end:
# 1. Open UploadModal → paste https://espn.com → article picker slides up with ≥ 3 ESPN headlines
# 2. Select 2 articles → "Create 2 Episodes" button active → tap → loading → toast "Creating 2 episodes…"
# 3. Dismiss modal → Library shows 2 new items in "Generating" state
# 4. Paste a real article URL (e.g. https://espn.com/nfl/story/...) → NO picker → proceeds to content preview
# 5. Paste URL for a site with no articles (e.g. 404 page) → shows 0-article empty state in picker
# 6. Tap backdrop on picker → picker dismisses without creating episodes
```

- Pasting `https://espn.com` triggers article picker with real ESPN headlines (≥ 3 articles)
- Selecting 2 articles and confirming creates 2 "Generating" episodes in the library
- Pasting a direct article URL bypasses picker and proceeds normally
- Zero-article case shows empty state instead of crashing
