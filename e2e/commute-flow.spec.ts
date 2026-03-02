import { test, expect } from "@playwright/test";

test.describe("Scenario 3: The Commute Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Seed some library items (assumes seed data exists)
    await page.goto("/");
  });

  test("library → player bar → expanded → car mode → back", async ({ page }) => {
    // Navigate to library
    await page.getByText("Library").click();

    // Wait for items to load
    await expect(page.getByText("Ready").first()).toBeVisible({ timeout: 10000 });

    // Tap first item
    await page.locator('[class*="rounded-\\[14px\\]"]').first().click();

    // Player bar should appear at the bottom
    const playerBar = page.locator(".absolute.bottom-16").first();
    await expect(playerBar).toBeVisible({ timeout: 3000 });

    // Tap player bar to expand
    await playerBar.click();

    // Expanded player should show
    await expect(page.getByText("Now Playing")).toBeVisible();

    // Verify controls exist
    await expect(page.getByText("15s")).toBeVisible();
    await expect(page.getByText("30s")).toBeVisible();
    await expect(page.getByText("Speed")).toBeVisible();

    // Enter Car Mode
    await page.getByText("Car Mode").click();

    // Car mode should show massive play button
    const carPlayBtn = page.locator(".w-\\[140px\\]");
    await expect(carPlayBtn).toBeVisible({ timeout: 3000 });

    // Verify skip buttons exist in car mode
    const skipButtons = page.locator("text=30s");
    await expect(skipButtons.first()).toBeVisible();

    // Test play/pause in car mode
    await carPlayBtn.click();

    // Exit car mode (X button)
    await page.locator("button").filter({ has: page.locator("line") }).first().click();

    // Should be back at expanded player
    await expect(page.getByText("Now Playing")).toBeVisible();

    // Close expanded player
    await page.locator('button:has(polyline[points="6 9 12 15 18 9"])').click();

    // Should see library again
    await expect(page.getByText("Library")).toBeVisible();
  });
});
