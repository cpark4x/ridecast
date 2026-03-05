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

    // Upload a PDF file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(
      path.resolve(__dirname, "../test-fixtures/sample.pdf")
    );

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
