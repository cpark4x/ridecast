// ---------------------------------------------------------------------------
// Source identity utilities
// ---------------------------------------------------------------------------

/**
 * Well-known sources: domain → { name, brandColor }.
 * Keys are bare hostnames (no www prefix).
 */
const KNOWN_SOURCES: Record<string, { name: string; brandColor: string }> = {
  "nytimes.com":          { name: "New York Times",         brandColor: "#000000" },
  "newyorker.com":        { name: "The New Yorker",         brandColor: "#C3252D" },
  "theatlantic.com":      { name: "The Atlantic",           brandColor: "#006CB3" },
  "medium.com":           { name: "Medium",                 brandColor: "#000000" },
  "substack.com":         { name: "Substack",               brandColor: "#FF6719" },
  "wired.com":            { name: "Wired",                  brandColor: "#000000" },
  "washingtonpost.com":   { name: "Washington Post",        brandColor: "#231F20" },
  "theguardian.com":      { name: "The Guardian",           brandColor: "#052962" },
  "bbc.com":              { name: "BBC",                    brandColor: "#BB1919" },
  "bbc.co.uk":            { name: "BBC",                    brandColor: "#BB1919" },
  "economist.com":        { name: "The Economist",          brandColor: "#E3120B" },
  "hbr.org":              { name: "Harvard Business Review",brandColor: "#CC0000" },
  "bloomberg.com":        { name: "Bloomberg",              brandColor: "#1B1B1B" },
  "techcrunch.com":       { name: "TechCrunch",             brandColor: "#0A6E5F" },
  "arstechnica.com":      { name: "Ars Technica",           brandColor: "#FF4E00" },
  "theverge.com":         { name: "The Verge",              brandColor: "#FA4C36" },
  "vox.com":              { name: "Vox",                    brandColor: "#FFDB00" },
  "slate.com":            { name: "Slate",                  brandColor: "#333333" },
  "axios.com":            { name: "Axios",                  brandColor: "#FF4F00" },
  "politico.com":         { name: "Politico",               brandColor: "#002D5E" },
  "reuters.com":          { name: "Reuters",                brandColor: "#FF8000" },
  "apnews.com":           { name: "AP News",                brandColor: "#CC0000" },
  "npr.org":              { name: "NPR",                    brandColor: "#003CC5" },
  "ft.com":               { name: "Financial Times",        brandColor: "#FCD0B1" },
  "wsj.com":              { name: "Wall Street Journal",    brandColor: "#004276" },
  "forbes.com":           { name: "Forbes",                 brandColor: "#000000" },
  "time.com":             { name: "TIME",                   brandColor: "#CC0000" },
  "nature.com":           { name: "Nature",                 brandColor: "#005F87" },
  "science.org":          { name: "Science",                brandColor: "#004A7F" },
  "github.com":           { name: "GitHub",                 brandColor: "#24292E" },
  "stackoverflow.com":    { name: "Stack Overflow",         brandColor: "#F48024" },
};

// ---------------------------------------------------------------------------
// Domain extraction
// ---------------------------------------------------------------------------

export function extractDomain(url: string): string | null {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Color utilities
// ---------------------------------------------------------------------------

export function hslToHex(h: number, s: number, l: number): string {
  const sl = s / 100;
  const ll = l / 100;
  const a = sl * Math.min(ll, 1 - ll);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = ll - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Deterministic color from any string — used as brandColor fallback. */
export function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0; // coerce to 32-bit int
  }
  const h = Math.abs(hash) % 360;
  return hslToHex(h, 55, 40);
}

// ---------------------------------------------------------------------------
// Title case
// ---------------------------------------------------------------------------

const SMALL_WORDS = new Set(["a", "an", "and", "as", "at", "but", "by", "for",
  "in", "nor", "of", "on", "or", "so", "the", "to", "up", "yet"]);

export function toTitleCase(str: string): string {
  return str
    .split(" ")
    .map((word, idx) => {
      if (!word) return word;
      const lower = word.toLowerCase();
      // Always capitalize first and last word; skip small words in the middle
      if (idx === 0 || !SMALL_WORDS.has(lower)) {
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      }
      return lower;
    })
    .join(" ");
}

// ---------------------------------------------------------------------------
// Source identity derivation
// ---------------------------------------------------------------------------

export interface SourceIdentity {
  sourceIcon: string | null;
  sourceName: string | null;
  sourceDomain: string | null;
  sourceBrandColor: string | null;
}

/**
 * Derives display identity (icon letter, name, domain, brand color) from a
 * raw LibraryItem-shaped object. Server-provided fields always take priority —
 * this is used as the client-side fallback enrichment.
 */
export function deriveSourceIdentity(item: {
  sourceType: string;
  sourceUrl: string | null;
  author?: string | null;
}): SourceIdentity {
  // No URL: derive from sourceType
  if (!item.sourceUrl) {
    const label = item.sourceType.toUpperCase();
    return {
      sourceIcon:       label.charAt(0),
      sourceName:       label,
      sourceDomain:     null,
      sourceBrandColor: null,
    };
  }

  const domain = extractDomain(item.sourceUrl);
  if (!domain) {
    const label = item.sourceType.toUpperCase();
    return {
      sourceIcon:       label.charAt(0),
      sourceName:       label,
      sourceDomain:     null,
      sourceBrandColor: null,
    };
  }

  // Exact match, then try stripping leading subdomain parts
  const known =
    KNOWN_SOURCES[domain] ??
    KNOWN_SOURCES[domain.split(".").slice(-2).join(".")] ??
    null;

  if (known) {
    return {
      sourceIcon:       known.name.charAt(0).toUpperCase(),
      sourceName:       known.name,
      sourceDomain:     domain,
      sourceBrandColor: known.brandColor,
    };
  }

  // Unknown domain: derive a readable name from the second-to-last part
  const parts = domain.split(".");
  const nameBase = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  const name = nameBase.charAt(0).toUpperCase() + nameBase.slice(1);

  return {
    sourceIcon:       name.charAt(0).toUpperCase(),
    sourceName:       name,
    sourceDomain:     domain,
    sourceBrandColor: null,
  };
}
