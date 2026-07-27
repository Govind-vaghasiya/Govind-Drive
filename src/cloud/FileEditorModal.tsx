import React, { useState, useEffect } from 'react';
import { X, Save, Check, Loader2, FileText, History, RotateCcw } from 'lucide-react';
import { DriveItem } from './data';
import { getDiskDownloadUrl, API_BASE } from '../lib/serverApi';

interface Revision {
  id: string;
  time: string;
  author: string;
  content: string;
  sizeBytes: number;
}

interface FileEditorModalProps {
  item: DriveItem;
  onClose: () => void;
  onSaved?: () => void;
}

export default function FileEditorModal({ item, onClose, onSaved }: FileEditorModalProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [revisions, setRevisions] = useState<Revision[]>([]);

  const downloadUrl = (item as any).url || ((item as any).relPath ? getDiskDownloadUrl((item as any).relPath) : '#');
  const relPath = (item as any).relPath || item.name;

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(downloadUrl)
      .then((res) => res.text())
      .then((text) => {
        setContent(text);
        setLoading(false);
        // Initial snapshot
        setRevisions([
          {
            id: `rev_init_${Date.now()}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            author: 'Initial Load',
            content: text,
            sizeBytes: text.length,
          },
        ]);
      })
      .catch((err) => {
        console.error('Error fetching file for editing:', err);
        setError('Failed to load file content for editing.');
        setLoading(false);
      });
  }, [downloadUrl]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSavedSuccess(false);

    try {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const file = new File([blob], item.name, { type: 'text/plain' });

      const formData = new FormData();
      formData.append('files', file);

      const dirPath = relPath.includes('/') ? relPath.substring(0, relPath.lastIndexOf('/')) : '';
      const res = await fetch(`${API_BASE}/upload?subpath=${encodeURIComponent(dirPath)}`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setSavedSuccess(true);
        onSaved?.();

        // Record Revision Entry
        const newRev: Revision = {
          id: `rev_${Date.now()}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          author: 'You (Admin)',
          content,
          sizeBytes: content.length,
        };
        setRevisions((prev) => [newRev, ...prev]);

        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        setError('Failed to save file changes to disk.');
      }
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message || 'Error saving file.');
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = (rev: Revision) => {
    setContent(rev.content);
    setHistoryOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950/90 backdrop-blur-md text-white select-none">
      {/* Header Bar */}
      <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-white/10 bg-black/40">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600/30 text-emerald-400 border border-emerald-500/30">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold truncate text-white" title={item.name}>
              Editing "{item.name}"
            </h3>
            <p className="text-[11px] text-gray-400">Live In-Browser Document & Code Editor</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {savedSuccess && (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-400">
              <Check className="h-3.5 w-3.5" /> Saved to Disk!
            </div>
          )}

          <button
            onClick={() => setHistoryOpen((v) => !v)}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
              historyOpen
                ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                : 'border-white/10 hover:bg-white/10 text-gray-300'
            }`}
            title="View revision history"
          >
            <History className="h-4 w-4" />
            <span>Revisions ({revisions.length})</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-500 active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white transition"
            aria-label="Close editor"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="relative flex min-h-0 flex-1 p-4 lg:p-6 justify-center gap-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 text-emerald-400">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-xs font-semibold">Opening Document Editor...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-2 text-red-400">
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : (
          <div className="h-full w-full max-w-5xl overflow-hidden rounded-2xl bg-gray-900 border border-white/10 shadow-2xl flex flex-col">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your document content here..."
              className="h-full w-full resize-none bg-transparent p-6 text-sm font-mono text-gray-100 outline-none leading-relaxed selection:bg-emerald-600 selection:text-white"
            />
          </div>
        )}

        {/* Revision History Sidebar */}
        {historyOpen && (
          <div className="w-80 overflow-y-auto rounded-2xl bg-gray-900/95 border border-white/10 p-4 shadow-2xl flex flex-col select-none animate-in slide-in-from-right-5">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400">
                <History className="h-4 w-4" />
                <span>Revision Log</span>
              </div>
              <button onClick={() => setHistoryOpen(false)} className="text-gray-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {revisions.map((rev, idx) => (
                <div
                  key={rev.id}
                  className="rounded-xl border border-gray-800 bg-gray-950/60 p-3 hover:border-blue-500/50 transition space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-200">{rev.author}</span>
                    <span className="text-[10px] text-gray-500">{rev.time}</span>
                  </div>
                  <p className="text-[11px] font-mono text-gray-400 line-clamp-2 bg-black/40 p-1.5 rounded">
                    {rev.content.trim().substring(0, 80) || '(Empty)'}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1">
                    <span>{rev.sizeBytes} bytes</span>
                    <button
                      onClick={() => handleRestore(rev)}
                      className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-bold"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Restore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
