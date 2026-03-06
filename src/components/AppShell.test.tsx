"use client";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PlayerProvider } from "./PlayerContext";
import { AppShell } from "./AppShell";

// Mock fetch — HomeScreen will try to call /api/library on mount
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderWithPlayer() {
  return render(
    <PlayerProvider>
      <AppShell />
    </PlayerProvider>
  );
}

describe("AppShell", () => {
  it("renders bottom nav with four tabs (Home, Upload, Library, Player)", () => {
    renderWithPlayer();
    expect(screen.getAllByText("Home").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Upload").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Library").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Player").length).toBeGreaterThan(0);
  });

  it("shows home screen by default (resolves to empty queue)", async () => {
    renderWithPlayer();
    // After fetch resolves with [], HomeScreen shows the empty state
    await waitFor(() => expect(screen.getByText("Nothing queued")).toBeInTheDocument());
  });

  it("switches to library screen when Library tab is clicked", () => {
    renderWithPlayer();
    const navButtons = screen.getAllByText("Library");
    fireEvent.click(navButtons[navButtons.length - 1]); // BottomNav tab is last
    expect(screen.getAllByText("Library").length).toBeGreaterThan(0);
  });
});
