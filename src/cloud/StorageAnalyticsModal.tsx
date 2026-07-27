import { useState, useMemo, useEffect } from "react";
import {
  HardDrive,
  PieChart,
  Trash2,
  X,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  FileSpreadsheet,
  Sparkles,
  Folder,
  Save,
  Check,
  FolderOpen,
} from "lucide-react";
import { type DriveItem, storage } from "./data";
import { fetchDiskConfig, updateDiskConfig } from "../lib/serverApi";
import { UserProfile } from "../lib/pocketbase";

interface Props {
  items: DriveItem[];
  user?: UserProfile | null;
  onClose: () => void;
  onDeleteFile: (item: DriveItem) => void;
  onClearTrash: () => void;
}

export default function StorageAnalyticsModal({ items, user, onClose, onDeleteFile, onClearTrash }: Props) {
  const [activeTab, setActiveTab] = useState<'analytics' | 'path'>('analytics');
  const [storagePath, setStoragePath] = useState('/Users/chromakey/Desktop/GovindServer');
  const [storageSavedMsg, setStorageSavedMsg] = useState('');

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchDiskConfig().then((cfg) => {
      if (cfg) setStoragePath(cfg);
    });
  }, []);

  const handleSaveStorage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    await updateDiskConfig(storagePath);
    setStorageSavedMsg(`Storage path updated to: ${storagePath}`);
    setTimeout(() => setStorageSavedMsg(''), 4000);
  };

  // Category breakdown calculation
  const breakdown = useMemo(() => {
    let images = 0;
    let videos = 0;
    let docs = 0;
    let audio = 0;
    let sheets = 0;
    let totalBytes = 0;

    items.forEach((item) => {
      const bytes = (item as any).sizeBytes || (parseFloat(item.size) * (item.size.includes("MB") ? 1024 * 1024 : 1024)) || 0;
      totalBytes += bytes;
      if (item.kind === "image") images += bytes;
      else if (item.kind === "video") videos += bytes;
      else if (item.kind === "audio") audio += bytes;
      else if (item.kind === "sheet") sheets += bytes;
      else if (item.kind === "doc" || item.kind === "pdf" || item.kind === "slides") docs += bytes;
    });

    const formatMB = (b: number) => (b / (1024 * 1024)).toFixed(1);

    return {
      imagesMB: formatMB(images),
      videosMB: formatMB(videos),
      docsMB: formatMB(docs),
      audioMB: formatMB(audio),
      sheetsMB: formatMB(sheets),
      imagesPct: totalBytes > 0 ? (images / totalBytes) * 100 : 0,
      videosPct: totalBytes > 0 ? (videos / totalBytes) * 100 : 0,
      docsPct: totalBytes > 0 ? (docs / totalBytes) * 100 : 0,
      audioPct: totalBytes > 0 ? (audio / totalBytes) * 100 : 0,
      sheetsPct: totalBytes > 0 ? (sheets / totalBytes) * 100 : 0,
    };
  }, [items]);

  // Large files sorted descending
  const largeFiles = useMemo(() => {
    return [...items]
      .filter((i) => i.kind !== "folder")
      .sort((a, b) => (b.modifiedRaw || 0) - (a.modifiedRaw || 0))
      .slice(0, 8);
  }, [items]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/10 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/30">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Storage Manager & Analytics</h3>
              <p className="text-xs text-gray-500">Real-time disk breakdown & storage path configuration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-4 bg-white border-b border-gray-100 flex gap-2">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
              activeTab === 'analytics'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <PieChart className="h-4 w-4" /> Usage & Analytics
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('path')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                activeTab === 'path'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <FolderOpen className="h-4 w-4" /> Storage Path Location (Admin)
            </button>
          )}
        </div>

        {/* Content Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'analytics' ? (
            <>
              {/* Main Progress Bar & Capacity */}
              <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/40 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-600">Total Storage Capacity</span>
                  <span className="text-sm font-extrabold text-blue-600">{storage.used} GB / {storage.total} GB</span>
                </div>

                {/* Segmented Stacked Progress Bar */}
                <div className="relative h-4 w-full overflow-hidden rounded-full bg-gray-200/80 flex">
                  <div style={{ width: `${Math.max(breakdown.videosPct, 5)}%` }} className="bg-rose-500 transition-all" title="Videos" />
                  <div style={{ width: `${Math.max(breakdown.imagesPct, 5)}%` }} className="bg-purple-500 transition-all" title="Images" />
                  <div style={{ width: `${Math.max(breakdown.docsPct, 5)}%` }} className="bg-blue-500 transition-all" title="Documents" />
                  <div style={{ width: `${Math.max(breakdown.sheetsPct, 5)}%` }} className="bg-emerald-500 transition-all" title="Spreadsheets" />
                  <div style={{ width: `${Math.max(breakdown.audioPct, 5)}%` }} className="bg-amber-500 transition-all" title="Audio" />
                </div>

                {/* Category Legend */}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-rose-500 shrink-0" />
                    <span className="text-gray-600 font-medium">Videos ({breakdown.videosMB} MB)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-purple-500 shrink-0" />
                    <span className="text-gray-600 font-medium">Images ({breakdown.imagesMB} MB)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500 shrink-0" />
                    <span className="text-gray-600 font-medium">Documents ({breakdown.docsMB} MB)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-gray-600 font-medium">Spreadsheets ({breakdown.sheetsMB} MB)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-gray-600 font-medium">Audio ({breakdown.audioMB} MB)</span>
                  </div>
                </div>
              </div>

              {/* Large Files & Clean-up List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Storage Optimization & Large Files</h4>
                  <button
                    onClick={onClearTrash}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition active:scale-95"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>1-Click Storage Cleanup</span>
                  </button>
                </div>

                <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-xs">
                  {largeFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {file.kind === "image" && <ImageIcon className="h-4 w-4 text-purple-500 shrink-0" />}
                        {file.kind === "video" && <Film className="h-4 w-4 text-rose-500 shrink-0" />}
                        {file.kind === "audio" && <Music className="h-4 w-4 text-amber-500 shrink-0" />}
                        {file.kind === "sheet" && <FileSpreadsheet className="h-4 w-4 text-emerald-500 shrink-0" />}
                        {(file.kind === "doc" || file.kind === "pdf") && <FileText className="h-4 w-4 text-blue-500 shrink-0" />}
                        <span className="truncate text-xs font-semibold text-gray-800">{file.name}</span>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-xs font-bold text-gray-500">{file.size}</span>
                        <button
                          onClick={() => onDeleteFile(file)}
                          className="rounded-full p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition"
                          title="Delete file"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* TAB 2: STORAGE PATH LOCATION CONFIGURATION */
            <div className="space-y-4">
              <div className="rounded-2xl bg-blue-50/70 p-4 border border-blue-100">
                <div className="flex items-center gap-3">
                  <Folder className="h-5 w-5 text-blue-600 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Host Server Storage Folder</h4>
                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                      Select where on your Mac Studio / Server disk all uploaded files and folders will be saved.
                    </p>
                  </div>
                </div>
              </div>

              {storageSavedMsg && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 border border-emerald-200">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>{storageSavedMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveStorage} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Absolute Directory Path on Host
                  </label>
                  <input
                    type="text"
                    required
                    value={storagePath}
                    onChange={(e) => setStoragePath(e.target.value)}
                    placeholder="/Users/yourname/DriveStorage or /Volumes/ExternalDrive"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs font-mono text-gray-900 outline-none transition focus:border-blue-500 focus:bg-white"
                  />
                  <p className="mt-1.5 text-[11px] text-gray-500">
                    Tip: You can use an internal drive or external hard drive path (e.g. <code className="font-mono text-blue-600">/Volumes/MyDrive/Data</code>).
                  </p>
                </div>

                {/* Preset Storage Folder Shortcuts */}
                <div>
                  <span className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Quick Location Presets (Mac Studio)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setStoragePath('/Users/chromakey/Desktop/GovindServer')}
                      className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition"
                    >
                      📁 Desktop Server (Default)
                    </button>
                    <button
                      type="button"
                      onClick={() => setStoragePath('/Users/chromakey/DriveData')}
                      className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition"
                    >
                      🏠 User Home Directory
                    </button>
                    <button
                      type="button"
                      onClick={() => setStoragePath('/Volumes/ExternalHDD/GovindDrive')}
                      className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition"
                    >
                      💾 External Hard Drive
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 active:scale-95"
                >
                  <Save className="h-4 w-4" /> Save Storage Configuration
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-3.5 bg-gray-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-gray-900 px-5 py-2 text-xs font-bold text-white hover:bg-gray-800 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
