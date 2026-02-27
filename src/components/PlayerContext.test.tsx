import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlayerProvider, usePlayer } from "./PlayerContext";

function TestComponent() {
  const { currentItem, isPlaying, speed, play, togglePlay, setSpeed } = usePlayer();
  return (
    <div>
      <span data-testid="playing">{isPlaying ? "yes" : "no"}</span>
      <span data-testid="speed">{speed}</span>
      <span data-testid="title">{currentItem?.title ?? "none"}</span>
      <button onClick={() => play({ id: "1", title: "Test Audio", duration: 768, format: "narrator", audioUrl: "/audio/test.mp3" })}>
        Play
      </button>
      <button onClick={togglePlay}>Toggle</button>
      <button onClick={() => setSpeed(1.5)}>Speed 1.5</button>
    </div>
  );
}

describe("PlayerContext", () => {
  it("starts with nothing playing", () => {
    render(<PlayerProvider><TestComponent /></PlayerProvider>);
    expect(screen.getByTestId("playing").textContent).toBe("no");
    expect(screen.getByTestId("title").textContent).toBe("none");
  });

  it("plays an item", () => {
    render(<PlayerProvider><TestComponent /></PlayerProvider>);
    fireEvent.click(screen.getByText("Play"));
    expect(screen.getByTestId("playing").textContent).toBe("yes");
    expect(screen.getByTestId("title").textContent).toBe("Test Audio");
  });

  it("toggles play/pause", () => {
    render(<PlayerProvider><TestComponent /></PlayerProvider>);
    fireEvent.click(screen.getByText("Play"));
    expect(screen.getByTestId("playing").textContent).toBe("yes");
    fireEvent.click(screen.getByText("Toggle"));
    expect(screen.getByTestId("playing").textContent).toBe("no");
  });

  it("changes speed", () => {
    render(<PlayerProvider><TestComponent /></PlayerProvider>);
    fireEvent.click(screen.getByText("Speed 1.5"));
    expect(screen.getByTestId("speed").textContent).toBe("1.5");
  });
});
