'use client';

import { useState, useRef, DragEvent } from 'react';

interface PocketImportScreenProps {
  onComplete: () => void; // navigate to Library when done
}

type ImportState =
  | { phase: 'idle' }
  | { phase: 'uploading' }
  | { phase: 'done'; imported: number; skipped: number }
  | { phase: 'error'; message: string };

export function PocketImportScreen({ onComplete }: PocketImportScreenProps) {
  const [state, setState] = useState<ImportState>({ phase: 'idle' });
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setState({ phase: 'uploading' });
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/pocket/import', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setState({ phase: 'error', message: data.error || 'Import failed.' });
        return;
      }
      setState({ phase: 'done', imported: data.imported, skipped: data.skipped });
    } catch {
      setState({ phase: 'error', message: 'Import failed. Please try again.' });
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="p-6 pt-0">
      {/* Header */}
      <div className="text-center pt-4 mb-8">
        <div className="flex items-center justify-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#EA580C] to-[#F97316] flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
              <circle cx="12" cy="12" r="9" opacity="0.3" />
              <polygon points="10,8 16,12 10,16" />
            </svg>
          </div>
          <span className="text-[22px] font-extrabold tracking-tight bg-gradient-to-br from-[#18181A] to-[#18181A]/70 bg-clip-text text-transparent">
            Import from Pocket
          </span>
        </div>
        <p className="text-sm text-[var(--text-mid)]">
          Your reading list, finally heard
        </p>
      </div>

      {/* Idle / drop zone */}
      {state.phase === 'idle' && (
        <>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-[14px] p-9 text-center cursor-pointer transition-all mb-6 ${
              dragOver
                ? 'border-[#EA580C] bg-[#EA580C]/[0.08]'
                : 'border-[#EA580C]/30 bg-[#EA580C]/[0.03]'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-10 h-10 stroke-[#EA580C] fill-none mx-auto mb-3"
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <div className="text-[15px] font-semibold mb-1">Drop your Pocket export here</div>
            <div className="text-xs text-[var(--text-mid)]">or tap to browse · .html or .csv</div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm,.csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>

          {/* Instructions */}
          <div className="bg-[var(--surface-2)] border border-black/[0.07] rounded-[12px] p-4">
            <p className="text-[12px] font-semibold text-[var(--text-mid)] uppercase tracking-wider mb-3">
              How to get your Pocket export
            </p>
            <ol className="space-y-2">
              {[
                'Go to getpocket.com/export (while it still works)',
                'Download your list as HTML or CSV',
                'Upload that file here',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--text-mid)]">
                  <span className="w-5 h-5 rounded-full bg-[#EA580C]/20 text-[#EA580C] text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </>
      )}

      {/* Uploading */}
      {state.phase === 'uploading' && (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-full border-2 border-[#EA580C] border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-[15px] font-semibold">Importing your articles…</p>
          <p className="text-sm text-[var(--text-mid)] mt-1">This may take a moment for large libraries</p>
        </div>
      )}

      {/* Done */}
      {state.phase === 'done' && (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-[#EA580C]/15 flex items-center justify-center mx-auto mb-5">
            <svg viewBox="0 0 24 24" className="w-8 h-8 stroke-[#EA580C] fill-none"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="text-[22px] font-bold mb-1">
            {state.imported.toLocaleString()} articles imported
          </p>
          {state.skipped > 0 && (
            <p className="text-sm text-[var(--text-dim)] mb-6">
              {state.skipped.toLocaleString()} already in your library
            </p>
          )}
          {state.skipped === 0 && <div className="mb-6" />}
          <p className="text-sm text-[var(--text-mid)] mb-8">
            Your articles are ready to convert to audio.
            <br />Pick anything from your library to get started.
          </p>
          <button
            onClick={onComplete}
            className="w-full py-3.5 px-7 rounded-[14px] text-[15px] font-semibold text-white bg-gradient-to-br from-[#EA580C] to-[#F97316] shadow-[0_4px_20px_rgba(234,88,12,0.35)]"
          >
            Go to My Library
          </button>
        </div>
      )}

      {/* Error */}
      {state.phase === 'error' && (
        <div className="text-center py-8">
          <p className="text-red-400 font-semibold text-[15px] mb-2">Import failed</p>
          <p className="text-sm text-[var(--text-mid)] mb-6">{state.message}</p>
          <button
            onClick={() => setState({ phase: 'idle' })}
            className="px-6 py-3 rounded-[12px] bg-[var(--surface-2)] border border-black/[0.07] text-sm font-semibold"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
