import { useEffect, useRef } from 'react';
import { Upload, FolderPlus, FileText, FileSpreadsheet, Presentation } from 'lucide-react';

interface Props {
  x: number;
  y: number;
  onClose: () => void;
  onUpload: () => void;
  onCreateFolder: () => void;
  onCreateDoc: () => void;
  onCreateSheet: () => void;
  onCreateSlides: () => void;
}

export default function CanvasContextMenu({
  x,
  y,
  onClose,
  onUpload,
  onCreateFolder,
  onCreateDoc,
  onCreateSheet,
  onCreateSlides,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', esc);
    };
  }, [onClose]);

  const adjX = Math.min(x, window.innerWidth - 220);
  const adjY = Math.min(y, window.innerHeight - 260);

  const act = (fn: () => void) => () => {
    fn();
    onClose();
  };

  const options = [
    { icon: Upload, label: 'Upload files', run: act(onUpload) },
    { icon: FolderPlus, label: 'New folder', run: act(onCreateFolder) },
    { icon: FileText, label: 'New document', run: act(onCreateDoc) },
    { icon: FileSpreadsheet, label: 'New spreadsheet', run: act(onCreateSheet) },
    { icon: Presentation, label: 'New presentation', run: act(onCreateSlides) },
  ];

  return (
    <div
      ref={ref}
      className="fixed z-50 w-52 overflow-hidden rounded-2xl bg-white py-1.5 shadow-2xl shadow-gray-300/60 ring-1 ring-gray-200"
      style={{ left: adjX, top: adjY }}
    >
      {options.map(({ icon: Icon, label, run }, idx) => (
        <button
          key={label}
          onClick={run}
          className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700 ${
            idx === 0 ? 'border-b border-gray-100 font-semibold text-blue-700' : ''
          }`}
        >
          <Icon className="h-4 w-4 shrink-0 text-blue-600" />
          {label}
        </button>
      ))}
    </div>
  );
}
