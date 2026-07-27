import { useState } from "react";
import { MoreVertical, Star, Users, Check, X } from "lucide-react";
import { type DriveItem } from "./data";
import FolderIcon from "./FolderIcon";
import FileThumb from "./FileThumb";

interface Props {
  item: DriveItem;
  onMenu: (e: React.MouseEvent, item: DriveItem) => void;
  onRename: (id: string, name: string) => void;
  onOpen?: (item: DriveItem) => void;
  onDropItem?: (draggedItem: DriveItem, targetFolder: DriveItem) => void;
  onDropExternalFiles?: (files: FileList | File[], targetFolder: DriveItem) => void;
  renaming?: string | null;
  selected?: boolean;
  onToggleSelect?: (e: React.MouseEvent) => void;
}

export default function FileCard({
  item,
  onMenu,
  onRename,
  onOpen,
  onDropItem,
  onDropExternalFiles,
  renaming,
  selected = false,
  onToggleSelect,
}: Props) {
  const [draft, setDraft] = useState(item.name);
  const [isDragOver, setIsDragOver] = useState(false);
  const isRenaming = renaming === item.id;

  const commit = () => {
    const v = draft.trim();
    onRename(item.id, v || item.name);
  };

  const isMedia = item.kind === "image" || item.kind === "video";
  const isFolder = item.kind === "folder";

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData("application/json", JSON.stringify(item));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (isFolder) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (isFolder) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (isFolder) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onDropExternalFiles?.(e.dataTransfer.files, item);
        return;
      }
      try {
        const raw = e.dataTransfer.getData("application/json");
        if (raw) {
          const draggedItem: DriveItem = JSON.parse(raw);
          if (draggedItem.id !== item.id) {
            onDropItem?.(draggedItem, item);
          }
        }
      } catch (err) {
        console.error("Drop item parse error:", err);
      }
    }
  };

  return (
    <div
      data-item-id={item.id}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
          onToggleSelect?.(e);
        }
      }}
      onDoubleClick={() => onOpen?.(item)}
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border transition-all duration-200 select-none bg-white ${
        isDragOver
          ? "border-blue-500 ring-4 ring-blue-500/30 bg-blue-50/80 scale-[1.03] shadow-xl"
          : selected
          ? "border-blue-500 ring-2 ring-blue-500/30 bg-blue-50/20 shadow-md"
          : "border-gray-200/80 hover:border-gray-300 hover:shadow-lg hover:shadow-gray-200/50"
      }`}
    >
      {/* Upper Preview Container (100% Zero Padding Full-Bleed Edge-to-Edge) */}
      <div className="relative flex h-28 sm:h-36 w-full items-center justify-center overflow-hidden bg-gray-50/70 p-0">
        <FileThumb kind={item.kind} name={item.name} relPath={(item as any).relPath} url={(item as any).url} />

        {/* Checkbox Select Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.(e);
          }}
          className={`absolute left-2.5 top-2.5 z-20 flex h-5 w-5 items-center justify-center rounded-md border transition ${
            selected
              ? "border-blue-600 bg-blue-600 text-white shadow-sm opacity-100"
              : "border-gray-300 bg-white/90 text-transparent opacity-0 group-hover:opacity-100 hover:border-blue-500"
          }`}
          title={selected ? "Deselect" : "Select"}
        >
          <Check className="h-3.5 w-3.5 stroke-[3]" />
        </button>

        {/* Drop visual badge on folder hover */}
        {isDragOver && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-blue-600/20 backdrop-blur-xs font-bold text-xs text-blue-700 uppercase tracking-wider">
            Drop into {item.name}
          </div>
        )}

        {/* Quick action overflow button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMenu(e, item);
          }}
          aria-label="More options"
          className="absolute right-2 top-2 z-10 rounded-full bg-white/90 backdrop-blur-md p-1.5 text-gray-600 shadow-sm opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white hover:text-gray-900"
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {/* Star / Shared indicators */}
        <div className="absolute left-2.5 top-2.5 z-10 flex items-center gap-1">
          {item.starred && (
            <span className="rounded-full bg-amber-500/90 backdrop-blur-md p-1 text-white shadow-sm">
              <Star className="h-3 w-3 fill-white" />
            </span>
          )}
          {item.shared && (
            <span className="rounded-full bg-blue-600/90 backdrop-blur-md p-1 text-white shadow-sm">
              <Users className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>

      {/* Bottom Info Container */}
      <div className="flex flex-1 flex-col p-3.5 border-t border-gray-100 bg-white">
        {isRenaming ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") onRename(item.id, item.name);
              }}
              className="min-w-0 flex-1 rounded-lg border border-blue-400 bg-white px-2 py-1 text-xs outline-none ring-2 ring-blue-100"
            />
            <button onClick={commit} className="rounded p-1 text-green-600 hover:bg-green-50">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => onRename(item.id, item.name)} className="rounded p-1 text-gray-500 hover:bg-gray-200">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <h3
            onClick={(e) => {
              e.stopPropagation();
              onOpen?.(item);
            }}
            className="truncate text-xs font-bold text-gray-900 leading-snug tracking-tight hover:text-blue-600 hover:underline cursor-pointer"
            title={item.name}
          >
            {item.name}
          </h3>
        )}

        <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
          <span>{item.modified}</span>
          <span className="font-semibold text-gray-500">{item.size}</span>
        </div>
      </div>
    </div>
  );
}
