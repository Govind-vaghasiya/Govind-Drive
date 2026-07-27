import { Home, Clock, Star, Upload } from "lucide-react";

interface Props {
  active: string;
  onSelect: (id: string) => void;
  onUpload: () => void;
}

const items = [
  { id: "my-drive", label: "Home", icon: Home },
  { id: "recent", label: "Recent", icon: Clock },
  { id: "starred", label: "Starred", icon: Star },
];

export default function BottomNav({ active, onSelect, onUpload }: Props) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-gray-100 bg-white/95 backdrop-blur lg:hidden">
      {items.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onSelect(id)}
          className={`flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors ${
            active === id ? "text-blue-600" : "text-gray-400"
          }`}
        >
          <Icon className="h-5 w-5" />
          {label}
        </button>
      ))}
      <button
        onClick={onUpload}
        className="flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium text-blue-600"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white">
          <Upload className="h-3.5 w-3.5" />
        </div>
        Upload
      </button>
    </nav>
  );
}
