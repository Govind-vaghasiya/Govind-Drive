import { useState, useEffect } from 'react';
import { X, Download, ChevronLeft, ChevronRight, Music, Archive, Eye, FileSpreadsheet, Loader2, Edit3, GripHorizontal, Minimize2, Maximize2 } from 'lucide-react';
import mammoth from 'mammoth';
import { DriveItem } from './data';
import { getDiskDownloadUrl } from '../lib/serverApi';

interface FilePreviewModalProps {
  item: DriveItem;
  itemsList?: DriveItem[];
  onClose: () => void;
  onNavigate?: (item: DriveItem) => void;
  onEdit?: (item: DriveItem) => void;
}

export default function FilePreviewModal({
  item,
  itemsList = [],
  onClose,
  onNavigate,
  onEdit,
}: FilePreviewModalProps) {
  const [currentFile, setCurrentFile] = useState<DriveItem>(item);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [csvRows, setCsvRows] = useState<string[][] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Floating Card Position & Drag State
  const [pos, setPos] = useState({ x: 24, y: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);

  const downloadUrl = (currentFile as any).url || ((currentFile as any).relPath ? getDiskDownloadUrl((currentFile as any).relPath) : '#');
  const ext = currentFile.name.split('.').pop()?.toLowerCase() || '';

  const isText = ['txt', 'md', 'json', 'js', 'ts', 'jsx', 'tsx', 'css', 'html', 'py', 'sh', 'log', 'xml', 'yaml', 'yml'].includes(ext);
  const isDocx = ['docx', 'doc'].includes(ext);
  const isCsv = ['csv'].includes(ext);

  // Dragging Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newX = Math.max(10, Math.min(window.innerWidth - 260, e.clientX - dragOffset.x));
      const newY = Math.max(10, Math.min(window.innerHeight - 60, e.clientY - dragOffset.y));
      setPos({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Load preview data whenever currentFile changes
  useEffect(() => {
    setTextContent(null);
    setDocxHtml(null);
    setCsvRows(null);
    setPreviewError(null);

    if (!downloadUrl || downloadUrl === '#') return;

    if (isText) {
      setLoading(true);
      fetch(downloadUrl)
        .then((res) => res.text())
        .then((text) => {
          setTextContent(text);
          setLoading(false);
        })
        .catch(() => {
          setPreviewError('Unable to load text preview');
          setLoading(false);
        });
    } else if (isDocx) {
      setLoading(true);
      fetch(downloadUrl)
        .then((res) => res.arrayBuffer())
        .then((buffer) => mammoth.convertToHtml({ arrayBuffer: buffer }))
        .then((result) => {
          setDocxHtml(result.value || '<p>Empty Document</p>');
          setLoading(false);
        })
        .catch((err) => {
          console.error('Docx conversion error:', err);
          setPreviewError('Unable to parse Word document format. You can download or edit below.');
          setLoading(false);
        });
    } else if (isCsv) {
      setLoading(true);
      fetch(downloadUrl)
        .then((res) => res.text())
        .then((text) => {
          const lines = text.split('\n').filter((l) => l.trim());
          const rows = lines.map((line) => line.split(',').map((c) => c.trim().replace(/^"|"$/g, '')));
          setCsvRows(rows);
          setLoading(false);
        })
        .catch(() => {
          setPreviewError('Unable to load CSV preview');
          setLoading(false);
        });
    }
  }, [currentFile, downloadUrl, isText, isDocx, isCsv]);

  const fileItems = itemsList.filter((i) => i.kind !== 'folder');
  const currentIndex = fileItems.findIndex((i) => i.id === currentFile.id);

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevFile = fileItems[currentIndex - 1];
      setCurrentFile(prevFile);
      onNavigate?.(prevFile);
    }
  };

  const handleNext = () => {
    if (currentIndex >= 0 && currentIndex < fileItems.length - 1) {
      const nextFile = fileItems[currentIndex + 1];
      setCurrentFile(nextFile);
      onNavigate?.(nextFile);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 text-white select-none transition-all overflow-hidden">
      {/* Draggable Floating Control Card */}
      <div
        style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
        className={`fixed z-50 overflow-hidden rounded-3xl border border-white/15 bg-black/80 backdrop-blur-2xl text-white shadow-2xl transition-shadow select-none ${
          isDragging ? 'shadow-blue-500/20 ring-2 ring-blue-500/50' : ''
        }`}
      >
        {/* Header / Drag Handle */}
        <div
          onMouseDown={handleMouseDown}
          className="flex items-center justify-between gap-3 px-4 py-3 bg-white/5 border-b border-white/10 cursor-grab active:cursor-grabbing hover:bg-white/10 transition"
        >
          <div className="flex items-center gap-2 min-w-0">
            <GripHorizontal className="h-4 w-4 text-gray-400 shrink-0" />
            <div className="flex items-center gap-1.5 min-w-0">
              <Eye className="h-4 w-4 text-blue-400 shrink-0" />
              <span className="text-xs font-bold truncate text-white max-w-[150px]" title={currentFile.name}>
                {currentFile.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized((v) => !v);
              }}
              className="rounded-full p-1 text-gray-400 hover:bg-white/15 hover:text-white transition"
              title={isMinimized ? 'Expand controls' : 'Minimize controls'}
            >
              {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="rounded-full p-1 text-gray-400 hover:bg-white/15 hover:text-white transition"
              title="Close Preview (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Card Body (When Expanded) */}
        {!isMinimized && (
          <div className="p-4 space-y-3.5 w-72 sm:w-80">
            {/* File Details */}
            <div className="space-y-1.5 text-xs">
              <p className="text-gray-300 font-medium truncate" title={currentFile.name}>
                {currentFile.name}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-gray-400 flex-wrap">
                <span className="inline-block rounded-md bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-300 uppercase border border-blue-500/30">
                  {ext || currentFile.kind}
                </span>
                <span>{currentFile.size}</span>
                <span>•</span>
                <span>{currentFile.modified}</span>
              </div>
            </div>

            {/* Actions Stack */}
            <div className="space-y-2 pt-1">
              {onEdit && (
                <button
                  onClick={() => onEdit(currentFile)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2 px-3.5 text-xs font-semibold text-white shadow-md shadow-emerald-600/30 transition hover:bg-emerald-500 active:scale-95"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Edit Online
                </button>
              )}

              <a
                href={downloadUrl}
                download={currentFile.name}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2 px-3.5 text-xs font-semibold text-white shadow-md shadow-blue-600/30 transition hover:bg-blue-500 active:scale-95"
              >
                <Download className="h-3.5 w-3.5" /> Download File
              </a>
            </div>

            {/* Navigation Row */}
            {fileItems.length > 1 && (
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <button
                  onClick={handlePrev}
                  disabled={currentIndex <= 0}
                  className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold transition hover:bg-white/15 disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </button>

                <span className="text-[10px] text-gray-400 font-medium">
                  {currentIndex + 1} of {fileItems.length}
                </span>

                <button
                  onClick={handleNext}
                  disabled={currentIndex < 0 || currentIndex >= fileItems.length - 1}
                  className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold transition hover:bg-white/15 disabled:opacity-30 disabled:pointer-events-none"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Preview Area - 100% Full Viewport Width & Height, 0 Padding */}
      <div className="relative h-full w-full flex items-center justify-center overflow-hidden p-0 m-0">
        {/* Loading Indicator */}
        {loading && (
          <div className="flex flex-col items-center gap-3 text-blue-400 z-20">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-xs font-semibold">Loading File Preview...</span>
          </div>
        )}

        {/* MEDIA TYPE RENDERERS */}
        {!loading && (
          <div className="h-full w-full flex items-center justify-center overflow-hidden p-0 m-0">
            {/* 1. IMAGE PREVIEW */}
            {currentFile.kind === 'image' && (
              <img
                src={downloadUrl}
                alt={currentFile.name}
                className="h-full w-full object-contain p-0"
              />
            )}

            {/* 2. VIDEO PREVIEW */}
            {currentFile.kind === 'video' && (
              <video
                src={downloadUrl}
                controls
                autoPlay
                className="h-full w-full object-contain p-0"
              />
            )}

            {/* 3. PDF PREVIEW (NATIVE INLINE EMBED - 100% HEIGHT & WIDTH, 0 PADDING) */}
            {currentFile.kind === 'pdf' && (() => {
              const inlinePdfUrl = (currentFile as any).relPath ? getDiskDownloadUrl((currentFile as any).relPath, true) : downloadUrl;
              return (
                <object
                  data={inlinePdfUrl}
                  type="application/pdf"
                  className="h-full w-full bg-white border-0 overflow-hidden p-0 m-0"
                >
                  <iframe
                    src={inlinePdfUrl}
                    title={currentFile.name}
                    className="h-full w-full border-0 p-0 m-0"
                  />
                </object>
              );
            })()}

            {/* 4. WORD DOCUMENT (.DOCX) PREVIEW */}
            {isDocx && docxHtml && (
              <div className="h-full w-full overflow-y-auto bg-white p-6 lg:p-12 text-gray-900 selection:bg-blue-100">
                <div
                  className="prose max-w-4xl mx-auto text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: docxHtml }}
                />
              </div>
            )}

            {/* 5. TEXT / CODE / MARKDOWN PREVIEW */}
            {isText && textContent !== null && (
              <div className="h-full w-full overflow-y-auto bg-gray-900 p-6 text-gray-100 font-mono text-xs selection:bg-blue-600">
                <pre className="whitespace-pre-wrap break-words leading-relaxed max-w-5xl mx-auto">{textContent}</pre>
              </div>
            )}

            {/* 6. CSV TABLE PREVIEW */}
            {isCsv && csvRows && (
              <div className="h-full w-full overflow-auto bg-white text-gray-900 p-4">
                <table className="w-full text-left text-xs border-collapse max-w-5xl mx-auto">
                  <tbody>
                    {csvRows.map((row, idx) => (
                      <tr key={idx} className={idx === 0 ? 'bg-gray-100 font-bold border-b border-gray-300' : 'border-b border-gray-100 hover:bg-blue-50'}>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-3 py-2 border-r border-gray-100 truncate max-w-xs">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 7. AUDIO PREVIEW */}
            {currentFile.kind === 'audio' && (
              <div className="flex flex-col items-center rounded-3xl bg-gray-900/90 border border-white/10 p-8 shadow-2xl max-w-md w-full text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 mb-4 border border-indigo-500/30">
                  <Music className="h-10 w-10" />
                </div>
                <h4 className="text-base font-bold text-white truncate max-w-full mb-1">{currentFile.name}</h4>
                <p className="text-xs text-gray-400 mb-6">{currentFile.size}</p>
                <audio src={downloadUrl} controls autoPlay className="w-full" />
              </div>
            )}

            {/* 8. ARCHIVE / UNKNOWN PREVIEW FALLBACK */}
            {!isText && !isDocx && !isCsv && !['image', 'video', 'pdf', 'audio'].includes(currentFile.kind) && (
              <div className="flex flex-col items-center rounded-3xl bg-gray-900/90 border border-white/10 p-8 shadow-2xl max-w-md w-full text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-500/20 text-slate-400 mb-4 border border-slate-500/30">
                  {currentFile.kind === 'sheet' || currentFile.kind === 'slides' ? (
                    <FileSpreadsheet className="h-10 w-10" />
                  ) : (
                    <Archive className="h-10 w-10" />
                  )}
                </div>
                <h4 className="text-base font-bold text-white truncate max-w-full mb-1">{currentFile.name}</h4>
                <p className="text-xs text-gray-400 mb-6">
                  {previewError || `File Format (${ext.toUpperCase()}) • ${currentFile.size}`}
                </p>
                <a
                  href={downloadUrl}
                  download={currentFile.name}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-500 transition"
                >
                  <Download className="h-4 w-4" /> Download File
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
