import { type Page } from "@playwright/test";

/**
 * Intercept AI-dependent routes so E2E tests run deterministically
 * without requiring ANTHROPIC_API_KEY or OPENAI_API_KEY.
 *
 * Call this BEFORE page.goto("/").
 *
 * Routes mocked:
 *   POST /api/process        – returns a minimal Script record in "conversation" format
 *   POST /api/audio/generate – returns a minimal Audio record
 */
export async function mockAiRoutes(page: Page): Promise<void> {
  // Mock POST /api/process (Claude script generation)
  await page.route("**/api/process", async (route) => {
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
