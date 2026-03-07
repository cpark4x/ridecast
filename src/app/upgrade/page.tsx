"use client";
import { useState } from "react";

export default function UpgradePage() {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    const res = await fetch("/api/create-checkout-session", { method: "POST" });
    const { url } = await res.json();
    if (url) window.location.href = url;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold mb-2">Process your own content</h1>
        <p className="text-white/55 text-sm mb-6">
          Upload any PDF, article, or EPUB and turn it into a podcast episode.
          Free plan includes the Ridecast catalog.
        </p>
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full py-4 rounded-[14px] bg-gradient-to-br from-indigo-500 to-violet-500 font-semibold disabled:opacity-50"
        >
          {loading ? "Redirecting..." : "Subscribe — $10/month"}
        </button>
        <p className="text-xs text-white/30 mt-3">Cancel anytime. Billed monthly.</p>
      </div>
    </div>
  );
}
