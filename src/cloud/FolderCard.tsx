import { useState } from "react";
import { MoreVertical, Star, Users, Check, X } from "lucide-react";
import { type DriveItem } from "./data";
import FolderIcon from "./FolderIcon";

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

export default function FolderCard({
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

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData("application/json", JSON.stringify(item));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
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
      className={`group relative flex items-center justify-between gap-2.5 rounded-xl border px-3.5 py-2.5 transition-all duration-200 select-none bg-white cursor-pointer ${
        isDragOver
          ? "border-blue-500 ring-4 ring-blue-500/30 bg-blue-50 scale-[1.02] shadow-md"
          : selected
          ? "border-blue-500 ring-2 ring-blue-500/30 bg-blue-50/30 shadow-md"
          : "border-gray-200/90 hover:border-gray-300 hover:shadow-md hover:bg-gray-50/50"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2.5 flex-1">
        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.(e);
          }}
          className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition ${
            selected
              ? "border-blue-600 bg-blue-600 text-white shadow-sm opacity-100"
              : "border-gray-300 bg-white text-transparent opacity-0 group-hover:opacity-100 hover:border-blue-500"
          }`}
          title={selected ? "Deselect" : "Select"}
        >
          <Check className="h-3 w-3 stroke-[3]" />
        </button>

        <FolderIcon count={item.childCount ?? 0} shared={item.shared} starred={item.starred} size={26} />
        {isRenaming ? (
          <div className="flex items-center gap-1 min-w-0 flex-1" onClick={(e) => e.stopPropagation()}>
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") onRename(item.id, item.name);
              }}
              className="min-w-0 flex-1 rounded-md border border-blue-400 bg-white px-2 py-0.5 text-xs outline-none ring-2 ring-blue-100 font-semibold"
            />
            <button onClick={commit} className="rounded p-0.5 text-green-600 hover:bg-green-50">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => onRename(item.id, item.name)} className="rounded p-0.5 text-gray-500 hover:bg-gray-200">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <span
            className="truncate text-xs font-semibold text-gray-800 group-hover:text-blue-600 transition-colors"
            title={item.name}
          >
            {item.name}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {item.starred && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
        {item.shared && <Users className="h-3.5 w-3.5 text-gray-400" />}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMenu(e, item);
          }}
          aria-label="More options"
          className="rounded-full p-1 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-200 hover:text-gray-700 transition"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
