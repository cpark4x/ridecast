import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppShell } from "./AppShell";

describe("AppShell", () => {
  it("renders bottom nav with three tabs", () => {
    render(<AppShell />);
    expect(screen.getByText("Upload")).toBeInTheDocument();
    expect(screen.getByText("Library")).toBeInTheDocument();
    expect(screen.getByText("Player")).toBeInTheDocument();
  });

  it("shows upload screen by default", () => {
    render(<AppShell />);
    expect(screen.getByText("Ridecast 2")).toBeInTheDocument();
  });

  it("switches to library screen when Library tab is clicked", () => {
    render(<AppShell />);
    fireEvent.click(screen.getByText("Library"));
    expect(screen.getByText("Library")).toBeInTheDocument();
  });
});
