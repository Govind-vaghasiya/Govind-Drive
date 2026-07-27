import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Check,
  Loader2,
  FileText,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Code,
  History,
  RotateCcw,
  Sparkles,
  Type,
  Palette,
} from 'lucide-react';
import mammoth from 'mammoth';
import { DriveItem } from './data';
import { getDiskDownloadUrl, API_BASE } from '../lib/serverApi';

interface Revision {
  id: string;
  versionNumber: number;
  time: string;
  author: string;
  content: string;
  sizeBytes: number;
}

interface DocEditorModalProps {
  item: DriveItem;
  onClose: () => void;
  onSaved?: () => void;
}

export default function DocEditorModal({ item, onClose, onSaved }: DocEditorModalProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [revisions, setRevisions] = useState<Revision[]>([]);

  // Typography & Styling Controls
  const [fontFamily, setFontFamily] = useState<string>('font-sans');
  const [fontSize, setFontSize] = useState<string>('text-base');
  const [alignment, setAlignment] = useState<string>('text-left');
  const [textColor, setTextColor] = useState<string>('#1f2937');

  const downloadUrl = (item as any).url || ((item as any).relPath ? getDiskDownloadUrl((item as any).relPath) : '#');
  const relPath = (item as any).relPath || item.name;
  const ext = item.name.split('.').pop()?.toLowerCase() || '';
  const isDocx = ['docx', 'doc'].includes(ext);

  useEffect(() => {
    setLoading(true);
    setError(null);

    if (isDocx && downloadUrl && downloadUrl !== '#') {
      fetch(downloadUrl)
        .then((res) => res.arrayBuffer())
        .then((buffer) => mammoth.extractRawText({ arrayBuffer: buffer }))
        .then((result) => {
          const extractedText = result.value || '';
          setContent(extractedText);
          setLoading(false);
          setRevisions([
            {
              id: `rev_1_${Date.now()}`,
              versionNumber: 1,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              author: 'Initial Load',
              content: extractedText,
              sizeBytes: extractedText.length,
            },
          ]);
        })
        .catch((err) => {
          console.error('Docx extraction error:', err);
          fetch(downloadUrl)
            .then((res) => res.text())
            .then((text) => {
              setContent(text);
              setLoading(false);
            });
        });
    } else {
      fetch(downloadUrl)
        .then((res) => res.text())
        .then((text) => {
          setContent(text);
          setLoading(false);
          setRevisions([
            {
              id: `rev_1_${Date.now()}`,
              versionNumber: 1,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              author: 'Initial Load',
              content: text,
              sizeBytes: text.length,
            },
          ]);
        })
        .catch((err) => {
          console.error('Error loading document content:', err);
          setError('Failed to load document content for editing.');
          setLoading(false);
        });
    }
  }, [downloadUrl, isDocx]);

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

        const nextVer = revisions.length + 1;
        const newRev: Revision = {
          id: `rev_${nextVer}_${Date.now()}`,
          versionNumber: nextVer,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          author: 'You (Admin)',
          content,
          sizeBytes: content.length,
        };
        setRevisions((prev) => [newRev, ...prev]);

        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        setError('Failed to save document to disk.');
      }
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message || 'Error saving document.');
    } finally {
      setSaving(false);
    }
  };

  const handleInsertText = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('doc-editor-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    const replacement = `${prefix}${selected || 'text'}${suffix}`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
  };

  const handleRestore = (rev: Revision) => {
    setContent(rev.content);
    setHistoryOpen(false);
  };

  const getDiffSnippet = (oldText: string, newText: string) => {
    if (!oldText) {
      return (
        <span className="bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.5 rounded">
          + {newText.trim().substring(0, 80) || '(Empty)'}
        </span>
      );
    }

    const oldWords = oldText.trim().split(/\s+/);
    const newWords = newText.trim().split(/\s+/);

    const added = newWords.filter((w) => !oldWords.includes(w));
    const removed = oldWords.filter((w) => !newWords.includes(w));

    if (added.length === 0 && removed.length === 0) {
      return <span className="text-gray-500 font-mono text-[11px]">{newText.substring(0, 80)}...</span>;
    }

    return (
      <div className="flex flex-wrap gap-1 text-[11px] font-mono leading-relaxed">
        {added.length > 0 && (
          <span className="bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.5 rounded">
            + {added.slice(0, 6).join(' ')}
          </span>
        )}
        {removed.length > 0 && (
          <span className="bg-rose-100 text-rose-800 line-through px-1.5 py-0.5 rounded">
            - {removed.slice(0, 6).join(' ')}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F8F9FA] text-gray-900 select-none">
      {/* Top Header (Google Docs Style) */}
      <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-gray-200 bg-white shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold truncate text-gray-900" title={item.name}>
              {item.name}
            </h3>
            <p className="text-xs text-gray-500 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-blue-600" /> Govind Docs • Interactive Editor
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {savedSuccess && (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Check className="h-3.5 w-3.5" /> Saved to Mac Disk!
            </div>
          )}

          <button
            onClick={() => setHistoryOpen((v) => !v)}
            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition ${
              historyOpen
                ? 'bg-blue-50 border-blue-400 text-blue-700'
                : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
            }`}
          >
            <History className="h-4 w-4 text-blue-600" />
            <span>Revisions ({revisions.length})</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-1.5 rounded-full bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Document'}
          </button>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Expanded Google Docs Formatting & Styling Toolbar */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-gray-200 bg-white px-6 py-2 shadow-2xs select-none">
        {/* Font Family Selector */}
        <div className="flex items-center gap-1.5">
          <Type className="h-3.5 w-3.5 text-gray-500" />
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-800 outline-none focus:border-blue-500 font-medium"
          >
            <option value="font-sans">Arial / Sans-Serif</option>
            <option value="font-serif">Georgia / Serif</option>
            <option value="font-mono">Courier / Monospace</option>
          </select>
        </div>

        {/* Font Size Selector */}
        <select
          value={fontSize}
          onChange={(e) => setFontSize(e.target.value)}
          className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-800 outline-none focus:border-blue-500 font-medium"
        >
          <option value="text-xs">12px Small</option>
          <option value="text-sm">14px Normal</option>
          <option value="text-base">16px Medium</option>
          <option value="text-lg">18px Large</option>
          <option value="text-xl">20px Extra Large</option>
          <option value="text-2xl">24px Heading</option>
          <option value="text-3xl">32px Title</option>
        </select>

        <div className="h-4 w-px bg-gray-200 mx-1" />

        {/* Text Color Picker */}
        <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 py-1 bg-gray-50">
          <Palette className="h-3.5 w-3.5 text-gray-500" />
          <input
            type="color"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
            className="h-4 w-4 rounded cursor-pointer bg-transparent border-0"
            title="Text Color"
          />
        </div>

        <div className="h-4 w-px bg-gray-200 mx-1" />

        {/* Inline Formatting */}
        <button
          onClick={() => handleInsertText('**', '**')}
          className="rounded-lg p-1.5 text-gray-700 hover:bg-gray-100 transition"
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          onClick={() => handleInsertText('*', '*')}
          className="rounded-lg p-1.5 text-gray-700 hover:bg-gray-100 transition"
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          onClick={() => handleInsertText('<u>', '</u>')}
          className="rounded-lg p-1.5 text-gray-700 hover:bg-gray-100 transition"
          title="Underline"
        >
          <Underline className="h-4 w-4" />
        </button>
        <button
          onClick={() => handleInsertText('~~', '~~')}
          className="rounded-lg p-1.5 text-gray-700 hover:bg-gray-100 transition"
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </button>

        <div className="h-4 w-px bg-gray-200 mx-1" />

        {/* Text Alignment Controls */}
        <button
          onClick={() => setAlignment('text-left')}
          className={`rounded-lg p-1.5 transition ${alignment === 'text-left' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => setAlignment('text-center')}
          className={`rounded-lg p-1.5 transition ${alignment === 'text-center' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
          title="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </button>
        <button
          onClick={() => setAlignment('text-right')}
          className={`rounded-lg p-1.5 transition ${alignment === 'text-right' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
          title="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </button>
        <button
          onClick={() => setAlignment('text-justify')}
          className={`rounded-lg p-1.5 transition ${alignment === 'text-justify' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
          title="Justify"
        >
          <AlignJustify className="h-4 w-4" />
        </button>

        <div className="h-4 w-px bg-gray-200 mx-1" />

        {/* Headings */}
        <button
          onClick={() => handleInsertText('# ')}
          className="rounded-lg p-1.5 text-gray-700 hover:bg-gray-100 transition"
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </button>
        <button
          onClick={() => handleInsertText('## ')}
          className="rounded-lg p-1.5 text-gray-700 hover:bg-gray-100 transition"
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </button>
        <button
          onClick={() => handleInsertText('### ')}
          className="rounded-lg p-1.5 text-gray-700 hover:bg-gray-100 transition"
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </button>

        <div className="h-4 w-px bg-gray-200 mx-1" />

        {/* Lists & Code */}
        <button
          onClick={() => handleInsertText('- ')}
          className="rounded-lg p-1.5 text-gray-700 hover:bg-gray-100 transition"
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          onClick={() => handleInsertText('1. ')}
          className="rounded-lg p-1.5 text-gray-700 hover:bg-gray-100 transition"
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <button
          onClick={() => handleInsertText('```\n', '\n```')}
          className="rounded-lg p-1.5 text-gray-700 hover:bg-gray-100 transition"
          title="Code Block"
        >
          <Code className="h-4 w-4" />
        </button>
      </div>

      {/* Document Page Canvas (Google Docs A4 Page Layout) */}
      <div className="relative flex min-h-0 flex-1 overflow-y-auto p-6 lg:p-10 justify-center gap-6 bg-[#F8F9FA]">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 text-blue-600 my-20">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-xs font-semibold">Extracting & Formatting Document...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-2 text-red-500 my-20">
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : (
          /* Google Docs Paper Sheet */
          <div className="h-auto min-h-[900px] w-full max-w-4xl rounded-sm bg-white p-12 lg:p-16 text-gray-900 shadow-xl border border-gray-200/80 flex flex-col mb-12">
            <textarea
              id="doc-editor-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start typing your document..."
              style={{ color: textColor }}
              className={`h-full w-full min-h-[800px] resize-none bg-transparent ${fontFamily} ${fontSize} ${alignment} outline-none leading-relaxed selection:bg-blue-100`}
            />
          </div>
        )}

        {/* Revision History Drawer */}
        {historyOpen && (
          <div className="w-80 overflow-y-auto rounded-2xl bg-white border border-gray-200 p-4 shadow-2xl flex flex-col select-none animate-in slide-in-from-right-5 shrink-0">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600">
                <History className="h-4 w-4" />
                <span>Revision History</span>
              </div>
              <button onClick={() => setHistoryOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {revisions.map((rev, idx) => {
                const isCurrent = idx === 0;
                const prevRev = revisions[idx + 1];

                return (
                  <div
                    key={rev.id}
                    className={`rounded-xl border p-3.5 transition space-y-2.5 ${
                      isCurrent
                        ? 'border-blue-500 bg-blue-50/50 shadow-xs'
                        : 'border-gray-200 bg-gray-50/60 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-gray-900 text-xs">Version {rev.versionNumber}</span>
                        {isCurrent && (
                          <span className="rounded-full bg-blue-600 text-white text-[10px] font-extrabold px-2 py-0.5 shadow-xs">
                            Current version
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500 font-medium">{rev.time}</span>
                    </div>

                    <div className="text-[11px] text-gray-600 flex items-center gap-2">
                      <span className="font-semibold text-gray-700">{rev.author}</span>
                      <span>•</span>
                      <span>{rev.sizeBytes} bytes</span>
                    </div>

                    {/* Track Changes / Diff Highlight Snippet */}
                    <div className="rounded-lg bg-white p-2 border border-gray-200 shadow-2xs">
                      <div className="text-[10px] font-bold uppercase text-gray-400 mb-1 flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-emerald-600" /> Tracked Changes
                      </div>
                      {getDiffSnippet(prevRev?.content || '', rev.content)}
                    </div>

                    {!isCurrent && (
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => handleRestore(rev)}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-bold text-xs bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/80 transition active:scale-95"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Restore Version {rev.versionNumber}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
