export type FileKind =
  | "folder"
  | "pdf"
  | "doc"
  | "sheet"
  | "slides"
  | "image"
  | "video"
  | "audio"
  | "archive";

export interface DriveItem {
  id: string;
  name: string;
  kind: FileKind;
  size: string;
  modified: string;
  modifiedRaw: number;
  starred?: boolean;
  shared?: boolean;
  owner?: string;
  ownerId?: string;
  sharedWith?: string[];
  childCount?: number;
  parentId?: string | null;
  inTrash?: boolean;
}

export interface ActivityEntry {
  id: string;
  user: string;
  avatarColor: string;
  avatar?: string;
  action: string;
  target: string;
  time: string;
  timestamp?: number;
}

export function formatRelativeTime(timestamp?: number | string): string {
  if (!timestamp) return 'Just now';
  const now = Date.now();
  const time = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
  if (isNaN(time)) return String(timestamp);

  const diffSec = Math.floor((now - time) / 1000);
  if (diffSec < 0 || diffSec < 30) return 'Just now';
  if (diffSec < 60) return '1 min ago';
  if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60);
    return `${mins} ${mins === 1 ? 'min' : 'mins'} ago`;
  }

  const d = new Date(time);
  const nowD = new Date(now);

  const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  // Today
  if (d.toDateString() === nowD.toDateString()) {
    const hours = Math.floor(diffSec / 3600);
    if (hours < 4) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    return `Today at ${timeStr}`;
  }

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${timeStr}`;
  }

  // Days ago within a week
  const diffDays = Math.floor(diffSec / 86400);
  if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  }

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const kindLabel: Record<FileKind, string> = {
  folder: "Folder",
  pdf: "PDF",
  doc: "Document",
  sheet: "Spreadsheet",
  slides: "Presentation",
  image: "Image",
  video: "Video",
  audio: "Audio",
  archive: "Archive",
};

export function getTypeLabel(item: DriveItem): string {
  if (item.kind === "folder") return "Folder";
  const parts = item.name.split(".");
  const ext = parts.length > 1 ? parts.pop()?.toUpperCase() : "";
  switch (item.kind) {
    case "pdf": return ext ? `${ext} document` : "PDF document";
    case "doc": return ext ? `${ext} document` : "Word document";
    case "sheet": return ext ? `${ext} spreadsheet` : "Spreadsheet";
    case "slides": return ext ? `${ext} presentation` : "Presentation";
    case "image": return ext ? `${ext} image` : "Image";
    case "video": return ext ? `${ext} video` : "Video";
    case "audio": return ext ? `${ext} audio` : "Audio file";
    case "archive": return ext ? `${ext} archive` : "Archive";
    default: return ext ? `${ext} file` : "File";
  }
}


export const defaultFolders: DriveItem[] = [
  { id: "f1", name: "Documents", kind: "folder", size: "—", modified: "Jul 18, 2026", modifiedRaw: 20260718, starred: true, childCount: 12 },
  { id: "f2", name: "Photos", kind: "folder", size: "—", modified: "Jul 15, 2026", modifiedRaw: 20260715, childCount: 47 },
  { id: "f3", name: "Projects", kind: "folder", size: "—", modified: "Jul 19, 2026", modifiedRaw: 20260719, shared: true, childCount: 8 },
  { id: "f4", name: "Music", kind: "folder", size: "—", modified: "Jun 28, 2026", modifiedRaw: 20260628, childCount: 0 },
  { id: "f5", name: "Videos", kind: "folder", size: "—", modified: "Jun 02, 2026", modifiedRaw: 20260602, childCount: 3 },
  { id: "f6", name: "Backups", kind: "folder", size: "—", modified: "May 22, 2026", modifiedRaw: 20260522, childCount: 5 },
  { id: "f7", name: "Work", kind: "folder", size: "—", modified: "Jul 20, 2026", modifiedRaw: 20260720, starred: true, shared: true, childCount: 1067 },
  { id: "f8", name: "Personal", kind: "folder", size: "—", modified: "Jul 12, 2026", modifiedRaw: 20260712, childCount: 2 },
];

export const defaultFiles: DriveItem[] = [
  { id: "d1", name: "Q3 Financial Report.xlsx", kind: "sheet", size: "2.4 MB", modified: "2 hours ago", modifiedRaw: 2026072014, starred: true },
  { id: "d2", name: "Product Launch Plan.pdf", kind: "pdf", size: "5.1 MB", modified: "5 hours ago", modifiedRaw: 2026072011, starred: true },
  { id: "d3", name: "Team Meeting Notes.docx", kind: "doc", size: "840 KB", modified: "Yesterday", modifiedRaw: 20260719, shared: true },
  { id: "d4", name: "Conference 2026 Keynote.pptx", kind: "slides", size: "12.7 MB", modified: "Jul 18, 2026", modifiedRaw: 20260718, starred: true },
  { id: "d5", name: "Hawaii Sunset.jpg", kind: "image", size: "3.8 MB", modified: "Jul 16, 2026", modifiedRaw: 20260716 },
  { id: "d6", name: "Onboarding Walkthrough.mp4", kind: "video", size: "184 MB", modified: "Jul 14, 2026", modifiedRaw: 20260714 },
  { id: "d7", name: "Brand Assets.zip", kind: "archive", size: "47.2 MB", modified: "Jul 10, 2026", modifiedRaw: 20260710, shared: true },
  { id: "d8", name: "Budget Forecast 2026.xlsx", kind: "sheet", size: "1.9 MB", modified: "Jul 09, 2026", modifiedRaw: 20260709 },
  { id: "d9", name: "Contract Template.pdf", kind: "pdf", size: "320 KB", modified: "Jul 03, 2026", modifiedRaw: 20260703 },
  { id: "d10", name: "Profile Portrait.jpg", kind: "image", size: "1.2 MB", modified: "Jun 27, 2026", modifiedRaw: 20260627 },
  { id: "d11", name: "Podcast Episode 14.mp4", kind: "video", size: "256 MB", modified: "Jun 21, 2026", modifiedRaw: 20260621 },
  { id: "d12", name: "Research Draft.docx", kind: "doc", size: "660 KB", modified: "Jun 15, 2026", modifiedRaw: 20260615 },
];

const now = Date.now();
export const defaultActivities: ActivityEntry[] = [
  { id: "a1", user: "You", avatarColor: "bg-blue-600", action: "uploaded", target: "Q3 Financial Report.xlsx", time: "2 hours ago", timestamp: now - 2 * 3600 * 1000 },
  { id: "a2", user: "Maya Chen", avatarColor: "bg-emerald-600", action: "edited", target: "Team Meeting Notes.docx", time: "5 hours ago", timestamp: now - 5 * 3600 * 1000 },
  { id: "a3", user: "You", avatarColor: "bg-blue-600", action: "shared", target: "Projects folder", time: "Yesterday", timestamp: now - 26 * 3600 * 1000 },
  { id: "a4", user: "Leo Park", avatarColor: "bg-amber-600", action: "commented on", target: "Product Launch Plan.pdf", time: "Yesterday", timestamp: now - 30 * 3600 * 1000 },
  { id: "a5", user: "You", avatarColor: "bg-blue-600", action: "starred", target: "Conference 2026 Keynote.pptx", time: "2 days ago", timestamp: now - 48 * 3600 * 1000 },
];
export const activities = defaultActivities;

export const storage = { used: 45.2, total: 100 };
