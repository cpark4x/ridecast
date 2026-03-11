import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProcessNewVersionModal } from "./ProcessNewVersionModal";

const mockOnClose = vi.fn();
const mockOnVersionCreated = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ scriptId: "new-1" }),
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const defaultProps = {
  isOpen: true,
  contentId: "content-abc",
  contentTitle: "Psychology of Decision Making",
  onClose: mockOnClose,
  onVersionCreated: mockOnVersionCreated,
};

describe("ProcessNewVersionModal", () => {
  it("renders nothing when isOpen=false", () => {
    const { container } = render(
      <ProcessNewVersionModal {...defaultProps} isOpen={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows content title", () => {
    render(<ProcessNewVersionModal {...defaultProps} />);
    expect(screen.getByText("Psychology of Decision Making")).toBeInTheDocument();
  });

  it("shows preset buttons: 2, 3, 5, 15, 30 min", () => {
    render(<ProcessNewVersionModal {...defaultProps} />);
    expect(screen.getByRole("button", { name: "2 min" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3 min" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "5 min" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "15 min" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "30 min" })).toBeInTheDocument();
  });

  it("shows Generate button", () => {
    render(<ProcessNewVersionModal {...defaultProps} />);
    expect(screen.getByRole("button", { name: /generate/i })).toBeInTheDocument();
  });

  it("has 5 min selected by default", () => {
    render(<ProcessNewVersionModal {...defaultProps} />);
    const btn = screen.getByRole("button", { name: "5 min" });
    // The selected button should have the accent background class
    expect(btn.className).toMatch(/from-\[#EA580C\]|accent/i);
  });

  it("changes selected preset on click", () => {
    render(<ProcessNewVersionModal {...defaultProps} />);
    const btn15 = screen.getByRole("button", { name: "15 min" });
    fireEvent.click(btn15);
    expect(btn15.className).toMatch(/from-\[#EA580C\]|accent/i);
    // 5 min should no longer have the accent class
    const btn5 = screen.getByRole("button", { name: "5 min" });
    expect(btn5.className).not.toMatch(/from-\[#EA580C\]/);
  });

  it("POSTs to /api/process with contentId and targetMinutes on Generate", async () => {
    render(<ProcessNewVersionModal {...defaultProps} />);
    // Select 15 min
    fireEvent.click(screen.getByRole("button", { name: "15 min" }));
    // Click Generate
    fireEvent.click(screen.getByRole("button", { name: /generate/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId: "content-abc", targetMinutes: 15 }),
      });
    });
  });

  it("calls onVersionCreated after successful API call", async () => {
    render(<ProcessNewVersionModal {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /generate/i }));

    await waitFor(() => {
      expect(mockOnVersionCreated).toHaveBeenCalledTimes(1);
    });
  });

  it("calls onClose when X button clicked", () => {
    render(<ProcessNewVersionModal {...defaultProps} />);
    const closeBtn = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("shows 'Generating…' loading state while fetch pending", async () => {
    // Make fetch never resolve during this test
    let resolvePromise: (value: Response) => void;
    const pendingFetch = new Promise<Response>((resolve) => {
      resolvePromise = resolve;
    });
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(pendingFetch));

    render(<ProcessNewVersionModal {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /generate/i }));

    await waitFor(() => {
      expect(screen.getByText(/generating/i)).toBeInTheDocument();
    });

    // Clean up: resolve the pending fetch
    resolvePromise!({ ok: true, json: async () => ({ scriptId: "new-1" }) } as Response);
  });
});
