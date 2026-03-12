# Feature: Generic URL Handling

> When a user pastes a homepage URL (espn.com, cnn.com), detect it's not an article, scrape top headlines, and present a picker to select which articles to create episodes from.

## Motivation

A common power-user workflow is "I want to listen to stuff from ESPN today" — but pasting `https://espn.com` currently produces useless output (the homepage HTML has no article text). Instead of failing silently, detect homepage URLs and surface the actual articles. This turns a dead end into the app's most powerful discovery feature.

## Changes

### 1. Homepage detection heuristic (`src/lib/extractors/url-detect.ts` — new)

```typescript
/**
 * Returns true if the URL is likely a homepage/section page rather than an article.
 * Heuristics:
 * - Path is "/" or empty
 * - Path is a short section slug (no date, no article-style slug)
 * - Common news homepage patterns
 */
export function isLikelyHomepage(url: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname;

    // Root path
    if (path === "/" || path === "") return true;

    // Very short path (section pages like /sports, /news)
    const segments = path.split("/").filter(Boolean);
    if (segments.length <= 1 && !path.includes("-")) return true;

    // Path has no article-like structure (no date segments, no long slug)
    const hasDateSegment = /\/\d{4}\/\d{2}\//.test(path);
    const hasLongSlug = segments.some(s => s.length > 30);
    const hasArticlePattern = hasDateSegment || hasLongSlug;

    return !hasArticlePattern;
  } catch {
    return false;
  }
}
```

### 2. Article extraction from homepage (`src/lib/extractors/homepage.ts` — new)

When a URL is detected as a homepage, scrape it and extract article links + headlines. Use `cheerio` (already available or lightweight) or the Readability-based approach:

```bash
npm install cheerio
```

```typescript
import * as cheerio from "cheerio";

export interface ArticleCandidate {
  url: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
}

/**
 * Fetches a homepage URL and extracts article candidates.
 * Returns up to 10 distinct articles.
 */
export async function extractArticlesFromHomepage(homepageUrl: string): Promise<ArticleCandidate[]> {
  const response = await fetch(homepageUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Ridecast/1.0; +https://ridecast.app)" },
  });
  if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

  const html = await response.text();
  const $ = cheerio.load(html);
  const baseUrl = new URL(homepageUrl);
  const candidates: ArticleCandidate[] = [];
  const seen = new Set<string>();

  // Strategy: find <a> tags linking to article-like paths on the same domain
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    let articleUrl: string;

    try {
      articleUrl = new URL(href, homepageUrl).toString();
    } catch {
      return; // skip invalid URLs
    }

    // Same domain only
    const articleHost = new URL(articleUrl).hostname;
    if (articleHost !== baseUrl.hostname) return;

    // Must look like an article (not a homepage)
    if (isLikelyHomepage(articleUrl)) return;

    // Deduplicate
    if (seen.has(articleUrl)) return;
    seen.add(articleUrl);

    // Extract title from link text or nearby heading
    const linkText = $(el).text().trim();
    const nearbyHeading = $(el).closest("article, .article, [class*='story'], [class*='card']").find("h1, h2, h3").first().text().trim();
    const title = nearbyHeading || linkText;

    if (title.length < 10) return; // skip nav links, short labels

    // Extract description from nearby paragraph
    const description = $(el).closest("article, [class*='story'], [class*='card']").find("p").first().text().trim() || null;

    candidates.push({
      url: articleUrl,
      title: title.slice(0, 200),
      description: description?.slice(0, 300) ?? null,
      imageUrl: null, // image extraction is a stretch goal
    });

    if (candidates.length >= 15) return false; // stop after 15
  });

  // Sort by title length (longer = more article-like) and return top 10
  return candidates
    .filter(c => c.title.length > 20)
    .slice(0, 10);
}
```

**Fallback: RSS feed discovery**

Many sites publish RSS feeds at `/feed`, `/rss`, or `/feed.xml`. If `cheerio` scraping returns < 3 candidates, try RSS:

```typescript
async function tryRSSFeed(homepageUrl: string): Promise<ArticleCandidate[]> {
  const commonPaths = ["/feed", "/rss", "/feed.xml", "/atom.xml", "/index.xml"];
  for (const path of commonPaths) {
    try {
      const rssUrl = new URL(path, homepageUrl).toString();
      const response = await fetch(rssUrl);
      if (!response.ok) continue;
      const xml = await response.text();
      return parseRSSItems(xml, homepageUrl); // parse <item> elements
    } catch {
      continue;
    }
  }
  return [];
}
```

### 3. API endpoint: article discovery (`src/app/api/discover/route.ts` — new)

```typescript
// POST /api/discover
// Body: { url: string }
// Returns: { articles: ArticleCandidate[], isHomepage: boolean }

export async function POST(req: Request) {
  const { url } = await req.json();
  if (!url) return Response.json({ error: "url required" }, { status: 400 });

  const homepage = isLikelyHomepage(url);
  if (!homepage) {
    // Not a homepage — just return empty (caller should use /api/upload directly)
    return Response.json({ articles: [], isHomepage: false });
  }

  try {
    let articles = await extractArticlesFromHomepage(url);
    if (articles.length < 3) {
      const rssArticles = await tryRSSFeed(url);
      articles = [...articles, ...rssArticles].slice(0, 10);
    }
    return Response.json({ articles, isHomepage: true });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
```

### 4. Native: ArticlePickerSheet component (`native/components/ArticlePickerSheet.tsx` — new)

Triggered from `UploadModal` when `/api/discover` returns articles.

```typescript
interface ArticlePickerSheetProps {
  visible: boolean;
  homepageUrl: string;
  articles: ArticleCandidate[];
  onDismiss: () => void;
  onSubmit: (selected: ArticleCandidate[]) => void;
}

export default function ArticlePickerSheet({ visible, homepageUrl, articles, onDismiss, onSubmit }: ArticlePickerSheetProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleArticle(url: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      {/* Backdrop */}
      <TouchableOpacity className="flex-1 bg-black/40" onPress={onDismiss} activeOpacity={1} />
      
      <View className="bg-white rounded-t-3xl px-5 pt-4 pb-8" style={{ maxHeight: "75%" }}>
        {/* Drag handle */}
        <View className="w-10 h-1 bg-gray-200 rounded-full self-center mb-3" />
        
        {/* Header */}
        <Text className="text-lg font-bold text-gray-900 mb-1">
          Articles found on {new URL(homepageUrl).hostname.replace(/^www\./, "")}
        </Text>
        <Text className="text-sm text-gray-500 mb-4">
          Select articles to create episodes from
        </Text>

        {/* Article list */}
        <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
          {articles.map((article) => {
            const isSelected = selected.has(article.url);
            return (
              <TouchableOpacity
                key={article.url}
                onPress={() => toggleArticle(article.url)}
                className={`flex-row items-start gap-3 p-3 rounded-2xl mb-2 border ${
                  isSelected ? "border-brand bg-orange-50" : "border-gray-100 bg-gray-50"
                }`}
              >
                {/* Checkbox */}
                <View className={`w-5 h-5 rounded-full border-2 mt-0.5 items-center justify-center ${
                  isSelected ? "border-brand bg-brand" : "border-gray-300"
                }`}>
                  {isSelected && <Ionicons name="checkmark" size={12} color="white" />}
                </View>
                
                {/* Title + description */}
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-900" numberOfLines={2}>
                    {article.title}
                  </Text>
                  {article.description && (
                    <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={2}>
                      {article.description}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Submit button */}
        <TouchableOpacity
          onPress={() => onSubmit(articles.filter(a => selected.has(a.url)))}
          disabled={selected.size === 0}
          className={`py-4 rounded-2xl items-center ${selected.size > 0 ? "bg-brand" : "bg-gray-200"}`}
        >
          <Text className={`text-base font-bold ${selected.size > 0 ? "text-white" : "text-gray-400"}`}>
            {selected.size === 0
              ? "Select Articles"
              : `Create ${selected.size} Episode${selected.size === 1 ? "" : "s"}`}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
```

### 5. Wire into UploadModal — URL flow

When user submits a URL:

```typescript
// In UploadModal handleURLSubmit:
async function handleURLSubmit(url: string) {
  const validationError = validateURL(url);
  if (validationError) { setError(validationError); return; }

  setIsFetching(true);
  try {
    // Step 1: Check if it's a homepage
    const discoverResponse = await fetch("/api/discover", {
      method: "POST",
      body: JSON.stringify({ url }),
      headers: { "Content-Type": "application/json" },
    });
    const discover = await discoverResponse.json();

    if (discover.isHomepage && discover.articles.length > 0) {
      // Show article picker
      setDiscoveredArticles(discover.articles);
      setArticlePickerVisible(true);
      return;
    }

    // Step 2: Not a homepage — proceed with normal upload
    await submitURL(url);
  } finally {
    setIsFetching(false);
  }
}

// When user selects from picker:
async function handleArticleSelection(articles: ArticleCandidate[]) {
  setArticlePickerVisible(false);
  // Batch create: submit each selected article URL to /api/upload
  for (const article of articles) {
    await submitURL(article.url);
  }
}
```

### 6. Batch episode creation

`handleArticleSelection` submits multiple URLs. Each creates a separate `LibraryItem`. The processing pipeline handles them individually (each calls `/api/process` + `/api/audio/generate`). Show a count toast: "Creating 3 episodes…"

## Files to Create/Modify

| File | Change |
|------|--------|
| `src/lib/extractors/url-detect.ts` | New — `isLikelyHomepage()` heuristic |
| `src/lib/extractors/homepage.ts` | New — cheerio-based article extraction + RSS fallback |
| `src/app/api/discover/route.ts` | New — POST /api/discover endpoint |
| `native/components/ArticlePickerSheet.tsx` | New — multi-select article picker bottom sheet |
| `native/components/UploadModal.tsx` | Wire homepage detection → article picker → batch submit |
| `package.json` (server) | Add `cheerio` |

## Tests

```typescript
// src/lib/extractors/url-detect.test.ts
describe("isLikelyHomepage", () => {
  it("detects root path as homepage", () => {
    expect(isLikelyHomepage("https://espn.com/")).toBe(true);
    expect(isLikelyHomepage("https://espn.com")).toBe(true);
  });
  it("detects section page as homepage", () => {
    expect(isLikelyHomepage("https://espn.com/nfl")).toBe(true);
  });
  it("does not flag article URLs", () => {
    expect(isLikelyHomepage("https://espn.com/nfl/story/_/id/12345/super-bowl-preview")).toBe(false);
    expect(isLikelyHomepage("https://nytimes.com/2024/01/15/sports/article.html")).toBe(false);
  });
});
```

## Success Criteria

- [ ] Pasting `https://espn.com` → article picker slides up with real ESPN headlines
- [ ] Select 2 articles → 2 episodes appear in library as "Generating"
- [ ] Pasting a real article URL → article picker does NOT appear, proceeds normally
- [ ] If discovery API returns 0 articles → fallback to normal URL upload (no picker)
- [ ] "Creating 3 episodes…" feedback shown during batch submission

## Scope

- **No** AI article ranking or "best of" curation — articles are listed in DOM order
- **No** pagination/load more (max 10 articles per homepage)
- **No** image thumbnails in the picker (article title + description only)
- **NO** authentication for paywalled sites
- Heuristic will have false positives/negatives — this is acceptable for v1
