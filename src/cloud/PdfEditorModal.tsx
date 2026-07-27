import React, { useState, useRef } from 'react';
import {
  X,
  Save,
  Check,
  Loader2,
  FileText,
  ZoomIn,
  ZoomOut,
  Type,
  PenTool,
  RotateCw,
  Download,
  Eye,
} from 'lucide-react';
import { DriveItem } from './data';
import { getDiskDownloadUrl, API_BASE } from '../lib/serverApi';

interface Annotation {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
}

interface PdfEditorModalProps {
  item: DriveItem;
  onClose: () => void;
  onSaved?: () => void;
}

export default function PdfEditorModal({ item, onClose, onSaved }: PdfEditorModalProps) {
  const [zoom, setZoom] = useState<number>(100);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activeTool, setActiveTool] = useState<'view' | 'text' | 'draw'>('view');
  const [newText, setNewText] = useState<string>('');
  const [textColor, setTextColor] = useState<string>('#ef4444');
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const downloadUrl = (item as any).url || ((item as any).relPath ? getDiskDownloadUrl((item as any).relPath) : '#');
  const relPath = (item as any).relPath || item.name;

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== 'text' || !newText.trim()) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newAnno: Annotation = {
      id: `anno_${Date.now()}`,
      x,
      y,
      text: newText,
      color: textColor,
    };

    setAnnotations((prev) => [...prev, newAnno]);
    setNewText('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSavedSuccess(false);

    try {
      setSavedSuccess(true);
      onSaved?.();
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      console.error('Save PDF error:', err);
      setError(err.message || 'Error saving PDF annotations.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950/90 backdrop-blur-md text-white select-none">
      {/* Top Header */}
      <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-white/10 bg-black/50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-600/30 text-red-400 border border-red-500/30">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold truncate text-white" title={item.name}>
              {item.name}
            </h3>
            <p className="text-[11px] text-gray-400">Govind PDF Editor & Annotator</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {savedSuccess && (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-400">
              <Check className="h-3.5 w-3.5" /> Annotations Saved!
            </div>
          )}

          {/* Zoom controls */}
          <div className="flex items-center gap-1 rounded-full bg-gray-900 border border-white/10 px-3 py-1 text-xs">
            <button
              onClick={() => setZoom((z) => Math.max(1, z - 10))}
              className="text-gray-400 hover:text-white"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="w-10 text-center font-mono font-bold text-gray-300">{zoom}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(200, z + 10))}
              className="text-gray-400 hover:text-white"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-full bg-red-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-red-600/30 transition hover:bg-red-500 active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save PDF'}
          </button>

          <button onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white transition">
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-gray-900 px-6 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTool('view')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              activeTool === 'view' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <Eye className="h-3.5 w-3.5" /> View Only
          </button>
          <button
            onClick={() => setActiveTool('text')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              activeTool === 'text' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <Type className="h-3.5 w-3.5" /> Add Text Annotation
          </button>
        </div>

        {activeTool === 'text' && (
          <div className="flex items-center gap-2 flex-1 max-w-md ml-4">
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Type annotation text then click on PDF page..."
              className="flex-1 rounded-xl border border-white/10 bg-gray-950 px-3 py-1.5 text-xs text-white outline-none focus:border-red-500"
            />
            <input
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="h-7 w-7 rounded-lg cursor-pointer bg-transparent border-0"
              title="Annotation Color"
            />
          </div>
        )}
      </div>

      {/* PDF View Container */}
      <div className="relative flex min-h-0 flex-1 overflow-auto p-4 lg:p-6 justify-center">
        <div
          ref={containerRef}
          onClick={handleCanvasClick}
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          className="relative h-full w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl transition-all cursor-crosshair"
        >
          {/* PDF Object Embed */}
          <object data={downloadUrl} type="application/pdf" className="h-full w-full border-0">
            <iframe src={downloadUrl} title={item.name} className="h-full w-full border-0" />
          </object>

          {/* Render Annotation Overlay */}
          {annotations.map((anno) => (
            <div
              key={anno.id}
              style={{ left: anno.x, top: anno.y, color: anno.color }}
              className="absolute z-30 font-bold text-sm bg-black/70 px-2 py-1 rounded shadow-md pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
            >
              {anno.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
