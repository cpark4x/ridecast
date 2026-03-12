# Feature: Chrome Browser Extension

> Right-click any article → "Send to Ridecast" — a Chrome Manifest V3 extension that sends the current page URL to your library with a duration picker and success notification.

## Motivation

The fastest path to creating an episode is from where you're already reading — the browser. A Chrome extension with a context menu makes Ridecast a one-click action rather than a multi-step copy/paste flow. It captures the "I want to listen to this later" impulse at the exact moment it happens.

## Changes

### 1. Extension structure

```
native/browser-extension/
├── manifest.json           — MV3 manifest
├── background.js           — Service worker (context menu, API calls)
├── popup/
│   ├── popup.html          — Duration picker popup UI
│   ├── popup.js            — Popup logic
│   └── popup.css           — Minimal styles
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md               — Install instructions
```

### 2. Manifest V3 (`manifest.json`)

```json
{
  "manifest_version": 3,
  "name": "Ridecast",
  "description": "Send any article to Ridecast and listen as a podcast episode",
  "version": "1.0.0",
  "permissions": [
    "contextMenus",
    "activeTab",
    "storage",
    "notifications"
  ],
  "host_permissions": [
    "https://ridecast.app/*",
    "https://*.clerk.accounts.dev/*"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### 3. Background service worker (`background.js`)

```javascript
// background.js — MV3 service worker

const API_BASE = "https://ridecast.app"; // production URL

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "send-to-ridecast",
    title: "Send to Ridecast",
    contexts: ["page", "link", "selection"],
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "send-to-ridecast") return;

  const url = info.linkUrl ?? info.pageUrl ?? tab?.url;
  if (!url) return;

  // Store pending URL and open popup for duration selection
  await chrome.storage.session.set({ pendingUrl: url });
  await chrome.action.openPopup();
});

// Message handler — called by popup when user confirms
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "create-episode") {
    createEpisode(message.url, message.duration, message.authToken)
      .then(result => sendResponse({ success: true, result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // keep message channel open for async response
  }
});

async function createEpisode(url, duration, authToken) {
  // Step 1: Upload content
  const uploadResponse = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authToken}`,
    },
    body: JSON.stringify({ url }),
  });

  if (!uploadResponse.ok) {
    const data = await uploadResponse.json();
    throw new Error(data.error ?? `Upload failed: ${uploadResponse.status}`);
  }

  const upload = await uploadResponse.json();

  // Step 2: Kick off processing
  const processResponse = await fetch(`${API_BASE}/api/process`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      contentId: upload.id,
      targetDuration: duration,
      format: "narrative",
    }),
  });

  if (!processResponse.ok) throw new Error("Processing failed");
  const script = await processResponse.json();

  // Step 3: Trigger audio generation (fire and forget — let server handle it)
  fetch(`${API_BASE}/api/audio/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authToken}`,
    },
    body: JSON.stringify({ scriptId: script.id }),
  }).catch(console.warn);

  // Show notification
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon48.png",
    title: "Ridecast",
    message: `"${upload.title}" is being generated. Check your library in ~30 seconds.`,
  });

  return { contentId: upload.id, title: upload.title };
}
```

### 4. Popup UI (`popup/popup.html`)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div id="auth-view" class="hidden">
    <p class="subtitle">Sign in to use Ridecast</p>
    <button id="signin-btn" class="btn-primary">Sign In</button>
  </div>

  <div id="main-view" class="hidden">
    <div class="header">
      <span class="logo">🎙 Ridecast</span>
      <span id="user-email" class="user-email"></span>
    </div>

    <div id="url-preview" class="url-preview"></div>

    <div class="section-label">Episode Duration</div>
    <div class="duration-grid">
      <button class="duration-btn" data-minutes="5">5 min</button>
      <button class="duration-btn selected" data-minutes="10">10 min</button>
      <button class="duration-btn" data-minutes="15">15 min</button>
      <button class="duration-btn" data-minutes="20">20 min</button>
      <button class="duration-btn" data-minutes="30">30 min</button>
    </div>

    <button id="create-btn" class="btn-primary">Create Episode</button>
    <div id="status-msg" class="status"></div>
  </div>

  <div id="loading-view">
    <div class="spinner"></div>
    <p>Creating episode…</p>
  </div>

  <script src="popup.js" type="module"></script>
</body>
</html>
```

### 5. Popup logic (`popup/popup.js`)

```javascript
// popup.js — handles auth state, duration selection, submission

const CLERK_FRONTEND_API = "https://YOUR_CLERK_FRONTEND_API.clerk.accounts.dev";

async function getAuthToken() {
  // Retrieve Clerk session token from storage
  const { clerkToken } = await chrome.storage.local.get("clerkToken");
  return clerkToken ?? null;
}

async function init() {
  const token = await getAuthToken();
  const { pendingUrl } = await chrome.storage.session.get("pendingUrl");

  if (!token) {
    showView("auth-view");
    document.getElementById("signin-btn").addEventListener("click", handleSignIn);
    return;
  }

  // Show main view
  showView("main-view");

  if (pendingUrl) {
    const urlPreview = document.getElementById("url-preview");
    try {
      urlPreview.textContent = new URL(pendingUrl).hostname;
    } catch {
      urlPreview.textContent = pendingUrl.slice(0, 60);
    }
  }

  // Duration selection
  let selectedDuration = 10;
  document.querySelectorAll(".duration-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".duration-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedDuration = parseInt(btn.dataset.minutes);
    });
  });

  // Create episode
  document.getElementById("create-btn").addEventListener("click", async () => {
    const url = pendingUrl ?? (await getCurrentTabUrl());
    if (!url) return;

    showView("loading-view");

    const response = await chrome.runtime.sendMessage({
      type: "create-episode",
      url,
      duration: selectedDuration,
      authToken: token,
    });

    if (response.success) {
      showStatus(`✓ "${response.result.title}" added to your library`, "success");
      setTimeout(() => window.close(), 2000);
    } else {
      showView("main-view");
      showStatus(`Error: ${response.error}`, "error");
    }
  });
}

async function handleSignIn() {
  // Open Ridecast web app for auth, then store token
  chrome.tabs.create({ url: "https://ridecast.app/sign-in?source=extension" });
  window.close();
}

function showView(viewId) {
  document.querySelectorAll("[id$='-view']").forEach(v => v.classList.add("hidden"));
  document.getElementById(viewId).classList.remove("hidden");
}

async function getCurrentTabUrl() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.url;
}

function showStatus(msg, type) {
  const el = document.getElementById("status-msg");
  el.textContent = msg;
  el.className = `status ${type}`;
}

init();
```

### 6. Authentication flow

The extension uses Clerk for auth. Since Chrome extensions can't embed Clerk's hosted UI, the flow is:

1. User clicks "Sign In" → opens `https://ridecast.app/sign-in?source=extension`
2. User signs in on the web app
3. Web app detects `source=extension` query param and posts the session token to the extension via `chrome.runtime.sendMessage` (requires the extension ID to be whitelisted)
4. Extension stores the token in `chrome.storage.local`

**Web app addition** (`src/app/sign-in/[[...sign-in]]/page.tsx`):
```typescript
// After successful sign-in, if source=extension:
// window.postMessage or use chrome.runtime.sendMessage with the extension ID
// The extension ID must be known at build time or discovered via extension API
```

> **Alternative simpler approach:** Use a token generation page at `https://ridecast.app/extension-token` that shows the user their API token (or a short-lived token) which they paste into the extension popup. Simpler to implement, less seamless UX.

**Recommendation:** Start with the "paste token" approach for v1. The OAuth-style flow requires publishing the extension to the Chrome Web Store first to get a stable extension ID.

### 7. API: authenticate extension requests

Extension requests use the same Clerk Bearer token that the iOS app uses. The existing `/api/upload`, `/api/process`, `/api/audio/generate` routes already validate `Authorization: Bearer <token>` via Clerk middleware. No API changes needed.

### 8. Popup CSS (`popup/popup.css`)

```css
body { width: 300px; min-height: 200px; font-family: -apple-system, sans-serif; padding: 16px; margin: 0; }
.hidden { display: none !important; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.logo { font-weight: 700; font-size: 16px; }
.user-email { font-size: 11px; color: #9CA3AF; }
.url-preview { font-size: 12px; color: #6B7280; background: #F3F4F6; border-radius: 8px; padding: 6px 8px; margin-bottom: 12px; }
.section-label { font-size: 11px; font-weight: 600; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
.duration-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; margin-bottom: 14px; }
.duration-btn { border: 1px solid #E5E7EB; background: #F9FAFB; border-radius: 8px; padding: 6px 2px; font-size: 11px; cursor: pointer; }
.duration-btn.selected { background: #EA580C; border-color: #EA580C; color: white; font-weight: 600; }
.btn-primary { width: 100%; background: #EA580C; color: white; border: none; border-radius: 10px; padding: 10px; font-size: 14px; font-weight: 600; cursor: pointer; }
.status { margin-top: 8px; font-size: 12px; text-align: center; }
.status.success { color: #16A34A; }
.status.error { color: #DC2626; }
#loading-view { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 20px; }
.spinner { width: 28px; height: 28px; border: 3px solid #F3F4F6; border-top: 3px solid #EA580C; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
```

## Files to Create/Modify

| File | Change |
|------|--------|
| `native/browser-extension/manifest.json` | New — MV3 manifest |
| `native/browser-extension/background.js` | New — service worker: context menu, API calls, notifications |
| `native/browser-extension/popup/popup.html` | New — duration picker UI |
| `native/browser-extension/popup/popup.js` | New — popup logic, auth, submit |
| `native/browser-extension/popup/popup.css` | New — popup styles |
| `native/browser-extension/icons/` | New — 16/48/128px PNG icons |
| `native/browser-extension/README.md` | New — install and development instructions |

## Tests

Manual testing (Chrome extension testing):
- [ ] Load unpacked extension in `chrome://extensions`
- [ ] Right-click any article → "Send to Ridecast" appears in context menu
- [ ] Context menu click opens popup with URL preview
- [ ] Duration selection highlights correctly
- [ ] "Create Episode" → loading state → success notification
- [ ] Episode appears in Ridecast library within 30-60 seconds
- [ ] Error case (invalid URL, network failure) → readable error message
- [ ] Not signed in → sign-in prompt shown

## Success Criteria

- Extension loads in Chrome without errors
- Context menu appears on all pages (not just articles)
- API calls use correct Authorization header
- Episode creation works end-to-end

## Scope

- **Chrome only** — no Firefox/Safari extension in this spec
- **No** automatic syncing/background refresh of library
- **No** extension-side article preview or reading
- **No** full OAuth flow — "paste token" auth is acceptable for v1
- **No** Chrome Web Store submission in this spec
- Extension lives in `native/browser-extension/` but is a standalone static web project (no build step required — plain JS)
