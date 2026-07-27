import { useState, useEffect } from 'react';
import { Folder, X, FolderInput, Check, ArrowRight } from 'lucide-react';
import { DriveItem } from './data';
import { fetchDiskItems, moveDiskItem } from '../lib/serverApi';

interface MoveModalProps {
  item: DriveItem;
  onClose: () => void;
  onMoved?: () => void;
}

export default function MoveModal({ item, onClose, onMoved }: MoveModalProps) {
  const [folders, setFolders] = useState<{ name: string; relPath: string }[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [moving, setMoving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchDiskItems('').then(({ items: rootItems }) => {
      const folderList = rootItems
        .filter((i) => i.isDir && i.name !== item.name)
        .map((i) => ({ name: i.name, relPath: i.relPath }));
      setFolders(folderList);
    });
  }, [item]);

  const handleMove = async () => {
    const rel = (item as any).relPath || item.name;
    setMoving(true);
    const ok = await moveDiskItem(rel, selectedFolder);
    setMoving(false);
    if (ok) {
      setSuccess(true);
      onMoved?.();
      setTimeout(() => onClose(), 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm px-4 select-none">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FolderInput className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Move "{item.name}"</h3>
              <p className="text-xs text-gray-500">Select target folder location on disk</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Success message */}
        {success ? (
          <div className="my-8 flex flex-col items-center justify-center text-emerald-600 space-y-2">
            <Check className="h-10 w-10 rounded-full bg-emerald-100 p-2" />
            <p className="text-sm font-bold">Successfully moved to "{selectedFolder || 'My Drive'}"</p>
          </div>
        ) : (
          <>
            {/* Folder selection list */}
            <div className="mt-4 max-h-60 overflow-y-auto space-y-1.5 pr-1">
              <button
                onClick={() => setSelectedFolder('')}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-xs font-semibold transition ${
                  selectedFolder === ''
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Folder className="h-4 w-4 text-blue-600" />
                  <span>My Drive (Root Folder)</span>
                </div>
                {selectedFolder === '' && <Check className="h-4 w-4 text-blue-600" />}
              </button>

              {folders.map((f) => (
                <button
                  key={f.relPath}
                  onClick={() => setSelectedFolder(f.relPath)}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-xs font-semibold transition ${
                    selectedFolder === f.relPath
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Folder className="h-4 w-4 text-amber-500" />
                    <span>{f.name}</span>
                  </div>
                  {selectedFolder === f.relPath && <Check className="h-4 w-4 text-blue-600" />}
                </button>
              ))}
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                onClick={onClose}
                className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleMove}
                disabled={moving}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-95 disabled:opacity-50"
              >
                {moving ? 'Moving...' : 'Move Here'} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
