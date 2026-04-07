import { test, expect } from "@playwright/test";
import { mockAiRoutes } from "./api-mocks";

test.describe("Scenario 2: The Article Discussion", () => {
  test("paste URL → process → conversation format → play", async ({ page }) => {
    // ProcessingScreen has a 15 s auto-complete delay in E2E mode so Playwright
    // can assert "AI chose:" before the tab switches.  Allow 60 s total.
    test.setTimeout(60_000);

    // Mock AI routes before navigation so intercepts are in place
    await mockAiRoutes(page);

    await page.goto("/");

    // Open the upload modal (UploadScreen now lives inside a bottom-sheet modal
    // opened via the FAB — the app starts on HomeScreen, not UploadScreen directly)
    await page.getByRole("button", { name: "Upload" }).click();

    // Paste a URL
    await page.getByPlaceholder("Paste article or newsletter URL...").fill(
      "https://paulgraham.com/ds.html"
    );
    // Set up the response waiter BEFORE clicking so the promise is registered
    // before the network request fires — avoids a race where the mocked
    // response resolves before waitForResponse() is attached.
    const uploadDone = page.waitForResponse("**/api/upload");
    await page.getByText("Fetch").click();
    // Confirm the mocked /api/upload has responded so setPreview() in React
    // has already been called before we assert on the resulting UI.
    await uploadDone;

    // Wait for content preview
    await expect(page.getByText("Target Duration")).toBeVisible({ timeout: 15000 });

    // Select Main Points ~15 min
    await page.getByText("~15 min").click();

    // Create Audio
    await page.getByText("Create Audio").click();

    // Wait for processing and AI format decision in a single assertion.
    // The mock /api/process responds in ~200ms; "AI chose:" appears then and
    // stays visible for the full auto-complete window.  Using one 15 s timeout
    // avoids the stacked 5 s + 10 s race that was consuming the window in CI.
    await expect(page.getByText(/AI chose:/)).toBeVisible({ timeout: 15000 });

    // Wait for completion and library
    await expect(page.getByRole("heading", { name: "Library" })).toBeVisible({ timeout: 30000 });

    // Verify item is ready in the library.
    // HomeScreen also fetches library data, so scope to library-item testids
    // which only exist in LibraryScreen — avoids clicking a hidden element.
    await expect(page.getByTestId("library-item").first()).toBeVisible({ timeout: 60000 });

    // Play the item
    await page.getByTestId("library-item").first().click();

    // Verify player shows
    await expect(page.getByTestId("player-bar")).toBeVisible({ timeout: 10000 });
  });
});
