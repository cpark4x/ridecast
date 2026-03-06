"use client";

import { useEffect, useRef, useState } from "react";

interface ProcessingScreenProps {
  contentId: string;
  targetMinutes: number;
  onComplete: (scriptId: string) => void;
}

type Stage = "analyzing" | "compressing" | "generating" | "done";

export function ProcessingScreen({ contentId, targetMinutes, onComplete }: ProcessingScreenProps) {
  const [stage, setStage] = useState<Stage>("analyzing");
  const [progress, setProgress] = useState(0);
  const [format, setFormat] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Ref-guard prevents React Strict Mode from double-firing the pipeline.
  // Without this, two /api/process calls are made (creating duplicate scripts).
  const runningRef = useRef(false);

  useEffect(() => {
    // Skip if already running (Strict Mode re-mount).
    if (runningRef.current) return;
    runningRef.current = true;

    const abort = new AbortController();
    setError(null);

    async function run() {
      try {
        // Step 1: Analyze + generate script
        setStage("analyzing");
        setProgress(15);

        const processRes = await fetch("/api/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentId, targetMinutes }),
          signal: abort.signal,
        });
        const processData = await processRes.json();

        if (abort.signal.aborted) return;
        if (!processRes.ok) throw new Error(processData.error);

        setStage("compressing");
        setProgress(40);
        setFormat(processData.format === "conversation" ? "Conversation" : "Narrator");

        // Small delay for UX
        await new Promise((r) => setTimeout(r, 800));
        if (abort.signal.aborted) return;

        setProgress(60);
        setStage("generating");

        // Step 2: Generate audio
        const audioRes = await fetch("/api/audio/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scriptId: processData.id }),
          signal: abort.signal,
        });
        const audioData = await audioRes.json();

        if (abort.signal.aborted) return;
        if (!audioRes.ok) throw new Error(audioData.error);

        setProgress(100);
        setStage("done");

        await new Promise((r) => setTimeout(r, 600));
        if (abort.signal.aborted) return;

        onComplete(processData.id);
      } catch (err) {
        // Ignore abort errors (normal cleanup).
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (!abort.signal.aborted) {
          console.error("Processing failed:", err);
          setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
        }
      }
    }

    run();
    return () => { abort.abort(); runningRef.current = false; };
  }, [contentId, targetMinutes, onComplete, attempt]);

  const stages: { id: Stage; label: string }[] = [
    { id: "analyzing", label: "Analyzing content..." },
    { id: "compressing", label: `Compressing to ${targetMinutes} minutes...` },
    { id: "generating", label: "Generating audio..." },
  ];

  const stageOrder: Stage[] = ["analyzing", "compressing", "generating", "done"];
  const currentIndex = stageOrder.indexOf(stage);

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-10">
      {/* Artwork */}
      <div
        className="w-[120px] h-[120px] rounded-[28px] flex items-center justify-center mb-9"
        style={{
          background: "linear-gradient(135deg, #6366f1, #8b5cf6, #c084fc)",
          backgroundSize: "200% 200%",
          animation: "gradientShift 3s ease infinite",
          boxShadow: "0 0 60px rgba(99,102,241,0.3)",
        }}
      >
        <svg viewBox="0 0 24 24" className="w-12 h-12 fill-white opacity-90">
          <path d="M9 18V5l12-2v13" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="6" cy="18" r="3" opacity="0.7" />
          <circle cx="18" cy="16" r="3" opacity="0.7" />
        </svg>
      </div>

      {/* Stages */}
      <div className="w-full max-w-[280px] mb-8">
        {stages.map(({ id, label }, i) => {
          const stageIdx = stageOrder.indexOf(id);
          const isDone = currentIndex > stageIdx;
          const isActive = currentIndex === stageIdx;

          return (
            <div key={id} className="flex items-center gap-3 py-2.5 transition-all">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                isDone ? "border-green-500 bg-green-500/15" : isActive ? "border-indigo-500 bg-indigo-500/20" : "border-white/[0.08] bg-white/[0.06]"
              } ${isActive ? "animate-[pulseDot_1.5s_ease_infinite]" : ""}`}>
                <svg viewBox="0 0 24 24" className={`w-3 h-3 fill-none stroke-2 ${isDone ? "stroke-green-500" : "stroke-white/30"}`} strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className={`text-sm font-medium transition-all ${
                isDone ? "text-white/55" : isActive ? "text-white" : "text-white/30"
              }`}>{label}</span>
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-[280px] h-1 bg-white/[0.08] rounded-sm overflow-hidden mb-5">
        <div
          className="h-full rounded-sm transition-[width] duration-500 ease-out"
          style={{ width: `${progress}%`, background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }}
        />
      </div>

      {/* Error State */}
      {error && (
        <div className="w-full max-w-[280px] mb-6 text-center">
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setStage("analyzing");
              setProgress(0);
              setFormat(null);
              setAttempt((a) => a + 1);
            }}
            className="px-5 py-2 rounded-full text-sm font-semibold bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Format Badge */}
      {format && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/15 text-violet-400 transition-opacity">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          AI chose: {format} style
        </span>
      )}
    </div>
  );
}
