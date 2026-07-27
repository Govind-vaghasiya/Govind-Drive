import { CheckSquare, Square, Star, Download, FolderInput, Trash2, X } from "lucide-react";

interface Props {
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  onToggleSelectAll: () => void;
  onBatchStar: () => void;
  onBatchDownload: () => void;
  onBatchMove: () => void;
  onBatchDelete: () => void;
  onClearSelection: () => void;
}

export default function BatchActionBar({
  selectedCount,
  totalCount,
  allSelected,
  onToggleSelectAll,
  onBatchStar,
  onBatchDownload,
  onBatchMove,
  onBatchDelete,
  onClearSelection,
}: Props) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-[999] -translate-x-1/2 flex items-center gap-3 rounded-2xl bg-gray-900/95 px-5 py-3 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-xl transition-all select-none animate-in fade-in slide-in-from-bottom-5">
      {/* Select All Checkbox */}
      <button
        onClick={onToggleSelectAll}
        className="flex items-center gap-2 rounded-lg bg-gray-800/80 px-2.5 py-1.5 text-xs font-semibold text-gray-200 hover:bg-gray-700 hover:text-white transition"
        title={allSelected ? "Deselect all items" : "Select all items"}
      >
        {allSelected ? (
          <CheckSquare className="h-4 w-4 text-blue-400" />
        ) : (
          <Square className="h-4 w-4 text-gray-400" />
        )}
        <span>{selectedCount} selected</span>
      </button>

      <div className="h-4 w-px bg-gray-700/80" />

      {/* Quick Action Buttons */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onBatchStar}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-gray-800 hover:text-amber-300 transition"
          title="Star / Unstar selected items"
        >
          <Star className="h-4 w-4 text-amber-400" />
          <span className="hidden sm:inline">Star</span>
        </button>

        <button
          onClick={onBatchDownload}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-gray-800 hover:text-blue-300 transition"
          title="Download selected files"
        >
          <Download className="h-4 w-4 text-blue-400" />
          <span className="hidden sm:inline">Download</span>
        </button>

        <button
          onClick={onBatchMove}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-gray-800 hover:text-indigo-300 transition"
          title="Move selected items to folder"
        >
          <FolderInput className="h-4 w-4 text-indigo-400" />
          <span className="hidden sm:inline">Move</span>
        </button>

        <button
          onClick={onBatchDelete}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-950/50 hover:text-rose-200 transition"
          title="Delete selected items"
        >
          <Trash2 className="h-4 w-4 text-rose-400" />
          <span className="hidden sm:inline">Delete</span>
        </button>
      </div>

      <div className="h-4 w-px bg-gray-700/80" />

      {/* Dismiss Button */}
      <button
        onClick={onClearSelection}
        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white transition"
        title="Clear selection"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
