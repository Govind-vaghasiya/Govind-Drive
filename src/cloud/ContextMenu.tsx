import { useEffect, useRef } from "react";
import { FolderOpen, Share2, Download, Star, Pencil, FolderInput, Trash2, Upload, History } from "lucide-react";
import type { DriveItem } from "./data";

interface Props {
  x: number; y: number; item: DriveItem;
  onClose: () => void; onRename: (item: DriveItem) => void;
  onDelete: (item: DriveItem) => void; onToggleStar: (item: DriveItem) => void;
  onOpen?: (item: DriveItem) => void; onShare?: (item: DriveItem) => void;
  onDownload?: (item: DriveItem) => void; onMove?: (item: DriveItem) => void;
  onUploadIntoFolder?: (item: DriveItem) => void;
  onEdit?: (item: DriveItem) => void;
}

export default function ContextMenu({ x, y, item, onClose, onRename, onDelete, onToggleStar, onOpen, onShare, onDownload, onMove, onUploadIntoFolder, onEdit }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("keydown", esc); };
  }, [onClose]);

  const adjX = Math.min(x, window.innerWidth - 200);
  const adjY = Math.min(y, window.innerHeight - 340);
  const act = (fn: (i: DriveItem) => void) => () => { fn(item); onClose(); };

  const isFolder = item.kind === "folder";

  const menuItems = [
    ...(isFolder && onUploadIntoFolder ? [{ icon: Upload, label: `Upload files into "${item.name}"`, run: act(onUploadIntoFolder) }] : []),
    { icon: FolderOpen, label: "Open", run: onOpen ? act(onOpen) : onClose },
    ...(!isFolder && onEdit ? [{ icon: History, label: "Manage versions", run: act(onEdit) }] : []),
    { icon: Share2, label: "Share", run: onShare ? act(onShare) : onClose },
    { icon: Download, label: "Download", run: onDownload ? act(onDownload) : onClose },
    { icon: Star, label: item.starred ? "Remove star" : "Star", run: act(onToggleStar) },
    { icon: Pencil, label: "Rename", run: act(onRename) },
    { icon: FolderInput, label: "Move to", run: onMove ? act(onMove) : onClose },
    { icon: Trash2, label: "Move to trash", run: act(onDelete), danger: true },
  ];

  return (
    <div ref={ref}
      className="fixed z-50 w-48 overflow-hidden rounded-2xl bg-white py-1.5 shadow-2xl shadow-gray-300/50 ring-1 ring-gray-200 rounded-xl"
      style={{ left: adjX, top: adjY }}>
      {menuItems.map(({ icon: Icon, label, run, danger }) => (
        <button key={label} onClick={run}
          className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors ${danger ? "text-red-500 hover:bg-red-50" : "text-gray-700 hover:bg-blue-50 hover:text-blue-700"
            }`}>
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </button>
      ))}
    </div>
  );
}
