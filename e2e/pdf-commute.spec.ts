import { test, expect } from "@playwright/test";
import path from "path";
import { mockAiRoutes } from "./api-mocks";

test.describe("Scenario 1: The PDF Commute", () => {
  test("upload PDF → process → library → play → change speed", async ({ page }) => {
    // Mock AI routes before navigation so intercepts are in place
    await mockAiRoutes(page);

    await page.goto("/");

    // Verify upload screen
    await expect(page.getByText("Ridecast 2")).toBeVisible();
    await expect(page.getByText("Drop files here")).toBeVisible();

    // Upload a PDF file.
    // setInputFiles() on the raw (hidden) <input> is the most reliable
    // Playwright pattern: it bypasses visibility, sets files directly on
    // the element, and dispatches the change event that React's synthetic
    // onChange handler picks up — no need to open a native file chooser.
    // Register the response waiter BEFORE triggering the upload so the
    // promise is in place before the mocked /api/upload response fires.
    const uploadDone = page.waitForResponse("**/api/upload");
    await page.locator('[data-testid="upload-file-input"]').setInputFiles(
      path.resolve(__dirname, "../test-fixtures/sample.pdf")
    );
    // Wait for the mocked /api/upload to respond so setPreview() has been
    // called in React before we assert on the resulting UI.
    await uploadDone;

    // Wait for content preview to appear
    await expect(page.getByText("Target Duration")).toBeVisible({ timeout: 10000 });

    // Select "~15 min" preset (should be default, but click to be sure)
    await page.getByText("~15 min").click();

    // Click "Create Audio"
    await page.getByText("Create Audio").click();

    // Should see processing screen
    await expect(page.getByText("Analyzing content")).toBeVisible({ timeout: 5000 });

    // Wait for processing to complete and transition to library
    await expect(page.getByRole("heading", { name: "Library" })).toBeVisible({ timeout: 60000 });

    // Find the new item in the library
    await expect(page.getByText("Ready").first()).toBeVisible({ timeout: 60000 });

    // Click on the item to play
    await page.getByText("Ready").first().click();

    // Player bar should appear
    await expect(page.getByTestId("player-bar")).toBeVisible({ timeout: 10000 });

    // Expand player
    await page.getByTestId("player-bar").click();

    // Should see expanded player
    await expect(page.getByText("Now Playing")).toBeVisible();

    // Change speed
    await page.getByText("1x").click();
    await expect(page.getByText("1.25x")).toBeVisible();

    // Skip forward
    await page.getByText("30s").click();
  });
});
