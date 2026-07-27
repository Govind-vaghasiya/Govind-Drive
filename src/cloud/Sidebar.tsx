import { HardDrive, Home, Clock, Star, Users, Trash2, Cloud, X, Plus, Shield } from "lucide-react";
import { storage } from "./data";
import { UserProfile } from "../lib/pocketbase";

interface Props {
  open: boolean;
  active: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  onNew: () => void;
  user?: UserProfile | null;
  onOpenAdmin?: () => void;
  onOpenStorageManager?: () => void;
  onOpenProfile?: () => void;
}

const nav = [
  { id: "my-drive", label: "My Drive", icon: Home },
  { id: "recent", label: "Recent", icon: Clock },
  { id: "starred", label: "Starred", icon: Star },
  { id: "shared", label: "Shared with me", icon: Users },
  { id: "trash", label: "Trash", icon: Trash2 },
];

export default function Sidebar({ open, active, onSelect, onClose, onNew, user, onOpenAdmin, onOpenStorageManager, onOpenProfile }: Props) {
  const pct = Math.round((storage.used / storage.total) * 100);

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/25 backdrop-blur-sm lg:hidden" onClick={onClose} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-56 flex-col bg-white border-r border-gray-200 transition-transform duration-300 lg:static lg:z-0 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>

        {/* Logo */}
        <div className="flex h-14 items-center justify-between px-4 border-b border-gray-100">
          <div className="flex items-center gap-2 py-1">
            <img src="/Govind%20Drive%20Logo%20Small%202.png" alt="Govind Drive" className="h-8 w-auto max-w-[155px] object-contain select-none" />
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 lg:hidden" aria-label="Close sidebar">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* New button */}
        <div className="px-4 pt-4 pb-2">
          <button onClick={onNew}
            className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-300/40 transition-all hover:bg-blue-700 hover:shadow-blue-400/50 active:scale-95">
            <Plus className="h-4 w-4" />
            New
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-2 space-y-0.5">
          {nav.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => onSelect(id)}
              className={`flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-all ${active === id
                ? "bg-blue-50 text-blue-700 font-semibold"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}>
              <Icon className={`h-4 w-4 shrink-0 ${active === id ? "text-blue-600" : "text-gray-400"}`} />
              <span className="truncate">{label}</span>
            </button>
          ))}

          {/* Admin Invite Button - Standard Unselected Styling */}
          {user?.role === 'admin' && onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all"
            >
              <Shield className="h-4 w-4 shrink-0 text-gray-400" />
              <span className="truncate">Invite Friends</span>
            </button>
          )}
        </nav>

        {/* User Profile Card */}
        {user && onOpenProfile && (
          <div
            onClick={onOpenProfile}
            className="mx-3 mb-3 flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/80 p-2.5 cursor-pointer hover:bg-blue-50/70 hover:border-blue-200 transition-all group"
            title="Edit profile information"
          >
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-xs font-bold text-white shadow-xs">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                user.name.substring(0, 2).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-gray-900 truncate group-hover:text-blue-700">{user.name}</p>
              <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
        )}

        {/* Storage */}
        <div
          onClick={onOpenStorageManager}
          className="border-t border-gray-100 px-4 py-4 cursor-pointer hover:bg-blue-50/50 transition-colors group"
          title="Click to view detailed storage analytics"
        >
          <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-400 group-hover:text-blue-600">
            <div className="flex items-center gap-1.5">
              <HardDrive className="h-3.5 w-3.5" />
              <span>Storage</span>
            </div>
            <span className="text-[10px] lowercase font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">manage</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            <span className="font-bold text-gray-700">{storage.used} GB</span> of {storage.total} GB used
          </p>
        </div>
      </aside>
    </>
  );
}
