"use client";

import { useState } from "react";

interface OnboardingProps {
  onComplete: () => void;
  onProcess: (contentId: string, targetMinutes: number, format?: string) => void;
}

const SUGGESTED_ARTICLES = [
  {
    title: "Why We Sleep",
    url: "https://www.gatesnotes.com/Why-We-Sleep",
  },
  {
    title: "The Age of AI Has Begun",
    url: "https://www.gatesnotes.com/The-Age-of-AI-Has-Begun",
  },
  {
    title: "Taste for Makers",
    url: "http://www.paulgraham.com/taste.html",
  },
];

export function Onboarding({ onComplete, onProcess }: OnboardingProps) {
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookmarkletSent, setBookmarkletSent] = useState(false);
  const [bookmarkletSending, setBookmarkletSending] = useState(false);

  async function handleSubmit(submittedUrl: string) {
    const trimmed = submittedUrl.trim();
    if (!trimmed || uploading) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("url", trimmed);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok && response.status !== 409) {
        setError(data.error || "Couldn't fetch that URL. Try another.");
        return;
      }

      localStorage.setItem("ridecast_onboarding_complete", "true");
      onProcess(data.id, 5);
      onComplete();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleBookmarkletEmail() {
    if (bookmarkletSending || bookmarkletSent) return;
    setBookmarkletSending(true);
    try {
      await fetch("/api/email/bookmarklet", { method: "POST" });
      setBookmarkletSent(true);
    } catch {
      // silent — non-critical
    } finally {
      setBookmarkletSending(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-[11px] bg-gradient-to-br from-[#EA580C] to-[#F97316] flex items-center justify-center shadow-[0_4px_16px_rgba(234,88,12,0.35)]">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
              <circle cx="12" cy="12" r="9" opacity="0.3" />
              <polygon points="10,8 16,12 10,16" />
            </svg>
          </div>
          <span className="text-[22px] font-extrabold tracking-tight">
            Ridecast
          </span>
        </div>

        {/* Headline */}
        <div className="text-center mb-6">
          <h1 className="text-[26px] font-bold tracking-tight leading-tight mb-2">
            Paste any article to try it
          </h1>
          <p className="text-[15px] text-[var(--text-mid)] leading-snug">
            Your first 3 episodes are free.
            <br />
            No credit card needed.
          </p>
        </div>

        {/* URL Input */}
        <div className="mb-3">
          <input
            type="url"
            placeholder="Paste an article URL..."
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit(url)}
            disabled={uploading}
            className="w-full bg-[var(--surface)] border border-black/[0.07] rounded-[12px] px-4 py-3.5 text-sm text-[#18181A] placeholder-[var(--text-dim)] outline-none transition-all focus:border-[#EA580C] focus:bg-[#EA580C]/[0.06] disabled:opacity-60"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-600 text-sm text-center mb-3">{error}</p>
        )}

        {/* Primary CTA */}
        <button
          onClick={() => handleSubmit(url)}
          disabled={!url.trim() || uploading}
          className="w-full py-4 rounded-[14px] text-[16px] font-semibold text-white bg-gradient-to-br from-[#EA580C] to-[#F97316] shadow-[0_4px_20px_rgba(234,88,12,0.35)] hover:shadow-[0_6px_28px_rgba(234,88,12,0.5)] active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2 mb-4"
        >
          {uploading ? (
            <>
              <svg
                className="w-4 h-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Creating your episode...
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
              Create my first episode
            </>
          )}
        </button>

        {/* Bookmarklet nudge */}
        <div className="text-center mb-8">
          <span className="text-[13px] text-[var(--text-dim)]">
            Save articles from your laptop?{" "}
          </span>
          {bookmarkletSent ? (
            <span className="text-[13px] font-semibold text-[#EA580C]">
              Sent! ✓
            </span>
          ) : (
            <button
              onClick={handleBookmarkletEmail}
              disabled={bookmarkletSending}
              className="text-[13px] font-semibold text-[#EA580C] underline underline-offset-2 decoration-[#EA580C]/40 hover:decoration-[#EA580C] transition-colors disabled:opacity-60"
            >
              {bookmarkletSending ? "Sending…" : "Email me setup instructions"}
            </button>
          )}
        </div>

        {/* Suggested articles */}
        <div>
          <p className="text-[11px] font-semibold text-[var(--text-dim)] uppercase tracking-wider mb-3 text-center">
            Or try one of these
          </p>
          <div className="flex flex-col gap-2">
            {SUGGESTED_ARTICLES.map((article) => (
              <button
                key={article.url}
                onClick={() => {
                  setUrl(article.url);
                  handleSubmit(article.url);
                }}
                disabled={uploading}
                className="flex items-center gap-3 p-3.5 rounded-[12px] bg-[var(--surface)] border border-black/[0.06] text-left hover:border-[#EA580C]/40 hover:bg-[#EA580C]/[0.04] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                <div className="w-9 h-9 rounded-[9px] bg-gradient-to-br from-[#EA580C]/15 to-[#F97316]/10 flex items-center justify-center shrink-0">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4 stroke-[#EA580C] fill-none"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold leading-snug">
                    {article.title}
                  </div>
                  <div className="text-[11px] text-[var(--text-dim)] truncate mt-0.5">
                    {article.url.replace(/^https?:\/\//, "")}
                  </div>
                </div>
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 stroke-[var(--text-dim)] fill-none shrink-0"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
