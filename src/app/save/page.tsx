'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SavePageInner() {
  const params = useSearchParams();
  const url = params.get('url') ?? '';
  const title = params.get('title') ?? '';

  const [status, setStatus] = useState<'loading' | 'saved' | 'duplicate' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!url) { setStatus('error'); setErrorMsg('No URL provided.'); return; }

    fetch('/api/pocket/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, title }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setStatus('error'); setErrorMsg(data.error); return; }
        setStatus(data.alreadySaved ? 'duplicate' : 'saved');
        if (!data.alreadySaved) {
          setTimeout(() => window.close(), 2000);
        }
      })
      .catch(() => { setStatus('error'); setErrorMsg('Something went wrong.'); });
  }, [url, title]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-6 text-center gap-4">
      {/* Logo mark */}
      <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mb-1">
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
          <circle cx="12" cy="12" r="9" opacity="0.3" />
          <polygon points="10,8 16,12 10,16" />
        </svg>
      </div>

      {status === 'loading' && (
        <p className="text-white/55 text-sm">Saving…</p>
      )}

      {status === 'saved' && (
        <>
          <p className="text-lg font-bold">✓ Saved to Ridecast</p>
          <p className="text-white/55 text-xs">Ready to convert to audio. Closing…</p>
        </>
      )}

      {status === 'duplicate' && (
        <>
          <p className="text-lg font-bold">Already in your library</p>
          <p className="text-white/55 text-xs truncate max-w-xs">{title || url}</p>
          <button onClick={() => window.close()}
            className="mt-2 px-5 py-2 rounded-[10px] bg-white/[0.08] text-sm font-semibold">
            Close
          </button>
        </>
      )}

      {status === 'error' && (
        <>
          <p className="text-red-400 font-semibold">Couldn&apos;t save</p>
          <p className="text-white/55 text-xs">{errorMsg}</p>
          <a href={`/sign-in?redirect_url=${encodeURIComponent('/save?url=' + encodeURIComponent(url) + '&title=' + encodeURIComponent(title))}`}
            className="mt-2 px-5 py-2 rounded-[10px] bg-indigo-500 text-sm font-semibold">
            Sign in to Ridecast
          </a>
        </>
      )}
    </div>
  );
}

export default function SavePage() {
  return (
    <Suspense>
      <SavePageInner />
    </Suspense>
  );
}
