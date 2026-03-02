import { test, expect } from "@playwright/test";

test.describe("Scenario 2: The Article Discussion", () => {
  test("paste URL → process → conversation format → play", async ({ page }) => {
    await page.goto("/");

    // Paste a URL
    await page.getByPlaceholder("Paste article or newsletter URL").fill(
      "https://paulgraham.com/ds.html"
    );
    await page.getByText("Fetch").click();

    // Wait for content preview
    await expect(page.getByText("Target Duration")).toBeVisible({ timeout: 15000 });

    // Select Main Points ~15 min
    await page.getByText("~15 min").click();

    // Create Audio
    await page.getByText("Create Audio").click();

    // Wait for processing
    await expect(page.getByText("Analyzing content")).toBeVisible({ timeout: 5000 });

    // Should show AI format decision
    await expect(page.getByText(/AI chose:/)).toBeVisible({ timeout: 30000 });

    // Wait for completion and library
    await expect(page.getByText("Library")).toBeVisible({ timeout: 60000 });

    // Verify item is ready
    await expect(page.getByText("Ready").first()).toBeVisible({ timeout: 60000 });

    // Play the item
    await page.getByText("Ready").first().click();

    // Verify player shows
    await expect(page.locator(".absolute.bottom-16")).toBeVisible({ timeout: 5000 });
  });
});
