import { useState } from "react";
import { MoreVertical, Star, Users, Check, X } from "lucide-react";
import { type DriveItem, getTypeLabel } from "./data";
import FolderIcon from "./FolderIcon";
import FileThumb from "./FileThumb";

interface Props {
  item: DriveItem;
  onMenu: (e: React.MouseEvent, item: DriveItem) => void;
  onRename: (id: string, name: string) => void;
  onOpen?: (item: DriveItem) => void;
  onDropItem?: (draggedItem: DriveItem, targetFolder: DriveItem) => void;
  renaming?: string | null;
  selected?: boolean;
  onToggleSelect?: (e: React.MouseEvent) => void;
}

export default function FileRow({
  item,
  onMenu,
  onRename,
  onOpen,
  onDropItem,
  renaming,
  selected = false,
  onToggleSelect,
}: Props) {
  const [draft, setDraft] = useState(item.name);
  const [isDragOver, setIsDragOver] = useState(false);
  const isRenaming = renaming === item.id;
  const isFolder = item.kind === "folder";

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
      className={`group grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-2.5 transition-all rounded-xl select-none sm:grid-cols-[1.5fr_1fr_120px_90px_40px] cursor-pointer ${
        isDragOver
          ? "bg-blue-100 ring-2 ring-blue-500 scale-[1.01]"
          : selected
          ? "bg-blue-50/80 font-medium"
          : "hover:bg-blue-50/60"
      }`}
    >
      {/* Icon + Name */}
      <div className="flex min-w-0 items-center gap-3">
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

        <div className="flex h-9 w-9 shrink-0 items-center justify-center">
          {item.kind === "folder" ? (
            <FolderIcon count={item.childCount ?? 0} shared={item.shared} starred={item.starred} size={32} />
          ) : (
            <FileThumb kind={item.kind} name={item.name} relPath={(item as any).relPath} url={(item as any).url} size={32} />
          )}
        </div>
        <div className="min-w-0 flex-1">
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
                className="min-w-0 flex-1 rounded-lg border border-blue-400 px-2 py-0.5 text-sm outline-none ring-2 ring-blue-100"
              />
              <button onClick={commit} className="rounded p-1 text-green-600 hover:bg-green-50">
                <Check className="h-4 w-4" />
              </button>
              <button onClick={() => onRename(item.id, item.name)} className="rounded p-1 text-gray-400 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-gray-800 hover:text-blue-600 hover:underline">{item.name}</span>
              {item.starred && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
              {item.shared && <Users className="h-3.5 w-3.5 shrink-0 text-gray-400" />}
            </div>
          )}
          <p className="text-[11px] font-medium text-gray-500 sm:hidden">{getTypeLabel(item)} • {item.size}</p>
        </div>
      </div>

      <span className="hidden text-[13px] text-gray-600 truncate sm:block">{getTypeLabel(item)}</span>
      <span className="hidden text-[13px] text-gray-500 truncate sm:block">{item.modified}</span>
      <span className="hidden text-[13px] text-gray-500 truncate sm:block">{item.kind === "folder" ? "—" : item.size}</span>

      <button
        onClick={(e) => onMenu(e, item)}
        aria-label="More options"
        className="rounded-full p-1.5 text-gray-400 transition-all hover:bg-blue-100 hover:text-blue-700 sm:opacity-0 sm:group-hover:opacity-100"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
    </div>
  );
}
