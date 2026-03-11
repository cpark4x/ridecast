"use client";

import { useEffect, useRef, useState } from "react";
import { useElevenLabsKey } from "./SettingsScreen";

interface ProcessingScreenProps {
  contentId: string;
  targetMinutes: number;
  onComplete: (audioId: string) => void;
}

type Stage = "analyzing" | "scripting" | "generating" | "ready";

interface AudioRecord {
  id: string;
  durationSecs: number;
}

interface ScriptRecord {
  id: string;
  contentType?: string;
  format: string;
  durationAdvisory?: string | null;
}

const STAGE_CONFIG = {
  analyzing: {
    icon: "🔍",
    label: "Analyzing",
    copy: "Reading your content — extracting key ideas and structure",
  },
  scripting: {
    icon: "✍️",
    label: "Scripting",
    copy: "Writing your episode — shaping key ideas into narrative",
  },
  generating: {
    icon: "🎙️",
    label: "Generating Audio",
    copy: "Recording your episode — this takes 20–40 seconds",
  },
  ready: {
    icon: "✅",
    label: "Ready",
    copy: null,
  },
} as const;

const STAGE_ORDER: Stage[] = ["analyzing", "scripting", "generating", "ready"];

export function ProcessingScreen({ contentId, targetMinutes, onComplete }: ProcessingScreenProps) {
  const [stage, setStage] = useState<Stage>("analyzing");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [errorStage, setErrorStage] = useState<"processing" | "audio" | null>(null);
  const [scriptRecord, setScriptRecord] = useState<ScriptRecord | null>(null);
  const [audioRecord, setAudioRecord] = useState<AudioRecord | null>(null);
  const [durationAdvisory, setDurationAdvisory] = useState<string | null>(null);
  const [retryingAudio, setRetryingAudio] = useState(false);
  const elevenLabsKey = useElevenLabsKey();

  // Ref-guard prevents React Strict Mode from double-firing the pipeline.
  // Without this, two /api/process calls are made (creating duplicate scripts).
  const runningRef = useRef(false);

  // Advance from analyzing → scripting after 3s (while /api/process is running)
  useEffect(() => {
    const timer = setTimeout(() => {
      setStage((prev) => (prev === "analyzing" ? "scripting" : prev));
    }, 3000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  useEffect(() => {
    // Skip if already running (Strict Mode re-mount)
    if (runningRef.current) return;
    runningRef.current = true;

    const abort = new AbortController();
    setError(null);
    setErrorStage(null);
    setStage("analyzing");

    async function run() {
      try {
        // Step 1: Analyze + generate script
        const processRes = await fetch("/api/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentId, targetMinutes }),
          signal: abort.signal,
        });
        const processData = await processRes.json();

        if (abort.signal.aborted) return;
        if (!processRes.ok) {
          setErrorStage("processing");
          throw new Error(processData.error || "Script generation failed. Please try again.");
        }

        setScriptRecord(processData);
        if (processData.durationAdvisory) setDurationAdvisory(processData.durationAdvisory);

        // Advance to generating (before starting audio call)
        setStage("generating");

        // Step 2: Generate audio
        const generateHeaders: HeadersInit = { "Content-Type": "application/json" };
        if (elevenLabsKey) generateHeaders["x-elevenlabs-key"] = elevenLabsKey;
        const audioRes = await fetch("/api/audio/generate", {
          method: "POST",
          headers: generateHeaders,
          body: JSON.stringify({ scriptId: processData.id }),
          signal: abort.signal,
        });
        const audioData = await audioRes.json();

        if (abort.signal.aborted) return;
        if (!audioRes.ok) {
          setErrorStage("audio");
          throw new Error(audioData.error || "Audio generation failed. Please try again.");
        }

        setAudioRecord(audioData);
        setStage("ready");
      } catch (err) {
        // Ignore abort errors (normal cleanup)
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

  // Auto-navigate to library once audio is ready — tests and normal flow
  // both expect the transition to happen without requiring a button click.
  // In E2E test mode (NEXT_PUBLIC_E2E_TEST_MODE=true) use a longer delay so
  // Playwright assertions can run before the tab switches; in production 1 500 ms
  // is imperceptible (real API calls take 30–60 s before this fires).
  const autoCompleteDelay =
    process.env.NEXT_PUBLIC_E2E_TEST_MODE === "true" ? 15000 : 1500;

  useEffect(() => {
    if (stage !== "ready" || !audioRecord) return;
    const timer = setTimeout(() => {
      onComplete(audioRecord.id);
    }, autoCompleteDelay);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, audioRecord, onComplete]);

  async function handleRetryAudio() {
    if (!scriptRecord?.id || retryingAudio) return;
    setRetryingAudio(true);
    setError(null);
    setErrorStage(null);
    setStage("generating");
    try {
      const retryHeaders: HeadersInit = { "Content-Type": "application/json" };
      if (elevenLabsKey) retryHeaders["x-elevenlabs-key"] = elevenLabsKey;
      const audioRes = await fetch("/api/audio/generate", {
        method: "POST",
        headers: retryHeaders,
        body: JSON.stringify({ scriptId: scriptRecord.id }),
      });
      const audioData = await audioRes.json();
      if (!audioRes.ok) {
        setErrorStage("audio");
        setError(audioData.error || "Audio generation failed. Please try again.");
        return;
      }
      setAudioRecord(audioData);
      setStage("ready");
    } catch (err) {
      setErrorStage("audio");
      setError(err instanceof Error ? err.message : "Audio generation failed. Please try again.");
    } finally {
      setRetryingAudio(false);
    }
  }

  function addToQueue(audioId: string) {
    // Stub: queue management is a future feature
    console.log("[queue] Added to queue:", audioId);
  }

  const currentIndex = STAGE_ORDER.indexOf(stage);
  const activeConfig = STAGE_CONFIG[stage];

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-10">
      {/* Artwork */}
      <div
        className="w-[120px] h-[120px] rounded-[28px] flex items-center justify-center mb-9"
        style={{
          background: "linear-gradient(135deg, #EA580C, #F97316, #FCD34D)",
          backgroundSize: "200% 200%",
          animation: stage === "ready" ? "none" : "gradientShift 3s ease infinite",
          boxShadow: "0 0 60px rgba(234,88,12,0.3)",
        }}
      >
        {stage === "ready" ? (
          <span className="text-4xl">✅</span>
        ) : (
          <svg viewBox="0 0 24 24" className="w-12 h-12 fill-white opacity-90">
            <path d="M9 18V5l12-2v13" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="6" cy="18" r="3" opacity="0.7" />
            <circle cx="18" cy="16" r="3" opacity="0.7" />
          </svg>
        )}
      </div>

      {/* Stage Display — active stage copy */}
      {stage !== "ready" && !error && (
        <div className="text-center mb-8 w-full max-w-[280px]">
          <p className="text-lg font-bold text-[#18181A] mb-1">{activeConfig.label}</p>
          {activeConfig.copy && (
            <p className="text-sm text-[var(--text-mid)] leading-snug">{activeConfig.copy}</p>
          )}
        </div>
      )}

      {/* 4-Step Progress Bar */}
      <div className="w-full max-w-[280px] mb-8">
        {STAGE_ORDER.map((s) => {
          const stepIdx = STAGE_ORDER.indexOf(s);
          const isDone = currentIndex > stepIdx;
          const isActive = currentIndex === stepIdx;
          const config = STAGE_CONFIG[s];

          return (
            <div key={s} className="flex items-center gap-3 py-2 transition-all">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                isDone ? "border-green-500 bg-green-500/15" : isActive ? "border-[#EA580C] bg-[#EA580C]/20" : "border-black/[0.08] bg-black/[0.04]"
              } ${isActive && stage !== "ready" ? "animate-[pulseDot_1.5s_ease_infinite]" : ""}`}>
                <svg viewBox="0 0 24 24" className={`w-3 h-3 fill-none stroke-2 ${isDone ? "stroke-green-500" : "stroke-black/30"}`} strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className={`text-sm font-medium transition-all ${
                isDone ? "text-[var(--text-mid)]" : isActive ? "text-[#18181A]" : "text-[var(--text-dim)]"
              }`}>{config.label}</span>
            </div>
          );
        })}
      </div>

      {/* AI format decision — shown once the script is generated and stays
          visible through the ready state so tests / users can see the choice */}
      {scriptRecord && (
        <p className="text-sm text-[#EA580C]/80 mb-4 text-center">
          AI chose: {scriptRecord.format}
        </p>
      )}

      {/* Ready State — Episode Card */}
      {stage === "ready" && audioRecord && (
        <div className="w-full max-w-[280px] bg-white border border-black/[0.07] rounded-[14px] p-5 mb-4">
          <div className="text-center mb-4">
            <div className="text-[13px] text-[var(--text-mid)] uppercase tracking-wider font-semibold mb-0.5">
              {scriptRecord?.contentType?.replace(/_/g, " ") ?? "Episode"}
            </div>
            <div className="text-[var(--text-mid)] text-xs">
              ~{Math.round(audioRecord.durationSecs / 60)} min
            </div>
          </div>
          <button
            onClick={() => onComplete(audioRecord.id)}
            className="w-full py-3 rounded-[10px] text-sm font-semibold text-white bg-gradient-to-br from-[#EA580C] to-[#F97316] shadow-[0_4px_20px_rgba(234,88,12,0.35)] hover:shadow-[0_6px_28px_rgba(234,88,12,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mb-2"
          >
            ▶ Play Now
          </button>
          <button
            onClick={() => { addToQueue(audioRecord.id); onComplete(audioRecord.id); }}
            className="w-full py-3 rounded-[10px] text-sm font-semibold text-[var(--text-mid)] bg-[var(--surface-2)] border border-black/[0.07] hover:bg-[var(--surface-2)]/80 active:scale-[0.98] transition-all"
          >
            Add to Queue
          </button>

          {/* Duration Advisory */}
          {durationAdvisory && (
            <div className="text-xs text-[var(--amber)] text-center mt-3 leading-snug">{durationAdvisory}</div>
          )}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="w-full max-w-[280px] mb-6 text-center">
          <p className="text-red-600 text-sm mb-4">
            Something went wrong during {errorStage === "audio" ? "audio generation" : "script generation"}.
          </p>
          <p className="text-[var(--text-dim)] text-xs mb-4">{error}</p>
          <div className="flex flex-col gap-2">
            {errorStage === "audio" && scriptRecord?.id ? (
              <button
                onClick={handleRetryAudio}
                disabled={retryingAudio}
                className="px-5 py-2 rounded-full text-sm font-semibold bg-[#EA580C]/20 text-[#EA580C] hover:bg-[#EA580C]/30 transition-colors disabled:opacity-50"
              >
                {retryingAudio ? "Retrying..." : "Retry Audio Generation"}
              </button>
            ) : null}
            <button
              onClick={() => {
                setError(null);
                setErrorStage(null);
                setStage("analyzing");
                setDurationAdvisory(null);
                setScriptRecord(null);
                setAudioRecord(null);
                setAttempt((a) => a + 1);
              }}
              className="px-5 py-2 rounded-full text-sm font-semibold bg-black/10 text-[var(--text-mid)] hover:bg-black/15 transition-colors"
            >
              {errorStage === "audio" ? "Start Over" : "Try Again"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
