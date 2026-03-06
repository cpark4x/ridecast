"use client";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProcessingScreen } from "./ProcessingScreen";

// Mock fetch to prevent actual API calls during tests
beforeEach(() => {
  vi.spyOn(global, "fetch").mockResolvedValue({
    ok: false,
    json: async () => ({ error: "test-mode — no real API calls" }),
  } as Response);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderProcessingScreen() {
  return render(
    <ProcessingScreen
      contentId="content-test"
      targetMinutes={15}
      onComplete={vi.fn()}
    />,
  );
}

describe("ProcessingScreen — 4-stage UI", () => {
  it('shows "Analyzing" as the active stage label on initial render', () => {
    renderProcessingScreen();
    // New stage config uses "Analyzing" (not the old "Analyzing content...")
    // It appears in both the active-stage copy area and the step bar
    expect(screen.getAllByText("Analyzing").length).toBeGreaterThanOrEqual(1);
  });

  it("shows the analyzing copy text on initial render", () => {
    renderProcessingScreen();
    expect(
      screen.getByText(/Reading your content/i),
    ).toBeInTheDocument();
  });

  it("renders all 4 stage labels in the step bar", () => {
    renderProcessingScreen();
    // The step bar should always show all 4 stages
    expect(screen.getByText("Scripting")).toBeInTheDocument();
    expect(screen.getByText("Generating Audio")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("does not render old stage label 'Analyzing content...'", () => {
    renderProcessingScreen();
    expect(screen.queryByText(/Analyzing content/)).not.toBeInTheDocument();
  });
});
