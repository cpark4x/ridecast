"use client";

import { useState, useRef, DragEvent } from "react";

interface ContentPreview {
  id: string;
  title: string;
  wordCount: number;
  readTime: number;
  truncationWarning?: string | null;
}

interface UploadScreenProps {
  onProcess: (contentId: string, targetMinutes: number) => void;
}

export function UploadScreen({ onProcess }: UploadScreenProps) {
  const [url, setUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<ContentPreview | null>(null);
  const [selectedPreset, setSelectedPreset] = useState(15);
  const [sliderValue, setSliderValue] = useState(15);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const presets = [
    { minutes: 5, label: "Quick Summary" },
    { minutes: 15, label: "Main Points" },
    { minutes: 30, label: "Deep Dive" },
  ];

  async function handleUpload(file?: File) {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      if (file) {
        formData.append("file", file);
      } else if (url) {
        formData.append("url", url);
      } else {
        return;
      }

      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Upload failed");
        return;
      }

      setPreview({
        id: data.id,
        title: data.title,
        wordCount: data.wordCount,
        readTime: Math.round(data.wordCount / 250),
        truncationWarning: data.truncationWarning ?? null,
      });
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  function handlePresetClick(minutes: number) {
    setSelectedPreset(minutes);
    setSliderValue(minutes);
  }

  function handleSliderChange(value: number) {
    setSliderValue(value);
    if ([5, 15, 30].includes(value)) {
      setSelectedPreset(value);
    } else {
      setSelectedPreset(0);
    }
  }

  function handleCreateAudio() {
    if (preview) {
      onProcess(preview.id, sliderValue);
      // Reset form so it's fresh when the user returns after generation
      setPreview(null);
      setUrl("");
      setError(null);
      setSelectedPreset(15);
      setSliderValue(15);
    }
  }

  return (
    <div className="p-6 pt-0">
      {/* Logo */}
      <div className="text-center pt-4 mb-8">
        <div className="flex items-center justify-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><circle cx="12" cy="12" r="9" opacity="0.3" /><polygon points="10,8 16,12 10,16" /></svg>
          </div>
          <span className="text-[22px] font-extrabold tracking-tight bg-gradient-to-br from-white to-white/55 bg-clip-text text-transparent">Ridecast 2</span>
        </div>
        <p className="text-sm text-white/55">Turn anything into audio for your commute</p>
      </div>

      {/* Drop Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-[14px] p-9 text-center cursor-pointer transition-all mb-4 ${
          dragOver ? "border-indigo-500 bg-indigo-500/[0.08]" : "border-indigo-500/30 bg-indigo-500/[0.03]"
        }`}
      >
        <svg viewBox="0 0 24 24" className="w-10 h-10 stroke-violet-400 fill-none mx-auto mb-3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <div className="text-[15px] font-semibold mb-1">Drop files here</div>
        <div className="text-xs text-white/55">PDF, EPUB, TXT up to 50MB</div>
        <input ref={fileInputRef} type="file" accept=".pdf,.epub,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
      </div>

      {/* Divider */}
      <div className="text-center text-white/30 text-xs font-medium my-4 relative before:content-[''] before:absolute before:top-1/2 before:left-0 before:w-[calc(50%-24px)] before:h-px before:bg-white/[0.08] after:content-[''] after:absolute after:top-1/2 after:right-0 after:w-[calc(50%-24px)] after:h-px after:bg-white/[0.08]">
        or
      </div>

      {/* URL Input */}
      <div className="flex gap-2.5 mb-6">
        <input
          type="text"
          placeholder="Paste article or newsletter URL..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleUpload()}
          className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-[10px] px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-indigo-500 focus:bg-indigo-500/[0.06]"
        />
        <button
          onClick={() => handleUpload()}
          disabled={!url || uploading}
          className="px-5 py-3 bg-white/[0.06] border border-white/[0.08] rounded-[10px] text-sm font-semibold transition-all hover:bg-white/10 disabled:opacity-50"
        >
          {uploading ? "..." : "Fetch"}
        </button>
      </div>

      {error && (
        <div className="text-red-400 text-sm mb-4 text-center">{error}</div>
      )}

      {/* Content Preview */}
      {preview && (
        <div className="bg-white/[0.06] border border-white/[0.08] rounded-[14px] p-[18px] mb-7 animate-[slideUp_0.4s_ease]">
          <div className="flex items-start gap-3.5 mb-3.5">
            <div className="w-11 h-11 rounded-[10px] bg-gradient-to-br from-indigo-500/20 to-violet-500/15 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] stroke-violet-400 fill-none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div>
              <div className="text-[15px] font-semibold mb-0.5 leading-snug">{preview.title}</div>
              <div className="text-xs text-white/55 flex gap-3">
                <span>{preview.wordCount.toLocaleString()} words</span>
                <span>~{preview.readTime} min read</span>
              </div>
            </div>
          </div>

          {preview.truncationWarning && (
            <div className="text-xs text-amber-400/80 mt-2 leading-snug">
              ⚠ {preview.truncationWarning}
            </div>
          )}

          <div className="h-px bg-white/[0.08] my-3.5" />

          {/* Duration Selector */}
          <div className="text-[13px] font-semibold text-white/55 uppercase tracking-wider mb-3.5">Target Duration</div>
          <div className="flex gap-2 mb-5">
            {presets.map(({ minutes, label }) => (
              <button
                key={minutes}
                onClick={() => handlePresetClick(minutes)}
                className={`flex-1 py-3 px-2 rounded-[10px] text-center transition-all border ${
                  selectedPreset === minutes
                    ? "bg-indigo-500/[0.12] border-indigo-500"
                    : "bg-white/[0.06] border-white/[0.08]"
                }`}
              >
                <div className={`text-[15px] font-bold mb-0.5 ${selectedPreset === minutes ? "text-violet-400" : "text-white"}`}>~{minutes} min</div>
                <div className="text-[11px] text-white/55 font-medium">{label}</div>
              </button>
            ))}
          </div>

          {/* Slider */}
          <div className="mb-7">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[13px] text-white/55">Fit to my commute</span>
              <span className="text-lg font-bold text-violet-400">{sliderValue} min</span>
            </div>
            <input
              type="range"
              min="5"
              max="60"
              step="1"
              value={sliderValue}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }}
            />
            <div className="flex justify-between mt-1.5 px-0.5">
              {[5, 15, 30, 45, 60].map((t) => (
                <span key={t} className="text-[10px] text-white/30">{t}</span>
              ))}
            </div>
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreateAudio}
            className="w-full py-3.5 px-7 rounded-[14px] text-[15px] font-semibold text-white transition-all bg-gradient-to-br from-indigo-500 to-violet-500 shadow-[0_4px_20px_rgba(99,102,241,0.35)] hover:shadow-[0_6px_28px_rgba(99,102,241,0.5)] active:scale-[0.96] flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
            Create Audio
          </button>
        </div>
      )}
    </div>
  );
}
