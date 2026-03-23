# Feature: Chrome Browser Extension

> Right-click any article → "Send to Ridecast" — a Chrome Manifest V3 extension that sends the current page URL to your library with a duration picker and success notification. Lives in `browser-extension/` at the project root (standalone static project, no build step required).

## Motivation

The fastest path to creating an episode is from where you're already reading — the browser. A Chrome extension with a context menu makes Ridecast a one-click action rather than a multi-step copy/paste flow. It captures the "I want to listen to this later" impulse at the exact moment it happens.

## Scope

- **Chrome MV3 extension** at `browser-extension/` (project root) — plain JS, no build step
- **Context menu** ("Send to Ridecast") on any page, link, or text selection
- **Popup** with URL preview and duration picker (5/10/15/20/30 min)
- **Auth via stored token** — "paste token" approach for v1; user copies token from `ridecast.app/token`
- **Chrome notifications** on success
- **No** Firefox/Safari extension
- **No** automatic library sync
- **No** Chrome Web Store submission in this spec
- **No** full OAuth flow — stable extension ID required for that; out of scope for v1

## Directory Structure

```
browser-extension/          ← project root (not inside native/)
├── manifest.json
├── background.js
├── content-script.js
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── icons/
│   ├── icon16.png          ← generate from brand orange circle + R
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Changes

### 1. Manifest V3 — `browser-extension/manifest.json` (new)

```json
{
  "manifest_version": 3,
  "name": "Ridecast",
  "description": "Send any article to Ridecast and listen as a podcast episode on your commute.",
  "version": "1.0.0",

  "permissions": [
    "contextMenus",
    "activeTab",
    "storage",
    "notifications"
  ],

  "host_permissions": [
    "https://ridecast.app/*"
  ],

  "background": {
    "service_worker": "background.js",
    "type": "module"
  },

  "action": {
    "default_popup": "popup/popup.html",
    "default_title": "Ridecast",
    "default_icon": {
      "16":  "icons/icon16.png",
      "48":  "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },

  "icons": {
    "16":  "icons/icon16.png",
    "48":  "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### 2. Service worker — `browser-extension/background.js` (new)

```javascript
// background.js — Chrome MV3 service worker
// Plain ES module — no build step required.

const API_BASE = "https://ridecast.app";

// ── Context menu setup ─────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "send-to-ridecast",
    title: "Send to Ridecast",
    contexts: ["page", "link", "selection"],
  });
});

// ── Context menu click handler ──────────────────────────────
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "send-to-ridecast") return;

  // Prefer link URL > page URL > tab URL
  const url = info.linkUrl ?? info.pageUrl ?? tab?.url;
  if (!url || !url.startsWith("http")) {
    showNotification("error", "Cannot send this page", "Only http/https URLs are supported.");
    return;
  }

  // Store pending URL for popup to read
  await chrome.storage.session.set({ pendingUrl: url });

  // Open popup (Chrome 99+: action.openPopup available in some contexts)
  // Fallback: user clicks the extension icon
  try {
    await chrome.action.openPopup();
  } catch {
    // openPopup() may not be available in all contexts — show badge instead
    await chrome.action.setBadgeText({ text: "1" });
    await chrome.action.setBadgeBackgroundColor({ color: "#EA580C" });
  }
});

// ── Message handler (from popup) ────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "create-episode") return false;

  createEpisode(message.url, message.duration, message.authToken)
    .then((result) => sendResponse({ success: true, result }))
    .catch((err)  => sendResponse({ success: false, error: err.message ?? String(err) }));

  return true; // keep message channel open for async response
});

// ── Episode creation ─────────────────────────────────────────
async function createEpisode(url, durationMinutes, authToken) {
  // Step 1: Upload content
  const uploadRes = await fetchJSON(`${API_BASE}/api/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authToken}`,
    },
    body: JSON.stringify({ url }),
  });

  // Step 2: Kick off script generation
  const processRes = await fetchJSON(`${API_BASE}/api/process`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      contentId: uploadRes.id,
      targetMinutes: durationMinutes,
    }),
  });

  // Step 3: Trigger audio generation (fire and forget — may be auto-triggered by server)
  fetchJSON(`${API_BASE}/api/audio/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authToken}`,
    },
    body: JSON.stringify({ scriptId: processRes.id }),
  }).catch(() => { /* ignore — server may auto-trigger */ });

  // Clear badge and pending URL
  await chrome.action.setBadgeText({ text: "" });
  await chrome.storage.session.remove("pendingUrl");

  // Success notification
  const shortTitle = uploadRes.title?.slice(0, 60) ?? url.slice(0, 60);
  showNotification(
    "success",
    "Added to Ridecast",
    `"${shortTitle}" is being generated. Check your library in ~30 seconds.`,
  );

  return { contentId: uploadRes.id, title: uploadRes.title };
}

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok && res.status !== 409) {
    throw new Error(data.error ?? `Request failed: ${res.status}`);
  }
  return data;
}

function showNotification(type, title, message) {
  chrome.notifications.create(`ridecast-${Date.now()}`, {
    type: "basic",
    iconUrl: "icons/icon48.png",
    title,
    message,
    priority: type === "error" ? 2 : 1,
  });
}
```

### 3. Content script — `browser-extension/content-script.js` (new)

The content script is minimal — only needed if we want to read page title or meta for richer previews. Not registered in manifest for now; kept as a stub for future use:

```javascript
// content-script.js — injected into page context (currently unused)
// Future: extract article title, author, reading time estimate for richer popup preview.

// Runs only when explicitly injected via chrome.scripting.executeScript
(() => {
  const meta = {
    title: document.title,
    url: location.href,
    description:
      document.querySelector('meta[name="description"]')?.content ??
      document.querySelector('meta[property="og:description"]')?.content ??
      null,
  };
  // Post back to background via message (when injected)
  chrome.runtime.sendMessage({ type: "page-meta", meta });
})();
```

### 4. Popup HTML — `browser-extension/popup/popup.html` (new)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ridecast</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>

  <!-- Auth required view -->
  <div id="auth-view" class="view hidden">
    <div class="logo-row">
      <img src="../icons/icon48.png" alt="Ridecast" class="logo-img">
      <span class="logo-text">Ridecast</span>
    </div>
    <p class="subtitle">Sign in to start creating episodes from any article.</p>
    <button id="get-token-btn" class="btn-primary">Get Your Token</button>
    <div class="token-input-wrap">
      <input
        id="token-input"
        type="password"
        placeholder="Paste your token here…"
        autocomplete="off"
        spellcheck="false"
      >
      <button id="save-token-btn" class="btn-secondary">Save</button>
    </div>
    <p id="token-error" class="error-msg hidden"></p>
  </div>

  <!-- Main view (authenticated) -->
  <div id="main-view" class="view hidden">
    <div class="header">
      <div class="logo-row-sm">
        <img src="../icons/icon16.png" alt="" class="logo-sm">
        <span class="brand">Ridecast</span>
      </div>
      <button id="signout-btn" class="btn-ghost" title="Remove token">✕</button>
    </div>

    <div id="url-preview" class="url-preview"></div>

    <div class="section-label">Episode Duration</div>
    <div class="duration-grid" id="duration-grid">
      <button class="dur-btn" data-minutes="5">5 min</button>
      <button class="dur-btn selected" data-minutes="10">10 min</button>
      <button class="dur-btn" data-minutes="15">15 min</button>
      <button class="dur-btn" data-minutes="20">20 min</button>
      <button class="dur-btn" data-minutes="30">30 min</button>
    </div>

    <button id="create-btn" class="btn-primary">Create Episode</button>
    <p id="status-msg" class="status-msg hidden"></p>
  </div>

  <!-- Loading view -->
  <div id="loading-view" class="view hidden">
    <div class="loading-content">
      <div class="spinner"></div>
      <p class="loading-text">Creating episode…</p>
    </div>
  </div>

  <script src="popup.js" type="module"></script>
</body>
</html>
```

### 5. Popup logic — `browser-extension/popup/popup.js` (new)

```javascript
// popup.js — Ridecast extension popup
// Auth: token stored in chrome.storage.local under "ridecastToken"

const TOKEN_KEY = "ridecastToken";
const RIDECAST_TOKEN_URL = "https://ridecast.app/settings?tab=token";

// ── State ────────────────────────────────────────────────────
let selectedDuration = 10;
let pendingUrl = null;

// ── Init ─────────────────────────────────────────────────────
async function init() {
  const { [TOKEN_KEY]: token } = await chrome.storage.local.get(TOKEN_KEY);
  const { pendingUrl: storedUrl }  = await chrome.storage.session.get("pendingUrl");

  pendingUrl = storedUrl ?? null;

  if (!token) {
    showView("auth-view");
    setupAuthView();
  } else {
    showView("main-view");
    setupMainView(token);
  }
}

// ── Auth view ────────────────────────────────────────────────
function setupAuthView() {
  document.getElementById("get-token-btn").addEventListener("click", () => {
    chrome.tabs.create({ url: RIDECAST_TOKEN_URL });
    window.close();
  });

  const tokenInput = document.getElementById("token-input");
  const saveBtn    = document.getElementById("save-token-btn");
  const errorEl   = document.getElementById("token-error");

  saveBtn.addEventListener("click", async () => {
    const token = tokenInput.value.trim();
    if (!token) {
      showError(errorEl, "Please paste your token.");
      return;
    }

    // Validate token by calling /api/library
    try {
      const res = await fetch("https://ridecast.app/api/library", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
    } catch {
      showError(errorEl, "Invalid token. Copy it from ridecast.app/settings.");
      return;
    }

    await chrome.storage.local.set({ [TOKEN_KEY]: token });
    showView("main-view");
    setupMainView(token);
  });

  // Allow submitting with Enter
  tokenInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveBtn.click();
  });
}

// ── Main view ─────────────────────────────────────────────────
function setupMainView(token) {
  // URL preview
  const urlPreview = document.getElementById("url-preview");
  if (pendingUrl) {
    try {
      urlPreview.textContent = new URL(pendingUrl).hostname.replace(/^www\./, "");
    } catch {
      urlPreview.textContent = pendingUrl.slice(0, 55);
    }
    urlPreview.style.display = "block";
  } else {
    // No pending URL — show current tab URL
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.url?.startsWith("http")) {
        pendingUrl = tab.url;
        try {
          urlPreview.textContent = new URL(tab.url).hostname.replace(/^www\./, "");
        } catch {
          urlPreview.textContent = tab.url.slice(0, 55);
        }
        urlPreview.style.display = "block";
      }
    });
  }

  // Duration selection
  document.getElementById("duration-grid").addEventListener("click", (e) => {
    const btn = e.target.closest(".dur-btn");
    if (!btn) return;
    document.querySelectorAll(".dur-btn").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedDuration = parseInt(btn.dataset.minutes, 10);
  });

  // Sign out (remove token)
  document.getElementById("signout-btn").addEventListener("click", async () => {
    await chrome.storage.local.remove(TOKEN_KEY);
    showView("auth-view");
    setupAuthView();
  });

  // Create episode
  document.getElementById("create-btn").addEventListener("click", async () => {
    const url = pendingUrl;
    if (!url) {
      showStatusMsg("No URL found. Right-click a page and choose 'Send to Ridecast'.", "error");
      return;
    }

    showView("loading-view");

    const response = await chrome.runtime.sendMessage({
      type: "create-episode",
      url,
      duration: selectedDuration,
      authToken: token,
    });

    if (response?.success) {
      const title = response.result?.title ?? url;
      showView("main-view");
      showStatusMsg(`✓ "${title.slice(0, 50)}" added to your library`, "success");
      setTimeout(() => window.close(), 2500);
    } else {
      showView("main-view");
      const msg = response?.error ?? "Something went wrong. Please try again.";
      showStatusMsg(msg, "error");
    }
  });
}

// ── Helpers ──────────────────────────────────────────────────
function showView(viewId) {
  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
  document.getElementById(viewId).classList.remove("hidden");
}

function showStatusMsg(text, type) {
  const el = document.getElementById("status-msg");
  el.textContent = text;
  el.className = `status-msg ${type}`;
  el.classList.remove("hidden");
}

function showError(el, text) {
  el.textContent = text;
  el.classList.remove("hidden");
}

// ── Boot ─────────────────────────────────────────────────────
init().catch(console.error);
```

### 6. Popup styles — `browser-extension/popup/popup.css` (new)

```css
/* popup.css — Ridecast Chrome Extension */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  width: 300px;
  min-height: 180px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 14px;
  color: #111827;
  background: #fff;
  padding: 16px;
  -webkit-font-smoothing: antialiased;
}

.hidden { display: none !important; }

/* ── Logo ─────────────────────────────── */
.logo-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}
.logo-img { width: 32px; height: 32px; border-radius: 8px; }
.logo-text { font-size: 17px; font-weight: 700; color: #111827; }

.logo-row-sm { display: flex; align-items: center; gap: 6px; }
.logo-sm { width: 16px; height: 16px; }
.brand { font-size: 14px; font-weight: 700; color: #111827; }

/* ── Header ───────────────────────────── */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

/* ── URL preview ──────────────────────── */
.url-preview {
  font-size: 12px;
  color: #6B7280;
  background: #F3F4F6;
  border-radius: 8px;
  padding: 6px 10px;
  margin-bottom: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: none;
}

/* ── Section label ────────────────────── */
.section-label {
  font-size: 10px;
  font-weight: 600;
  color: #9CA3AF;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 8px;
}

/* ── Duration grid ────────────────────── */
.duration-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  margin-bottom: 14px;
}

.dur-btn {
  border: 1.5px solid #E5E7EB;
  background: #F9FAFB;
  border-radius: 8px;
  padding: 7px 2px;
  font-size: 11px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.12s ease;
}
.dur-btn:hover:not(.selected) {
  border-color: #EA580C;
  color: #EA580C;
}
.dur-btn.selected {
  background: #EA580C;
  border-color: #EA580C;
  color: #fff;
  font-weight: 600;
}

/* ── Buttons ──────────────────────────── */
.btn-primary {
  width: 100%;
  background: #EA580C;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 11px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.12s ease;
}
.btn-primary:hover { background: #C2410C; }
.btn-primary:active { background: #9A3412; }

.btn-secondary {
  background: #F3F4F6;
  color: #374151;
  border: 1.5px solid #E5E7EB;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.btn-secondary:hover { background: #E5E7EB; }

.btn-ghost {
  background: none;
  border: none;
  color: #9CA3AF;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 4px;
}
.btn-ghost:hover { color: #374151; }

/* ── Token input ──────────────────────── */
.subtitle {
  font-size: 13px;
  color: #6B7280;
  line-height: 1.5;
  margin-bottom: 14px;
}

.token-input-wrap {
  display: flex;
  gap: 6px;
  margin-top: 10px;
}

.token-input-wrap input {
  flex: 1;
  border: 1.5px solid #E5E7EB;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 12px;
  font-family: monospace;
  color: #111827;
  background: #F9FAFB;
  outline: none;
}
.token-input-wrap input:focus { border-color: #EA580C; }

/* ── Status / errors ──────────────────── */
.status-msg {
  margin-top: 10px;
  font-size: 12px;
  text-align: center;
  line-height: 1.4;
}
.status-msg.success { color: #16A34A; }
.status-msg.error   { color: #DC2626; }

.error-msg {
  font-size: 12px;
  color: #DC2626;
  margin-top: 6px;
}

/* ── Loading view ─────────────────────── */
.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 24px 0;
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #F3F4F6;
  border-top-color: #EA580C;
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
}

.loading-text {
  font-size: 13px;
  color: #6B7280;
}

@keyframes spin { to { transform: rotate(360deg); } }
```

### 7. README — `browser-extension/README.md` (new)

```markdown
# Ridecast Browser Extension

Chrome Manifest V3 extension — send any article to your Ridecast library with one click.

## Install (unpacked, development)

1. Open Chrome → `chrome://extensions`
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select the `browser-extension/` directory from this project
5. Pin the Ridecast icon to your toolbar

## Get your auth token

1. Open [ridecast.app/settings](https://ridecast.app/settings?tab=token)
2. Copy your API token
3. Click the Ridecast icon in Chrome → paste token → Save

## Usage

**Option A — Right-click menu:**
1. Right-click any article page → "Send to Ridecast"
2. Pick a duration in the popup → "Create Episode"

**Option B — Toolbar popup:**
1. Navigate to an article
2. Click the Ridecast toolbar icon
3. Pick a duration → "Create Episode"

## Development

No build step required — plain ES modules.

To reload after editing:
1. Go to `chrome://extensions`
2. Click the refresh icon on the Ridecast card

## API endpoints used

| Endpoint | Method | Purpose |
|---|---|---|
| `POST /api/upload` | POST | Submit URL for content extraction |
| `POST /api/process` | POST | Generate script from extracted content |
| `POST /api/audio/generate` | POST | Kick off TTS audio generation |

All requests use `Authorization: Bearer <token>` header.

## Files

```
manifest.json      — Chrome MV3 manifest
background.js      — Service worker: context menu, API calls, notifications
content-script.js  — Page context reader (stub for future use)
popup/
  popup.html       — Extension popup UI
  popup.js         — Popup logic: auth, duration picker, submit
  popup.css        — Popup styles
icons/
  icon16.png       — 16×16 toolbar icon
  icon48.png       — 48×48 icon (notifications, extensions page)
  icon128.png      — 128×128 icon (Chrome Web Store)
```
```

### 8. Token endpoint (server-side) — `src/app/api/token/route.ts` (new, optional)

Add a page/endpoint at `/settings?tab=token` that displays the user's current Clerk session token as a copyable string. This gives the extension a simple auth flow without OAuth:

```typescript
// src/app/api/token/route.ts
import { currentUser, auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { getToken } = auth();
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json({ token });
}
```

> **Security note:** Clerk session tokens expire. The extension will need to refresh by repeating the paste-token flow when the token expires (typically after 60 days). For v1, this is acceptable.

## Files to Create

| File | Change |
|------|--------|
| `browser-extension/manifest.json` | **New** — Chrome MV3 manifest |
| `browser-extension/background.js` | **New** — service worker: context menu, API calls, notifications |
| `browser-extension/content-script.js` | **New** — page context reader stub |
| `browser-extension/popup/popup.html` | **New** — popup UI |
| `browser-extension/popup/popup.js` | **New** — popup logic |
| `browser-extension/popup/popup.css` | **New** — popup styles |
| `browser-extension/icons/` | **New** — 16/48/128px PNG icons (generate from brand) |
| `browser-extension/README.md` | **New** — install and usage instructions |
| `src/app/api/token/route.ts` | **New** — optional token display endpoint |

## Tests

Manual testing only (Chrome extension testing requires a real browser):

```bash
# Load extension
# 1. Open chrome://extensions → Developer mode ON → Load unpacked → select browser-extension/
# → Extension loads without errors in the Extensions page

# Auth flow
# 2. Click extension icon → auth view shown (no token yet)
# 3. Click "Get Your Token" → opens ridecast.app/settings?tab=token
# 4. Copy token, paste into extension → Save → validates against /api/library → success

# Context menu
# 5. Navigate to any article (e.g., https://theverge.com/article/...)
# 6. Right-click → "Send to Ridecast" appears in context menu
# 7. Click "Send to Ridecast" → popup opens with article hostname in preview

# Duration selection
# 8. Click 15 min → button highlights orange → Create Episode uses 15 min
# 9. Default (10 min) pre-selected on popup open

# Episode creation
# 10. With article URL and duration selected → Create Episode → loading spinner → success message
# 11. Chrome notification: "Added to Ridecast — [title] is being generated"
# 12. Open Ridecast app → Library → episode appears as "Generating"

# Error cases
# 13. Expired/invalid token → /api/upload returns 401 → popup shows error message (not crash)
# 14. Network offline → fetch fails → error message shown
# 15. Sign out (✕ button) → token removed → auth view shown on next open

# Toolbar popup (no right-click)
# 16. Navigate to article → click toolbar icon → hostname shown in URL preview → Create Episode works
```

## Success Criteria

```bash
# Verify extension loads
open -a "Google Chrome" chrome://extensions
# → Ridecast extension listed with no errors

# Verify no manifest errors
# Check Chrome console (Extensions page → Details → Inspect views: service worker)
# → No "Could not load manifest" or permission errors

# Verify API compatibility
# → POST /api/upload accepts JSON body with { url }
# → POST /api/process accepts { contentId, targetMinutes }
# → Both endpoints validate Authorization: Bearer header via Clerk
```

- Extension loads in Chrome without errors or warnings
- Context menu appears on all pages (not just articles)
- API calls use correct `Authorization: Bearer` header
- Success notification fires after episode creation
- Error messages surface clearly — no silent failures
