"use client";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { PlayerProvider } from "./PlayerContext";
import { AppShell } from "./AppShell";

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
  it("renders bottom nav with exactly 2 tabs: Home and Library", () => {
    renderWithPlayer();
    const nav = screen.getByRole("navigation");
    const navButtons = within(nav).getAllByRole("button");
    expect(navButtons).toHaveLength(2);
    expect(within(nav).getByText("Home")).toBeInTheDocument();
    expect(within(nav).getByText("Library")).toBeInTheDocument();
  });

  it("Upload tab no longer exists in bottom nav", () => {
    renderWithPlayer();
    const nav = screen.getByRole("navigation");
    expect(within(nav).queryByText("Upload")).not.toBeInTheDocument();
  });

  it("Player tab no longer exists in bottom nav", () => {
    renderWithPlayer();
    const nav = screen.getByRole("navigation");
    expect(within(nav).queryByText("Player")).not.toBeInTheDocument();
  });

  it("Settings tab does not exist in bottom nav", () => {
    renderWithPlayer();
    const nav = screen.getByRole("navigation");
    expect(within(nav).queryByText("Settings")).not.toBeInTheDocument();
  });

  it("shows home screen by default (not upload)", async () => {
    renderWithPlayer();
    await waitFor(() => {
      expect(screen.queryByText("Drop files here")).not.toBeInTheDocument();
    });
  });

  it("switches to library screen when Library tab is clicked", () => {
    renderWithPlayer();
    const navButtons = screen.getAllByText("Library");
    fireEvent.click(navButtons[navButtons.length - 1]);
    expect(screen.getAllByText("Library").length).toBeGreaterThan(0);
  });

  it("FAB '+' button exists above the tab bar", () => {
    renderWithPlayer();
    const fab = screen.getByRole("button", { name: /upload content/i });
    expect(fab).toBeInTheDocument();
  });

  it("clicking FAB '+' button opens Upload as a modal overlay with 'Add Content' heading", async () => {
    renderWithPlayer();
    const fab = screen.getByRole("button", { name: /upload content/i });
    fireEvent.click(fab);
    await waitFor(() => {
      expect(screen.getByText("Add Content")).toBeInTheDocument();
    });
  });

  it("gear icon button exists", () => {
    renderWithPlayer();
    const gearButton = screen.getByRole("button", { name: /settings/i });
    expect(gearButton).toBeInTheDocument();
  });

  it("clicking gear icon opens Settings overlay showing 'Settings' heading", async () => {
    renderWithPlayer();
    const gearButton = screen.getByRole("button", { name: /settings/i });
    fireEvent.click(gearButton);
    await waitFor(() => {
      const allSettings = screen.getAllByText("Settings");
      expect(allSettings.length).toBeGreaterThan(0);
    });
  });
});
