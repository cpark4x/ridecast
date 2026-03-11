import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UploadModal } from "./UploadModal";

// Mock UploadScreen — renders stub content and a button that triggers onProcess
let capturedOnProcess: ((contentId: string, targetMinutes: number) => void) | null = null;
let capturedOnImportPocket: (() => void) | null = null;

vi.mock("./UploadScreen", () => ({
  UploadScreen: ({ onProcess, onImportPocket }: { onProcess: (id: string, mins: number) => void; onImportPocket: () => void }) => {
    capturedOnProcess = onProcess;
    capturedOnImportPocket = onImportPocket;
    return <div data-testid="upload-form">Upload Form Content</div>;
  },
}));

const mockOnClose = vi.fn();
const mockOnProcess = vi.fn();
const mockOnImportPocket = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  capturedOnProcess = null;
  capturedOnImportPocket = null;
});

describe("UploadModal", () => {
  it("renders nothing when isOpen=false", () => {
    const { container } = render(
      <UploadModal isOpen={false} onClose={mockOnClose} onProcess={mockOnProcess} onImportPocket={mockOnImportPocket} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders 'Add Content' heading when isOpen=true", () => {
    render(
      <UploadModal isOpen={true} onClose={mockOnClose} onProcess={mockOnProcess} onImportPocket={mockOnImportPocket} />
    );
    expect(screen.getByText("Add Content")).toBeInTheDocument();
  });

  it("renders UploadScreen form content inside modal", () => {
    render(
      <UploadModal isOpen={true} onClose={mockOnClose} onProcess={mockOnProcess} onImportPocket={mockOnImportPocket} />
    );
    expect(screen.getByTestId("upload-form")).toBeInTheDocument();
    expect(screen.getByText("Upload Form Content")).toBeInTheDocument();
  });

  it("calls onClose when X button clicked", () => {
    render(
      <UploadModal isOpen={true} onClose={mockOnClose} onProcess={mockOnProcess} onImportPocket={mockOnImportPocket} />
    );
    const closeBtn = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop clicked", () => {
    render(
      <UploadModal isOpen={true} onClose={mockOnClose} onProcess={mockOnProcess} onImportPocket={mockOnImportPocket} />
    );
    const backdrop = screen.getByTestId("upload-modal-backdrop");
    fireEvent.click(backdrop);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("calls onProcess(contentId, mins) when form submits", () => {
    render(
      <UploadModal isOpen={true} onClose={mockOnClose} onProcess={mockOnProcess} onImportPocket={mockOnImportPocket} />
    );
    // Simulate the UploadScreen calling onProcess
    expect(capturedOnProcess).not.toBeNull();
    capturedOnProcess!("content-123", 15);
    expect(mockOnProcess).toHaveBeenCalledWith("content-123", 15);
  });

  it("has a drag handle at top", () => {
    render(
      <UploadModal isOpen={true} onClose={mockOnClose} onProcess={mockOnProcess} onImportPocket={mockOnImportPocket} />
    );
    expect(screen.getByTestId("drag-handle")).toBeInTheDocument();
  });
});
