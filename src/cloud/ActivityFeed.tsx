import { X, Activity, Clock } from "lucide-react";
import { ActivityEntry, formatRelativeTime } from "./data";

interface Props {
  open: boolean;
  onClose: () => void;
  desktop?: boolean;
  activitiesList?: ActivityEntry[];
  currentUser?: { name: string; avatar?: string } | null;
}

export default function ActivityFeed({ open, onClose, desktop = false, activitiesList = [], currentUser }: Props) {
  if (desktop) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-500" />
            <h2 className="text-sm font-bold text-gray-800">Activity</h2>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <FeedList list={activitiesList} currentUser={currentUser} />
        </div>
      </div>
    );
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/25 backdrop-blur-sm lg:hidden" onClick={onClose} />}
      <aside className={`fixed inset-y-0 right-0 z-40 flex w-72 flex-col border-l border-gray-200 bg-white transition-transform duration-300 lg:hidden ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-500" />
            <h2 className="text-sm font-bold text-gray-800">Activity</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100" aria-label="Close activity">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <FeedList list={activitiesList} currentUser={currentUser} />
        </div>
      </aside>
    </>
  );
}

function FeedList({ list, currentUser }: { list: ActivityEntry[]; currentUser?: { name: string; avatar?: string } | null }) {
  const userActivities = list.filter((a) => {
    if (!currentUser) return true;
    const currentName = (currentUser.name || '').toLowerCase();
    const actUser = (a.user || '').toLowerCase();
    return actUser === currentName || actUser === 'you' || actUser.includes(currentName);
  });

  if (userActivities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-gray-400">
        <Activity className="h-8 w-8 mb-2 opacity-50 text-blue-500" />
        <p className="text-xs font-medium">No recent activities for your account</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-1">
        <Clock className="h-3 w-3" /> Recent Activity
      </p>
      {userActivities.map((a, i) => {
        const displayAvatar = a.avatar || (currentUser?.avatar && (a.user === currentUser.name || a.user.includes("Govind") || a.user.includes("You")) ? currentUser.avatar : null);

        return (
          <div key={a.id} className="relative flex gap-3 py-3">
            {i < userActivities.length - 1 && (
              <div className="absolute left-[17px] top-12 h-[calc(100%-1.5rem)] w-px bg-gray-100" />
            )}
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-xs overflow-hidden border border-white ${a.avatarColor || 'bg-blue-600'}`}>
              {displayAvatar ? (
                <img src={displayAvatar} alt={a.user} className="h-full w-full object-cover" />
              ) : (
                (a.user || "You").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="min-w-0 pt-1">
              <p className="text-[13px] leading-snug text-gray-700">
                <span className="font-semibold text-gray-900">{a.user}</span>{" "}
                <span className="text-gray-500">{a.action}</span>{" "}
                <span className="font-medium text-gray-800 truncate block" title={a.target}>{a.target}</span>
              </p>
              <p className="mt-0.5 text-[11px] text-gray-400 font-medium">
                {formatRelativeTime(a.timestamp || a.time)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
