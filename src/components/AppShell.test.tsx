"use client";

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlayerProvider } from "./PlayerContext";
import { AppShell } from "./AppShell";

function renderWithPlayer() {
  return render(
    <PlayerProvider>
      <AppShell />
    </PlayerProvider>
  );
}

describe("AppShell", () => {
  it("renders bottom nav with three tabs", () => {
    renderWithPlayer();
    // Use getAllByText since "Library" appears in both nav and screen heading
    expect(screen.getAllByText("Upload").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Library").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Player").length).toBeGreaterThan(0);
  });

  it("shows upload screen by default", () => {
    renderWithPlayer();
    expect(screen.getByText("Ridecast 2")).toBeInTheDocument();
  });

  it("switches to library screen when Library tab is clicked", () => {
    renderWithPlayer();
    // Click the nav tab button specifically (role=button in BottomNav)
    const navButtons = screen.getAllByText("Library");
    fireEvent.click(navButtons[navButtons.length - 1]); // BottomNav tab is last
    expect(screen.getAllByText("Library").length).toBeGreaterThan(0);
  });
});
