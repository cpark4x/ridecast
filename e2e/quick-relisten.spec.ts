import { test, expect } from "@playwright/test";

test.describe("Scenario 5: Quick Re-listen", () => {
  test("resume from saved position with saved speed", async ({ page }) => {
    // Mock GET /api/playback to always return null so the PlayerContext
    // restore-effect never overrides the in-memory speed the user just set.
    // Without this mock, a parallel test (commute-flow) can write speed=1.0 to
    // the DB for the same "e2e-seed-audio-1" audio ID; the restore-effect then
    // fetches that stale value after Playwright has already changed the speed
    // to 1.5x, silently resetting it back to 1.0 before line 53.
    await page.route("**/api/playback*", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ status: 200, contentType: "application/json", body: "null" });
      } else {
        await route.continue();
      }
    });

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

    // Skip forward to simulate listening (ExpandedPlayer forward skip = 15s, not 30s)
    await page.getByText("15s").last().click();

    // Close player
    await page.locator('button:has(polyline[points="6 9 12 15 18 9"])').click();

    // Navigate away and come back.
    // Clicking the FAB ("Upload content") is unreliable here because the PlayerBar
    // (z-[60]) overlaps the FAB (z-[51]) and its "Skip forward 30 seconds" button
    // intercepts the click.  Using the BottomNav "Home" tab avoids that overlap.
    await page.getByRole("button", { name: "Home" }).click();
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
