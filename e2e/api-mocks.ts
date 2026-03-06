import { type Page } from "@playwright/test";

/**
 * Intercept AI-dependent routes so E2E tests run deterministically
 * without requiring ANTHROPIC_API_KEY or OPENAI_API_KEY.
 *
 * Call this BEFORE page.goto("/").
 *
 * Routes mocked:
 *   POST /api/upload         – returns a minimal Content preview (id/title/wordCount)
 *   GET  /api/library        – returns a deterministic "Ready" library item
 *   POST /api/process        – returns a minimal Script record in "conversation" format
 *   POST /api/audio/generate – returns a minimal Audio record
 */
export async function mockAiRoutes(page: Page): Promise<void> {
  // Mock POST /api/upload (content ingestion)
  await page.route("**/api/upload", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "e2e-mock-content-id",
        title: "sample",
        wordCount: 2000,
      }),
    });
  });

  // Mock GET /api/library (so the Library screen has a deterministic Ready item)
  await page.route("**/api/library", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "e2e-mock-content-id",
          title: "sample",
          sourceType: "pdf",
          createdAt: new Date().toISOString(),
          status: "ready",
          format: "conversation",
          durationSecs: 60,
          audioId: "e2e-mock-audio-id",
          audioUrl: "audio/e2e-mock.mp3",
        },
      ]),
    });
  });

  // Mock POST /api/process (Claude script generation)
  // Small delay so the "Analyzing content..." UI state is visible long
  // enough for Playwright assertions before the stage transitions.
  await page.route("**/api/process", async (route) => {
    await new Promise((r) => setTimeout(r, 200));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "e2e-mock-script-id",
        contentId: "e2e-mock-content-id",
        format: "conversation",
        targetDuration: 15,
        actualWordCount: 2000,
        compressionRatio: 0.5,
        scriptText: "Mock script text for E2E testing.",
        contentType: "article",
        themes: ["technology"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    });
  });

  // Mock POST /api/audio/generate (OpenAI TTS)
  await page.route("**/api/audio/generate", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "e2e-mock-audio-id",
        scriptId: "e2e-mock-script-id",
        filePath: "audio/e2e-mock.mp3",
        durationSecs: 60,
        voices: ["alloy"],
        ttsProvider: "openai",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    });
  });
}
