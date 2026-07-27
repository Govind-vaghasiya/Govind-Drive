import { useState } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, X, ChevronDown, ChevronUp, FileUp } from 'lucide-react';

interface Props {
  fileName: string;
  count: number;
  progress: number;
  completed: boolean;
  error?: string;
  onClose: () => void;
}

export default function UploadProgressWidget({
  fileName,
  count,
  progress,
  completed,
  error,
  onClose,
}: Props) {
  const [minimized, setMinimized] = useState(false);

  return (
    <div className={`fixed bottom-6 right-6 z-[9999] w-96 overflow-hidden rounded-2xl bg-gray-900 text-white shadow-2xl backdrop-blur-xl transition-all select-none animate-in fade-in slide-in-from-bottom-5 ${
      error ? 'ring-2 ring-rose-500/60' : completed ? 'ring-2 ring-emerald-500/50' : 'ring-2 ring-blue-500/50'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-950/80">
        <div className="flex items-center gap-2.5">
          {error ? (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40">
              <AlertCircle className="h-4 w-4" />
            </div>
          ) : completed ? (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40">
              <UploadCloud className="h-4 w-4 animate-pulse" />
            </div>
          )}
          <div>
            <h4 className="text-xs font-bold text-white">
              {error
                ? `Upload Error (${count} ${count === 1 ? 'file' : 'files'})`
                : completed
                ? `Upload Complete (${count} ${count === 1 ? 'file' : 'files'})`
                : `Uploading ${count} ${count === 1 ? 'file' : 'files'}...`}
            </h4>
            <p className="text-[10px] text-gray-400">
              {error ? error : completed ? 'Saved to Mac disk' : `${progress}% completed`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setMinimized((v) => !v)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white transition"
          >
            {minimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      {!minimized && (
        <div className="p-4 space-y-3.5 bg-gray-900/90">
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
              error ? 'bg-rose-600/20 text-rose-400 border-rose-500/30' : 'bg-blue-600/20 text-blue-400 border-blue-500/30'
            }`}>
              <FileUp className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-100 truncate" title={fileName}>
                {fileName || 'Uploading items...'}
              </p>
              <div className="flex items-center justify-between text-[11px] mt-0.5">
                <span className="text-gray-400">Status</span>
                <span className={`font-bold ${error ? 'text-rose-400' : 'text-blue-400'}`}>
                  {error ? 'Failed' : completed ? '100%' : `${progress}%`}
                </span>
              </div>
            </div>
          </div>

          {/* Animated Progress Bar */}
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-gray-800 border border-gray-700">
            <div
              className={`h-full transition-all duration-300 ${
                error
                  ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                  : completed
                  ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                  : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 shadow-[0_0_12px_rgba(59,130,246,0.5)]'
              }`}
              style={{ width: `${error ? 100 : completed ? 100 : Math.max(progress, 8)}%` }}
            />
          </div>

          {error ? (
            <div className="rounded-xl bg-rose-500/10 p-2 text-center text-xs font-semibold text-rose-400 border border-rose-500/20">
              ⚠️ {error}
            </div>
          ) : completed ? (
            <div className="rounded-xl bg-emerald-500/10 p-2 text-center text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              ✓ Successfully synced to host storage!
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

