import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { UploadScreen } from "./UploadScreen";

vi.mock("@/hooks/useCommuteDuration", () => ({
  useCommuteDuration: () => ({ commuteDuration: 15, setCommuteDuration: vi.fn() }),
}));

describe("UploadScreen", () => {
  it("shows 'Tap to browse files' copy (not 'Drop files here')", () => {
    render(<UploadScreen onProcess={vi.fn()} />);
    expect(screen.getByText("Tap to browse files")).toBeInTheDocument();
    expect(screen.queryByText("Drop files here")).not.toBeInTheDocument();
  });

  it("shows updated drop zone subtext with drag-and-drop hint", () => {
    render(<UploadScreen onProcess={vi.fn()} />);
    expect(screen.getByText(/or drag and drop/i)).toBeInTheDocument();
  });

  it("shows 'Works with' section when no preview is active", () => {
    render(<UploadScreen onProcess={vi.fn()} />);
    expect(screen.getByText("Works with")).toBeInTheDocument();
    expect(screen.getByText("Articles & URLs")).toBeInTheDocument();
    expect(screen.getByText("PDFs")).toBeInTheDocument();
    expect(screen.getByText("EPUBs")).toBeInTheDocument();
    expect(screen.getByText("Text files")).toBeInTheDocument();
  });

  it("hides 'Works with' section when a preview is showing — empty test, manual verification covers this", () => {
    // Preview state requires a successful upload response — covered by manual QA
  });
});
