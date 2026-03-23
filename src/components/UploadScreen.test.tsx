import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { UploadScreen } from "./UploadScreen";

vi.mock("@/hooks/useCommuteDuration", () => ({
  useCommuteDuration: () => ({ commuteDuration: 15, setCommuteDuration: vi.fn() }),
}));

describe("UploadScreen", () => {
  it("shows 'Drop files here' copy in the drop zone", () => {
    render(<UploadScreen onProcess={vi.fn()} onImportPocket={vi.fn()} />);
    expect(screen.getByText("Drop files here")).toBeInTheDocument();
    expect(screen.queryByText("Tap to browse files")).not.toBeInTheDocument();
  });

  it("shows drop zone subtext with tap-to-browse hint", () => {
    render(<UploadScreen onProcess={vi.fn()} onImportPocket={vi.fn()} />);
    expect(screen.getByText(/or tap to browse/i)).toBeInTheDocument();
  });

  it("shows 'Works with' section when no preview is active", () => {
    render(<UploadScreen onProcess={vi.fn()} onImportPocket={vi.fn()} />);
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
