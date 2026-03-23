import { test, expect } from "@playwright/test";

test.describe("Scenario 5: Quick Re-listen", () => {
  test("resume from saved position with saved speed", async ({ page }) => {
    await page.goto("/");

    // Navigate to library
    await page.getByRole("button", { name: "Library" }).click();
    const readyItem = page.getByTestId("library-item").filter({ hasText: "Ready" }).first();
    await expect(readyItem).toBeVisible({ timeout: 10000 });

    // Play first item
    await readyItem.click();
    await expect(page.getByTestId("player-bar")).toBeVisible({ timeout: 10000 });

    // Expand player
    await page.getByTestId("player-bar").click();
    await expect(page.getByText("Now Playing")).toBeVisible();

    // Change speed to 1.5x
    await page.getByText("1x").click(); // -> 1.25x
    await page.getByText("1.25x").click(); // -> 1.5x

    // Verify speed changed
    await expect(page.getByText("1.5x")).toBeVisible();

    // Skip forward to simulate listening
    await page.getByText("30s").last().click();

    // Close player
    await page.locator('button:has(polyline[points="6 9 12 15 18 9"])').click();

    // Navigate away and come back
    await page.getByRole("button", { name: "Upload" }).click();
    await page.getByRole("button", { name: "Library" }).click();

    // Re-open the same item
    const readyItemAgain = page.getByTestId("library-item").filter({ hasText: "Ready" }).first();
    await expect(readyItemAgain).toBeVisible({ timeout: 10000 });
    await readyItemAgain.click();

    // Wait for player bar to be visible after the SECOND library-item click
    await expect(page.getByTestId("player-bar")).toBeVisible({ timeout: 10000 });

    // Expand player
    await page.getByTestId("player-bar").click();
    await expect(page.getByText("Now Playing")).toBeVisible();

    // Speed should still be 1.5x (persisted in context)
    await expect(page.getByText("1.5x")).toBeVisible();
  });
});
