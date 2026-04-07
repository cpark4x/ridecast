'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SavePageInner() {
  const params = useSearchParams();
  const url = params.get('url') ?? '';
  const title = params.get('title') ?? '';

  const [status, setStatus] = useState<'loading' | 'saved' | 'duplicate' | 'auth' | 'error'>(
    () => url ? 'loading' : 'error',
  );
  const [errorMsg, setErrorMsg] = useState(
    () => url ? '' : 'No URL provided.',
  );

  useEffect(() => {
    if (!url) return; // initial state already handles empty URL

    fetch('/api/pocket/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, title }),
    })
      .then(async (r) => {
        if (r.status === 401 || r.status === 403) {
          setStatus('auth');
          return;
        }
        const data = await r.json();
        if (data.error) { setStatus('error'); setErrorMsg(data.error); return; }
        setStatus(data.alreadySaved ? 'duplicate' : 'saved');
        if (!data.alreadySaved) {
          setTimeout(() => window.close(), 2000);
        }
      })
      .catch(() => { setStatus('error'); setErrorMsg('Something went wrong.'); });
  }, [url, title]);

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center p-6 text-center gap-4">
      {/* Logo mark */}
      <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#EA580C] to-[#F97316] flex items-center justify-center mb-1">
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
          <circle cx="12" cy="12" r="9" opacity="0.3" />
          <polygon points="10,8 16,12 10,16" />
        </svg>
      </div>

      {status === 'loading' && (
        <>
          <div className="w-8 h-8 border-3 border-[#EA580C]/20 border-t-[#EA580C] rounded-full animate-spin" />
          <p className="text-[var(--text-mid)] text-sm font-medium">Saving…</p>
          <p className="text-[var(--text-dim)] text-xs truncate max-w-xs">{title || url}</p>
        </>
      )}

      {status === 'saved' && (
        <>
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 stroke-green-600 fill-none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="text-xl font-bold text-green-700">Saved!</p>
          <p className="text-[var(--text-mid)] text-sm">Open Ridecast to listen</p>
          <p className="text-[var(--text-dim)] text-xs mt-1">Closing automatically…</p>
        </>
      )}

      {status === 'duplicate' && (
        <>
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 stroke-blue-500 fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
          <p className="text-lg font-bold">Already saved</p>
          <p className="text-[var(--text-mid)] text-xs truncate max-w-xs">{title || url}</p>
          <button onClick={() => window.close()}
            className="mt-3 px-6 py-2.5 rounded-[10px] bg-[var(--surface-2)] border border-black/[0.07] text-sm font-semibold">
            Close
          </button>
        </>
      )}

      {status === 'auth' && (
        <>
          <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 stroke-[#EA580C] fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
          </div>
          <p className="text-lg font-bold">Sign in to save</p>
          <p className="text-[var(--text-mid)] text-xs truncate max-w-xs">{title || url}</p>
          <button
            onClick={() => {
              // Open sign-in in the MAIN browser window (not this tiny popup)
              // After sign-in, redirect back to /save with the same params to complete the save
              const redirect = '/save?url=' + encodeURIComponent(url) + '&title=' + encodeURIComponent(title);
              const signInUrl = '/sign-in?redirect_url=' + encodeURIComponent(redirect);
              if (window.opener) {
                window.opener.open(signInUrl, '_self');
                window.close();
              } else {
                window.location.href = signInUrl;
              }
            }}
            className="mt-3 px-6 py-2.5 rounded-[12px] bg-[#EA580C] text-white text-sm font-semibold">
            Sign in to Ridecast
          </button>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 stroke-red-500 fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <p className="text-lg font-bold text-red-600">Couldn&apos;t save</p>
          <p className="text-[var(--text-mid)] text-xs">{errorMsg}</p>
          <button onClick={() => window.close()}
            className="mt-3 px-6 py-2.5 rounded-[10px] bg-[var(--surface-2)] border border-black/[0.07] text-sm font-semibold">
            Close
          </button>
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
