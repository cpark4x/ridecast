"use client";

import { UploadScreen } from "./UploadScreen";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProcess: (contentId: string, targetMinutes: number) => void;
  onImportPocket: () => void;
}

export function UploadModal({ isOpen, onClose, onProcess, onImportPocket }: UploadModalProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[60] flex flex-col">
      <div
        data-testid="upload-modal-backdrop"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="relative mt-auto bg-[var(--bg)] rounded-t-[20px] max-h-[90%] overflow-y-auto animate-[slideUp_0.3s_ease]">
        <div
          data-testid="drag-handle"
          className="w-10 h-1 bg-black/20 rounded-full mx-auto mt-3 mb-1"
        />
        <div className="flex items-center justify-between px-5 py-3">
          <h2 className="text-lg font-bold">Add Content</h2>
          <button
            onClick={onClose}
            aria-label="Close upload modal"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--surface-2)] active:scale-90"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 stroke-[var(--text-mid)] fill-none"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <UploadScreen onProcess={onProcess} onImportPocket={onImportPocket} />
      </div>
    </div>
  );
}
