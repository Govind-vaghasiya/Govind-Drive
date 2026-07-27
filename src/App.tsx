import { useMemo, useState, useRef, useEffect } from "react";
import {
  Menu,
  Search,
  LayoutGrid,
  List,
  ChevronRight,
  ChevronDown,
  Check,
  Bell,
  Settings,
  Upload,
  Clock,
  Star,
  FolderPlus,
  FileText,
  FileSpreadsheet,
  Presentation,
  PanelRightOpen,
  PanelRightClose,
  SortAsc,
  X,
  LogOut,
  Shield,
  FolderOpen,
  Filter,
} from "lucide-react";
import Sidebar from "./cloud/Sidebar";
import ActivityFeed from "./cloud/ActivityFeed";
import FileCard from "./cloud/FileCard";
import FolderCard from "./cloud/FolderCard";
import FileRow from "./cloud/FileRow";
import BatchActionBar from "./cloud/BatchActionBar";
import StorageAnalyticsModal from "./cloud/StorageAnalyticsModal";
import GoogleDriveFilters from "./cloud/GoogleDriveFilters";
import ContextMenu from "./cloud/ContextMenu";
import BottomNav from "./cloud/BottomNav";
import LoginModal from "./cloud/LoginModal";
import AdminUserModal from "./cloud/AdminUserModal";
import UserProfileModal from "./cloud/UserProfileModal";
import ShareModal from "./cloud/ShareModal";
import FilePreviewModal from "./cloud/FilePreviewModal";
import FileEditorModal from "./cloud/FileEditorModal";
import DocEditorModal from "./cloud/DocEditorModal";
import SheetEditorModal from "./cloud/SheetEditorModal";
import PdfEditorModal from "./cloud/PdfEditorModal";
import MoveModal from "./cloud/MoveModal";
import CanvasContextMenu from "./cloud/CanvasContextMenu";
import UploadProgressWidget from "./cloud/UploadProgressWidget";
import {
  defaultFolders,
  defaultFiles,
  activities as defaultActivities,
  type DriveItem,
  type FileKind,
  type ActivityEntry,
} from "./cloud/data";
import { UserProfile, uploadFileToPocketBase, pb } from "./lib/pocketbase";
import {
  fetchDiskItems,
  createDiskFolder,
  uploadDiskFiles,
  renameDiskItem,
  moveDiskItem,
  deleteDiskItem,
  getDiskDownloadUrl,
  DiskItem,
} from "./lib/serverApi";

type View = "grid" | "list";
type SortKey = "name" | "date" | "size" | "kind" | "type";

const navLabels: Record<string, string> = {
  "my-drive": "My Drive",
  recent: "Recent",
  starred: "Starred",
  shared: "Shared with me",
  trash: "Trash",
};

let idCounter = Date.now();
const newId = () => `f_${idCounter++}`;

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const savedUser = localStorage.getItem("govind_drive_user") || localStorage.getItem("aurora_drive_user");
    if (savedUser) {
      try {
        const parsed: UserProfile = JSON.parse(savedUser);
        // Enforce 30-day session expiry
        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        const sessionAge = Date.now() - (parsed.sessionCreatedAt || 0);
        if (parsed.sessionCreatedAt && sessionAge > THIRTY_DAYS_MS) {
          // Session expired — clear it and require fresh login
          localStorage.removeItem('govind_drive_user');
          localStorage.removeItem('aurora_drive_user');
          console.info('🔒 Session expired after 30 days — please log in again.');
          return null;
        }
        return parsed;
      } catch { }
    }
    return null; // No saved session — show login screen
  });

  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [storageModalOpen, setStorageModalOpen] = useState(false);
  const [shareItem, setShareItem] = useState<DriveItem | null>(null);
  const [previewItem, setPreviewItem] = useState<DriveItem | null>(null);
  const [editItem, setEditItem] = useState<DriveItem | null>(null);
  const [moveItem, setMoveItem] = useState<DriveItem | null>(null);
  const [canvasMenu, setCanvasMenu] = useState<{ x: number; y: number } | null>(null);
  const [targetUploadFolder, setTargetUploadFolder] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<{
    uploading: boolean;
    fileName: string;
    count: number;
    progress: number;
    completed: boolean;
    error?: string;
  } | null>(null);

  const [kindFilter, setKindFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("any");
  const [peopleFilter, setPeopleFilter] = useState<string>("anyone");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };


  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityPinned, setActivityPinned] = useState(true);
  const [active, setActive] = useState("my-drive");
  const [view, setView] = useState<View>("grid");
  const [sort, setSort] = useState<SortKey>("date");
  const [sortOpen, setSortOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState<{ x: number; y: number; item: DriveItem } | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  // Per-user storage keys — prevents data mixing between users
  const userStorageKey = (base: string) => {
    const uid = currentUser?.email?.replace(/[^a-z0-9]/gi, '_') || 'default';
    return `${base}_${uid}`;
  };

  const [activityList, setActivityList] = useState<ActivityEntry[]>(() => {
    // Try per-user key first, then global fallback for migration
    const uid = (() => {
      const u = localStorage.getItem('govind_drive_user') || localStorage.getItem('aurora_drive_user');
      if (u) { try { const p = JSON.parse(u); return (p.email || '').replace(/[^a-z0-9]/gi, '_'); } catch {} }
      return 'default';
    })();
    const perUserKey = `govind_drive_activities_${uid}`;
    const saved = localStorage.getItem(perUserKey);
    if (saved) { try { return JSON.parse(saved); } catch {} }
    return [];
  });

  useEffect(() => {
    localStorage.setItem(userStorageKey('govind_drive_activities'), JSON.stringify(activityList));
  }, [activityList, currentUser]);

  const addActivityRecord = (action: string, target: string) => {
    const ts = Date.now();
    const newEntry: ActivityEntry = {
      id: `act_${ts}_${Math.random()}`,
      user: currentUser?.name || "You",
      avatarColor: "bg-blue-600",
      avatar: currentUser?.avatar || undefined,
      action,
      target,
      time: "Just now",
      timestamp: ts,
    };
    setActivityList((prev) => [newEntry, ...prev]);
  };

  // Folder subpath tracking for disk navigation (e.g. "", "Projects", "Projects/Design")
  const [folderSubpath, setFolderSubpath] = useState("");

  const [items, setItems] = useState<DriveItem[]>(() => {
    // Load from per-user key — each user has their own isolated item list
    const uid = (() => {
      const u = localStorage.getItem('govind_drive_user') || localStorage.getItem('aurora_drive_user');
      if (u) { try { const p = JSON.parse(u); return (p.email || '').replace(/[^a-z0-9]/gi, '_'); } catch {} }
      return 'default';
    })();
    const perUserKey = `govind_drive_items_${uid}`;
    const savedItems = localStorage.getItem(perUserKey);
    if (savedItems) { try { return JSON.parse(savedItems); } catch {} }
    return []; // Start empty — disk refresh will populate
  });

  const [renaming, setRenaming] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Marquee Drag Box Selection State
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  const handleMouseDownCanvas = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('a')) return;

    setSelectionBox({
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
    });

    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
      if (!target.closest('[data-item-id]')) {
        setSelectedIds(new Set());
      }
    }
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectionBox) return;

    const currentX = e.clientX;
    const currentY = e.clientY;
    setSelectionBox((prev) => (prev ? { ...prev, currentX, currentY } : null));

    const left = Math.min(selectionBox.startX, currentX);
    const top = Math.min(selectionBox.startY, currentY);
    const right = Math.max(selectionBox.startX, currentX);
    const bottom = Math.max(selectionBox.startY, currentY);

    const cardElements = mainRef.current?.querySelectorAll<HTMLElement>('[data-item-id]');
    const newlySelected = new Set(e.shiftKey || e.ctrlKey || e.metaKey ? selectedIds : []);

    cardElements?.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const itemId = el.getAttribute('data-item-id');
      if (!itemId) return;

      const isIntersecting = !(
        rect.right < left ||
        rect.left > right ||
        rect.bottom < top ||
        rect.top > bottom
      );

      if (isIntersecting) {
        newlySelected.add(itemId);
      }
    });

    setSelectedIds(newlySelected);
  };

  const handleMouseUpCanvas = () => {
    if (selectionBox) {
      setSelectionBox(null);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Resolve the stable disk folder key for a user.
  // The folderId is tied to user.id — immutable, never changes even if name or email changes.
  // For legacy/admin users, falls back to email-derived key for backward compatibility.
  const getDiskUserId = (user: typeof currentUser): string => {
    if (!user) return 'admin_govind_home';
    // folderId is the single source of truth — set once, never changes
    if (user.folderId) return user.folderId;
    // Legacy fallback: derive from email (existing users on disk)
    return user.email.toLowerCase().replace(/[^a-z0-9_@.-]/g, '_').replace(/[@.]/g, '_');
  };

  // Function to refresh items directly from disk for the current user
  // Explicitly passes the userId — no localStorage dependency, no race conditions
  const refreshFromDisk = async (subpath: string = folderSubpath, user: typeof currentUser = currentUser) => {
    const userId = getDiskUserId(user);
    const { items: diskItems } = await fetchDiskItems(subpath, userId);
    if (Array.isArray(diskItems)) {
      const converted: DriveItem[] = diskItems.map((d: DiskItem) => ({
        id: d.id,
        name: d.name,
        kind: d.kind as FileKind,
        size: d.size,
        modified: d.modified,
        modifiedRaw: d.modifiedRaw,
        childCount: d.childCount,
        parentId: subpath || null,
        relPath: d.relPath,
        owner: user?.name || 'You',
        ownerId: user?.email || 'admin@govind.home',
      } as any));
      setItems(converted);
    }
  };

  // When user changes: clear existing items immediately, reset folder, then reload from disk
  const prevUserRef = useRef<string | null>(null);
  useEffect(() => {
    const newUserId = currentUser?.email || null;
    if (prevUserRef.current !== null && prevUserRef.current !== newUserId) {
      // User switched — clear state immediately to prevent data leakage
      setItems([]);
      setActivityList([]);
      setFolderSubpath('');
    }
    prevUserRef.current = newUserId;
    // Pass currentUser explicitly — this runs before localStorage is updated
    refreshFromDisk('', currentUser);
  }, [currentUser]);

  // Save session — auto-assign permanent folderId on first login, stamp sessionCreatedAt once
  useEffect(() => {
    if (currentUser) {
      let userToSave = currentUser;
      if (!userToSave.folderId) {
        const stableKey = String(userToSave.id)
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');
        // Any admin-role user always maps to the well-known 'admin_govind_home' folder
        // This ensures backward-compat: existing files on disk are never lost when the email changes
        const folderId = userToSave.role === 'admin'
          ? 'admin_govind_home'
          : stableKey || userToSave.email.toLowerCase().replace(/[^a-z0-9]/g, '_');
        userToSave = { ...userToSave, folderId };
        setCurrentUser(userToSave);
      }
      // Stamp session creation time ONCE — never overwrite an existing timestamp
      if (!userToSave.sessionCreatedAt) {
        userToSave = { ...userToSave, sessionCreatedAt: Date.now() };
      }
      localStorage.setItem("govind_drive_user", JSON.stringify(userToSave));
    } else {
      localStorage.removeItem("govind_drive_user");
    }
  }, [currentUser]);

  // Save items per-user — prevents data mixing
  useEffect(() => {
    localStorage.setItem(userStorageKey('govind_drive_items'), JSON.stringify(items));
  }, [items, currentUser]);

  const browserItems = useMemo(() => {
    // Since items are loaded from the current user's personal disk folder
    // and stored in per-user localStorage keys, ALL items in state
    // already belong to currentUser. We only need to filter for shared view.
    let list = [...items];

    if (currentUser && active === "shared") {
      const userEmail = (currentUser.email || '').toLowerCase();
      list = list.filter((i) => {
        return (i.shared || (i.sharedWith && i.sharedWith.map((s: string) => s.toLowerCase()).includes(userEmail)))
          && !i.inTrash && i.parentId !== "trash";
      });
    }

    if (active === "my-drive" && !query.trim()) {
      list = list.filter((i) => !i.inTrash && i.parentId !== "trash");
    } else if (active === "recent" && !query.trim()) {
      list = list.filter((i) => i.kind !== "folder" && !i.inTrash && i.parentId !== "trash");
    } else if (active === "starred" && !query.trim()) {
      list = list.filter((i) => i.starred && !i.inTrash && i.parentId !== "trash");
    } else if (active === "shared" && !query.trim()) {
      list = list.filter((i) => !i.inTrash && i.parentId !== "trash");
    } else if (active === "trash" && !query.trim()) {
      list = list.filter((i) => i.inTrash || i.parentId === "trash");
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q));
    }

    if (kindFilter !== "all") {
      if (kindFilter === "doc") {
        list = list.filter((i) => i.kind === "doc" || i.kind === "pdf" || i.kind === "slides");
      } else if (kindFilter === "code") {
        list = list.filter((i) => {
          const ext = i.name.split('.').pop()?.toLowerCase() || '';
          return ["txt", "md", "json", "js", "ts", "css", "html", "py", "sh", "log"].includes(ext);
        });
      } else {
        list = list.filter((i) => i.kind === kindFilter);
      }
    }

    if (dateFilter !== "any") {
      const now = Date.now();
      if (dateFilter === "today") {
        list = list.filter((i) => now - (i.modifiedRaw || 0) <= 86400000);
      } else if (dateFilter === "7days") {
        list = list.filter((i) => now - (i.modifiedRaw || 0) <= 7 * 86400000);
      } else if (dateFilter === "30days") {
        list = list.filter((i) => now - (i.modifiedRaw || 0) <= 30 * 86400000);
      } else if (dateFilter === "2026") {
        list = list.filter((i) => i.modified.includes("2026") || (i.modifiedRaw && new Date(i.modifiedRaw).getFullYear() === 2026));
      }
    }

    if (peopleFilter !== "anyone") {
      if (peopleFilter === "admin") {
        list = list.filter((i) => (i.owner && i.owner.toLowerCase().includes("admin")) || i.starred);
      } else if (peopleFilter === "maya") {
        list = list.filter((i) => i.shared || i.name.toLowerCase().includes("notes"));
      } else if (peopleFilter === "leo") {
        list = list.filter((i) => i.shared || i.name.toLowerCase().includes("plan"));
      }
    }

    list.sort((a, b) => {
      if (a.kind === "folder" && b.kind !== "folder") return -1;
      if (b.kind === "folder" && a.kind !== "folder") return 1;

      if (sort === "kind") return a.kind.localeCompare(b.kind);
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "size") {
        const sizeA = parseFloat(a.size) || 0;
        const sizeB = parseFloat(b.size) || 0;
        return sizeB - sizeA;
      }
      return b.modifiedRaw - a.modifiedRaw;
    });

    if (active === "recent" && sort !== "name" && sort !== "size" && sort !== "kind") {
      list.sort((a, b) => b.modifiedRaw - a.modifiedRaw);
    }

    return list;
  }, [items, sort, query, active, kindFilter, dateFilter, peopleFilter]);

  const folderItems = useMemo(
    () => browserItems.filter((i) => i.kind === "folder"),
    [browserItems]
  );
  const fileItems = useMemo(
    () => browserItems.filter((i) => i.kind !== "folder"),
    [browserItems]
  );

  const openMenu = (e: React.MouseEvent, item: DriveItem) => {
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, item });
  };

  const selectNav = (id: string) => {
    setActive(id);
    setSidebarOpen(false);
    setFolderSubpath("");
    setCurrentFolder(null);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === browserItems.length && browserItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(browserItems.map((i) => i.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBatchStar = () => {
    setItems((prev) =>
      prev.map((i) => (selectedIds.has(i.id) ? { ...i, starred: !i.starred } : i))
    );
    setSelectedIds(new Set());
  };

  const handleBatchDelete = async () => {
    const selectedItems = items.filter((i) => selectedIds.has(i.id));
    for (const item of selectedItems) {
      if ((item as any).relPath) {
        await deleteDiskItem((item as any).relPath);
      }
    }
    await refreshFromDisk(folderSubpath);
    setSelectedIds(new Set());
  };

  const handleBatchDownload = () => {
    const selectedItems = items.filter((i) => selectedIds.has(i.id) && i.kind !== "folder");
    selectedItems.forEach((item) => {
      if ((item as any).relPath) {
        const link = document.createElement("a");
        link.href = getDiskDownloadUrl((item as any).relPath);
        link.download = item.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
    setSelectedIds(new Set());
  };

  const handleBatchMove = () => {
    const firstSelected = items.find((i) => selectedIds.has(i.id));
    if (firstSelected) {
      setMoveItem(firstSelected);
    }
  };

  const handleOpen = (item: DriveItem) => {
    if (item.kind === "folder") {
      const nextSubpath = folderSubpath ? `${folderSubpath}/${item.name}` : item.name;
      setFolderSubpath(nextSubpath);
      setCurrentFolder(item.name);
      setQuery("");
      refreshFromDisk(nextSubpath, currentUser);
    } else {
      setPreviewItem(item);
    }
  };

  const handleRename = async (id: string, newName: string) => {
    const item = items.find((i) => i.id === id);
    if (item && (item as any).relPath) {
      await renameDiskItem((item as any).relPath, newName, getDiskUserId(currentUser));
      await refreshFromDisk(folderSubpath, currentUser);
    } else {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, name: newName } : i)));
    }
    setRenaming(null);
  };

  const handleDelete = async (item: DriveItem) => {
    if ((item as any).relPath) {
      await deleteDiskItem((item as any).relPath, getDiskUserId(currentUser));
      await refreshFromDisk(folderSubpath, currentUser);
    } else {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    }
  };

  const handleToggleStar = (item: DriveItem) =>
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, starred: !i.starred } : i)));

  const handleUploadWithProgress = async (files: FileList | File[], subpath: string) => {
    if (!files || files.length === 0) return;
    const firstFileName = files[0].name;
    const totalCount = files.length;

    // Instantly set visible uploadState
    setUploadState({
      uploading: true,
      fileName: firstFileName,
      count: totalCount,
      progress: 15,
      completed: false,
    });

    const ok = await uploadDiskFiles(files, subpath, (pct, fn) => {
      setUploadState({
        uploading: true,
        fileName: fn || firstFileName,
        count: totalCount,
        progress: Math.max(pct, 20),
        completed: pct >= 100,
      });
    }, getDiskUserId(currentUser));

    if (ok) {
      setUploadState({
        uploading: false,
        fileName: firstFileName,
        count: totalCount,
        progress: 100,
        completed: true,
      });
      addActivityRecord("uploaded", totalCount > 1 ? `${totalCount} files (${firstFileName})` : firstFileName);
      await refreshFromDisk(folderSubpath);
      setTimeout(() => {
        setUploadState(null);
      }, 5000);
    } else {
      // Fallback if backend server fails or is offline
      const newItems: DriveItem[] = Array.from(files).map((f) => {
        const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
        let kind: FileKind = 'doc';
        if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'].includes(ext)) kind = 'image';
        else if (['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) kind = 'video';
        else if (['.mp3', '.wav', '.flac'].includes(ext)) kind = 'audio';
        else if (ext === '.pdf') kind = 'pdf';
        else if (['.xlsx', '.csv', '.xls'].includes(ext)) kind = 'sheet';
        else if (['.pptx', '.ppt'].includes(ext)) kind = 'slides';

        const sizeFormatted = f.size > 1024 * 1024
          ? `${(f.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(f.size / 1024)} KB`;

        return {
          id: newId(),
          name: f.name,
          kind,
          size: sizeFormatted,
          modified: 'Just now',
          modifiedRaw: Date.now(),
          parentId: subpath || null,
          relPath: f.name,
          owner: currentUser?.name || 'User',
          ownerId: currentUser?.email || 'user@example.com',
        };
      });

      setItems((prev) => [...newItems, ...prev]);
      addActivityRecord("uploaded", totalCount > 1 ? `${totalCount} files (${firstFileName})` : firstFileName);

      setUploadState({
        uploading: false,
        fileName: firstFileName,
        count: totalCount,
        progress: 100,
        completed: false,
        error: "Server connection issue. File saved in session.",
      });

      setTimeout(() => {
        setUploadState(null);
      }, 8000);
    }
  };


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const destSubpath = targetUploadFolder !== null ? targetUploadFolder : folderSubpath;
    await handleUploadWithProgress(files, destSubpath);
    e.target.value = "";
    setTargetUploadFolder(null);
    setNewOpen(false);
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const filesToUpload: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relPath = file.webkitRelativePath || file.name;
      filesToUpload.push(new File([file], relPath, { type: file.type }));
    }

    const destSubpath = targetUploadFolder !== null ? targetUploadFolder : folderSubpath;
    await handleUploadWithProgress(filesToUpload, destSubpath);
    e.target.value = "";
    setTargetUploadFolder(null);
    setNewOpen(false);
  };

  const createFolder = async () => {
    const folderName = "New Folder";
    await createDiskFolder(folderSubpath, folderName, getDiskUserId(currentUser));
    await refreshFromDisk(folderSubpath, currentUser);
    setNewOpen(false);
  };

  const createFile = (kind: FileKind, baseName: string, size: string) => {
    const item: DriveItem = {
      id: newId(),
      name: baseName,
      kind,
      size,
      modified: "Just now",
      modifiedRaw: Date.now(),
      parentId: currentFolder,
      owner: currentUser?.name || 'User',
      ownerId: currentUser?.email || 'user@example.com',
    };
    setItems((prev) => [item, ...prev]);
    setRenaming(item.id);
    setNewOpen(false);
  };

  const newFileOptions = [
    { icon: Upload, label: "Upload files", kind: "doc" as FileKind, name: "", size: "" },
    { icon: FolderPlus, label: "Upload folder", kind: "folder" as FileKind, name: "", size: "" },
    { icon: FolderPlus, label: "New folder", kind: "folder" as FileKind, name: "New folder", size: "—" },
    { icon: FileText, label: "New document", kind: "doc" as FileKind, name: "Untitled document.docx", size: "1 KB" },
    { icon: FileSpreadsheet, label: "New spreadsheet", kind: "sheet" as FileKind, name: "Untitled spreadsheet.xlsx", size: "1 KB" },
    { icon: Presentation, label: "New presentation", kind: "slides" as FileKind, name: "Untitled presentation.pptx", size: "1 KB" },
  ];

  const handleInternalDropItem = async (draggedItem: DriveItem, targetFolder: DriveItem) => {
    const rel = (draggedItem as any).relPath || draggedItem.name;
    const targetRel = (targetFolder as any).relPath || targetFolder.name;
    await moveDiskItem(rel, targetRel);
    await refreshFromDisk(folderSubpath);
  };

  const [isDraggingExternal, setIsDraggingExternal] = useState(false);

  const handleGlobalDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes("Files")) {
      setIsDraggingExternal(true);
    }
  };

  const handleGlobalDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
      setIsDraggingExternal(false);
    }
  };

  // Recursive directory reader for HTML5 Drag & Drop webkitGetAsEntry
  const readEntryFiles = async (entry: any, basePath = ""): Promise<{ file: File; relPath: string }[]> => {
    if (entry.isFile) {
      return new Promise((resolve) => {
        entry.file((file: File) => {
          const relPath = basePath ? `${basePath}/${file.name}` : file.name;
          resolve([{ file, relPath }]);
        });
      });
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      const entries: any[] = await new Promise((resolve) => {
        dirReader.readEntries((results: any[]) => resolve(results || []));
      });

      const currentPath = basePath ? `${basePath}/${entry.name}` : entry.name;
      const nestedLists = await Promise.all(
        entries.map((childEntry) => readEntryFiles(childEntry, currentPath))
      );
      return nestedLists.flat();
    }
    return [];
  };

  const handleGlobalDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingExternal(false);

    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      const entryPromises: Promise<{ file: File; relPath: string }[]>[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const entry = item.webkitGetAsEntry?.();
          if (entry) {
            entryPromises.push(readEntryFiles(entry));
          } else {
            const file = item.getAsFile();
            if (file) entryPromises.push(Promise.resolve([{ file, relPath: file.name }]));
          }
        }
      }

      const results = (await Promise.all(entryPromises)).flat();
      if (results.length > 0) {
        const filesToUpload = results.map((r) => new File([r.file], r.relPath, { type: r.file.type }));
        await handleUploadWithProgress(filesToUpload, folderSubpath);
      }
    }
  };

  const handleDropExternalFilesOnFolder = async (files: FileList | File[], targetFolder: DriveItem) => {
    const targetSubpath = (targetFolder as any).relPath || targetFolder.name;
    await handleUploadWithProgress(files, targetSubpath);
  };

  const renderRow = (item: DriveItem) => (
    <FileRow
      key={item.id}
      item={item}
      onMenu={openMenu}
      onRename={handleRename}
      onOpen={handleOpen}
      onDropItem={handleInternalDropItem}
      renaming={renaming}
      selected={selectedIds.has(item.id)}
      onToggleSelect={() => handleToggleSelect(item.id)}
    />
  );
  const renderFolderCard = (item: DriveItem) => (
    <FolderCard
      key={item.id}
      item={item}
      onMenu={openMenu}
      onRename={handleRename}
      onOpen={handleOpen}
      onDropItem={handleInternalDropItem}
      onDropExternalFiles={handleDropExternalFilesOnFolder}
      renaming={renaming}
      selected={selectedIds.has(item.id)}
      onToggleSelect={() => handleToggleSelect(item.id)}
    />
  );
  const renderCard = (item: DriveItem) => (
    <FileCard
      key={item.id}
      item={item}
      onMenu={openMenu}
      onRename={handleRename}
      onOpen={handleOpen}
      onDropItem={handleInternalDropItem}
      onDropExternalFiles={handleDropExternalFilesOnFolder}
      renaming={renaming}
      selected={selectedIds.has(item.id)}
      onToggleSelect={() => handleToggleSelect(item.id)}
    />
  );

  // If not logged in, render LoginModal over blurred UI
  if (!currentUser) {
    return <LoginModal onLoginSuccess={(u) => setCurrentUser(u)} />;
  }

  return (
    <div
      onDragOver={handleGlobalDragOver}
      onDragLeave={handleGlobalDragLeave}
      onDrop={handleGlobalDrop}
      className="relative flex h-screen overflow-hidden bg-[#f0f5fa]"
    >
      {/* Finder Drop Overlay */}
      {isDraggingExternal && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#1B548B]/90 backdrop-blur-md text-white border-4 border-dashed border-white/60 shadow-2xl transition-all">
          <img src="/logo-icon-white.png" alt="Govind Drive" className="h-20 w-auto animate-bounce mb-4 filter drop-shadow-md" />
          <h2 className="text-2xl font-extrabold tracking-tight">Drop files here to upload to Govind Drive</h2>
          <p className="text-sm font-medium text-blue-100 mt-2">Saving directly to your server disk</p>
        </div>
      )}
      {/* Hidden file input for real uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        multiple
      />
      {/* Hidden folder input for directory uploads */}
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFolderUpload}
        className="hidden"
        {...({ webkitdirectory: "", directory: "" } as any)}
        multiple
      />

      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        active={active}
        onSelect={selectNav}
        onClose={() => setSidebarOpen(false)}
        onNew={() => setNewOpen(true)}
        user={currentUser}
        onOpenAdmin={() => setAdminModalOpen(true)}
        onOpenStorageManager={() => setStorageModalOpen(true)}
        onOpenProfile={() => setProfileModalOpen(true)}
      />

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header with high z-index and visible overflow for floating dropdown menus */}
        <header className="relative z-30 flex h-16 shrink-0 items-center justify-between gap-3 bg-transparent px-3 lg:px-6">
          {/* Left: Mobile Menu + Search Bar */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 lg:hidden shrink-0">
              <button onClick={() => setSidebarOpen(true)} className="rounded-full p-2 text-gray-500 hover:bg-gray-200/50" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </button>
              <img src="/logo-icon.png" alt="Govind Drive" className="h-7 w-auto object-contain" />
            </div>

            {/* Search bar */}
            <div className="relative shrink-0 w-44 sm:w-60 md:w-72 lg:w-80 xl:w-[320px]">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="w-full rounded-full border border-transparent bg-white py-2 pl-10 pr-8 text-xs sm:text-sm text-gray-800 shadow-xs outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
              {query && (
                <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:bg-gray-200">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right Side Controls Grouped Together: Filter Pills, View Toggle, Sort, Activity, Admin, Profile */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {/* Filter Pills (Type ▾, Modified ▾, People ▾) */}
            <div className="hidden sm:flex items-center gap-2 overflow-visible">
              <GoogleDriveFilters
                kindFilter={kindFilter}
                onSelectKind={setKindFilter}
                dateFilter={dateFilter}
                onSelectDate={setDateFilter}
                peopleFilter={peopleFilter}
                onSelectPeople={setPeopleFilter}
              />
            </div>

            {/* View toggle (Grid / List pill) */}
            <div className="flex items-center gap-0.5 rounded-full bg-white p-0.5 shadow-xs border border-gray-200/80">
              <button
                onClick={() => setView("grid")}
                aria-label="Grid view"
                className={`rounded-full p-1.5 transition-colors ${view === "grid" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:text-gray-800"
                  }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView("list")}
                aria-label="List view"
                className={`rounded-full p-1.5 transition-colors ${view === "list" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:text-gray-800"
                  }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {/* Sort button */}
            <div className="relative">
              <button
                onClick={() => setSortOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition"
              >
                <SortAsc className="h-3.5 w-3.5 text-gray-500" />
                <span>
                  {sort === "date" ? "Date" : sort === "name" ? "Name" : sort === "size" ? "Size" : "Type"}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-full z-50 mt-1.5 w-44 overflow-hidden rounded-2xl border border-gray-200 bg-white p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                  {(["date", "name", "size", "type"] as const).map((k) => (
                    <button
                      key={k}
                      onClick={() => {
                        setSort(k);
                        setSortOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs transition ${sort === k ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-700 hover:bg-gray-50"
                        }`}
                    >
                      <span>{k === "date" ? "Last modified" : k === "size" ? "Storage used" : k === "name" ? "Name" : "Type"}</span>
                      {sort === k && <Check className="h-4 w-4 text-blue-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info / Activity panel toggle button */}
            <button
              onClick={() => setActivityPinned((v) => !v)}
              title="Toggle activity sidebar"
              className={`hidden lg:block rounded-full p-2 transition-colors ${activityPinned ? "bg-blue-100 text-blue-700" : "bg-white text-gray-500 hover:bg-gray-100 shadow-xs border border-gray-200/80"
                }`}
            >
              {activityPinned ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            </button>

            {/* Admin invite button */}
            {currentUser.role === "admin" && (
              <button
                onClick={() => setAdminModalOpen(true)}
                className="hidden items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors sm:flex"
                title="Invite Friends & Admin Console"
              >
                <Shield className="h-3.5 w-3.5 text-blue-600" />
                <span>Invite</span>
              </button>
            )}

            {/* User Profile & Logout */}
            <div className="flex items-center gap-2 shrink-0 border-l border-gray-200/80 pl-2">
              <div
                onClick={() => setProfileModalOpen(true)}
                className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-xs font-bold text-white ring-2 ring-white cursor-pointer hover:scale-105 transition shadow-sm"
                title={`Edit ${currentUser.name}'s Profile (${currentUser.role})`}
              >
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt={currentUser.name} className="h-full w-full object-cover" />
                ) : (
                  currentUser.name.substring(0, 2).toUpperCase()
                )}
              </div>
              <button
                onClick={() => setCurrentUser(null)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition"
                title="Log Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Filter Bar (Visible on mobile screens) */}
        <div className="flex sm:hidden items-center gap-2 px-3 pb-2 overflow-x-auto no-scrollbar">
          <GoogleDriveFilters
            kindFilter={kindFilter}
            onSelectKind={setKindFilter}
            dateFilter={dateFilter}
            onSelectDate={setDateFilter}
            peopleFilter={peopleFilter}
            onSelectPeople={setPeopleFilter}
          />
        </div>

        {/* Content row */}
        <div className="flex min-h-0 flex-1 overflow-hidden px-2 sm:px-3 pb-3 lg:px-4 lg:pb-4 gap-3 lg:gap-4">

          {/* Scrollable main with Canvas Right-Click Context Menu & Marquee Drag Selection */}
          <main
            ref={mainRef}
            onMouseDown={handleMouseDownCanvas}
            onMouseMove={handleMouseMoveCanvas}
            onMouseUp={handleMouseUpCanvas}
            onMouseLeave={handleMouseUpCanvas}
            onContextMenu={(e) => {
              e.preventDefault();
              setCanvasMenu({ x: e.clientX, y: e.clientY });
            }}
            className="flex-1 overflow-y-auto bg-white rounded-[24px] shadow-sm px-4 py-5 sm:px-6 sm:py-8 min-h-[500px] relative select-none pb-28 lg:pb-8"
          >

            {/* Folder Path Breadcrumbs Header */}
            <div className="mb-6 select-none">
              <div className="flex items-center gap-2 flex-wrap">
                <h1
                  className={`text-2xl font-bold text-gray-900 ${folderSubpath ? "cursor-pointer hover:text-blue-600 transition" : ""
                    }`}
                  onClick={() => {
                    setFolderSubpath("");
                    setCurrentFolder(null);
                  }}
                >
                  {navLabels[active]}
                </h1>

                {folderSubpath &&
                  folderSubpath.split("/").map((part, index, arr) => {
                    const partialSubpath = arr.slice(0, index + 1).join("/");
                    const isLast = index === arr.length - 1;
                    return (
                      <div key={partialSubpath} className="flex items-center gap-2">
                        <ChevronRight className="h-5 w-5 text-gray-400 mt-1" />
                        <h1
                          onClick={() => {
                            if (!isLast) {
                              setFolderSubpath(partialSubpath);
                            }
                          }}
                          className={`text-2xl font-bold ${isLast
                              ? "text-gray-900"
                              : "text-gray-500 hover:text-blue-600 cursor-pointer transition"
                            }`}
                        >
                          {part}
                        </h1>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Files Grid/List */}
            <section>
              {browserItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center select-none animate-in fade-in duration-300">
                  <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-blue-50 text-blue-500 mb-4 shadow-sm border border-blue-100/60">
                    <FolderOpen className="h-12 w-12 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">Empty folder</h3>
                  <p className="mt-1.5 text-sm text-gray-500 max-w-sm">
                    Drop files here or click <span className="font-semibold text-blue-600">+ New</span> above to upload items to this folder.
                  </p>
                </div>
              ) : view === "list" ? (
                <div className="overflow-hidden rounded-xl border border-gray-100">
                  <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1.5fr_1fr_120px_90px_40px] gap-4 border-b border-gray-100 bg-gray-50/80 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                    <span>Name</span>
                    <span className="hidden sm:block">Type</span>
                    <span className="hidden sm:block">Last modified</span>
                    <span className="hidden sm:block">File size</span>
                    <span />
                  </div>
                  <div className="divide-y divide-gray-50">
                    {browserItems.map(renderRow)}
                  </div>
                </div>
              ) : (
                <div className="space-y-7">
                  {/* Top Section: Google Drive style wide Folder cards */}
                  {folderItems.length > 0 && (
                    <div>
                      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400 px-1">Folders</h2>
                      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 min-[1600px]:grid-cols-6">
                        {folderItems.map(renderFolderCard)}
                      </div>
                    </div>
                  )}

                  {/* Bottom Section: File Cards */}
                  {fileItems.length > 0 && (
                    <div>
                      {folderItems.length > 0 && (
                        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400 px-1">Files</h2>
                      )}
                      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 min-[1600px]:grid-cols-8">
                        {fileItems.map(renderCard)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            <div className="h-20 lg:hidden" />
          </main>

          {/* Marquee Drag Box Selection Rectangle Overlay */}
          {selectionBox && Math.hypot(selectionBox.currentX - selectionBox.startX, selectionBox.currentY - selectionBox.startY) > 4 && (
            <div
              style={{
                left: `${Math.min(selectionBox.startX, selectionBox.currentX)}px`,
                top: `${Math.min(selectionBox.startY, selectionBox.currentY)}px`,
                width: `${Math.abs(selectionBox.currentX - selectionBox.startX)}px`,
                height: `${Math.abs(selectionBox.currentY - selectionBox.startY)}px`,
              }}
              className="fixed pointer-events-none z-50 border-2 border-blue-500 bg-blue-500/20 rounded-xl shadow-lg backdrop-blur-2xs animate-in fade-in-50"
            />
          )}

          {/* Right Activity Panel */}
          <div className={`hidden shrink-0 flex-col bg-white rounded-[24px] shadow-sm transition-all duration-300 ease-in-out lg:flex ${activityPinned ? "w-80 opacity-100" : "w-0 overflow-hidden opacity-0"}`}>
            {activityPinned && <ActivityFeed open={true} onClose={() => setActivityPinned(false)} desktop activitiesList={activityList} currentUser={currentUser} />}
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      <ActivityFeed open={activityOpen} onClose={() => setActivityOpen(false)} activitiesList={activityList} currentUser={currentUser} />
      <BottomNav active={active} onSelect={selectNav} onUpload={() => setNewOpen(true)} />

      {/* Context Menu */}
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          item={menu.item}
          onClose={() => setMenu(null)}
          onRename={(item) => setRenaming(item.id)}
          onDelete={handleDelete}
          onToggleStar={handleToggleStar}
          onOpen={handleOpen}
          onShare={(item) => setShareItem(item)}
          onDownload={(item) => {
            const rel = (item as any).relPath || item.name;
            const a = document.createElement("a");
            a.href = getDiskDownloadUrl(rel);
            a.download = item.name;
            a.target = "_blank";
            a.click();
          }}
          onMove={(item) => setMoveItem(item)}
          onUploadIntoFolder={(item) => {
            setTargetUploadFolder((item as any).relPath || item.name);
            fileInputRef.current?.click();
          }}
          onEdit={(item) => setEditItem(item)}
        />
      )}

      {/* Canvas Context Menu (Right-Clicking Empty Space) */}
      {canvasMenu && (
        <CanvasContextMenu
          x={canvasMenu.x}
          y={canvasMenu.y}
          onClose={() => setCanvasMenu(null)}
          onUpload={() => {
            setTargetUploadFolder(null);
            fileInputRef.current?.click();
          }}
          onCreateFolder={createFolder}
          onCreateDoc={() => createFile("doc", "Untitled document.docx", "1 KB")}
          onCreateSheet={() => createFile("sheet", "Untitled spreadsheet.xlsx", "1 KB")}
          onCreateSlides={() => createFile("slides", "Untitled presentation.pptx", "1 KB")}
        />
      )}

      {/* Upload Progress Bar Widget */}
      {uploadState && (
        <UploadProgressWidget
          fileName={uploadState.fileName}
          count={uploadState.count}
          progress={uploadState.progress}
          completed={uploadState.completed}
          error={uploadState.error}
          onClose={() => setUploadState(null)}
        />
      )}
      {previewItem && (
        <FilePreviewModal
          item={previewItem}
          itemsList={browserItems}
          onClose={() => setPreviewItem(null)}
          onNavigate={(nextItem) => setPreviewItem(nextItem)}
          onEdit={(itemToEdit) => {
            setPreviewItem(null);
            setEditItem(itemToEdit);
          }}
        />
      )}

      {/* Smart Web Office Suite Editors */}
      {editItem && (
        editItem.kind === "sheet" || editItem.name.endsWith(".xlsx") || editItem.name.endsWith(".csv") ? (
          <SheetEditorModal
            item={editItem}
            onClose={() => setEditItem(null)}
            onSaved={() => refreshFromDisk(folderSubpath)}
          />
        ) : editItem.kind === "pdf" || editItem.name.endsWith(".pdf") ? (
          <PdfEditorModal
            item={editItem}
            onClose={() => setEditItem(null)}
            onSaved={() => refreshFromDisk(folderSubpath)}
          />
        ) : editItem.kind === "doc" || editItem.name.endsWith(".docx") || editItem.name.endsWith(".doc") || editItem.name.endsWith(".md") || editItem.name.endsWith(".txt") ? (
          <DocEditorModal
            item={editItem}
            onClose={() => setEditItem(null)}
            onSaved={() => refreshFromDisk(folderSubpath)}
          />
        ) : (
          <FileEditorModal
            item={editItem}
            onClose={() => setEditItem(null)}
            onSaved={() => refreshFromDisk(folderSubpath)}
          />
        )
      )}

      {/* Move Modal */}
      {moveItem && (
        <MoveModal
          item={moveItem}
          onClose={() => setMoveItem(null)}
          onMoved={() => refreshFromDisk(folderSubpath)}
        />
      )}

      {/* Share Link Modal */}
      {shareItem && (
        <ShareModal item={shareItem} onClose={() => setShareItem(null)} />
      )}

      {/* Admin Invite Modal */}
      {adminModalOpen && (
        <AdminUserModal currentUser={currentUser} onClose={() => setAdminModalOpen(false)} />
      )}

      {/* User Profile Modal */}
      {profileModalOpen && (
        <UserProfileModal
          user={currentUser}
          onClose={() => setProfileModalOpen(false)}
          onUpdateUser={async (updatedUser) => {
            // CRITICAL: always preserve the existing folderId — name/email changes must NEVER move the folder
            const safeUpdatedUser = {
              ...updatedUser,
              folderId: currentUser?.folderId || updatedUser.folderId,
            };
            setCurrentUser(safeUpdatedUser);
            localStorage.setItem("govind_drive_user", JSON.stringify(safeUpdatedUser));
            try {
              if (pb.authStore.record?.id) {
                await pb.collection('users').update(pb.authStore.record.id, {
                  name: updatedUser.name,
                  avatar: updatedUser.avatar,
                });
              }
            } catch (err) {
              console.warn('PocketBase server user update:', err);
            }
          }}
        />
      )}

      {/* New menu */}
      {newOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setNewOpen(false)}>
          <div className="absolute left-4 top-16 z-50 w-56 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-300/40 lg:left-64 lg:top-16"
            onClick={(e) => e.stopPropagation()}>
            {newFileOptions.map(({ icon: Icon, label, kind, name, size }) => (
              <button key={label}
                onClick={() => {
                  if (label === "Upload files") {
                    fileInputRef.current?.click();
                    setNewOpen(false);
                    return;
                  }
                  if (label === "Upload folder") {
                    folderInputRef.current?.click();
                    setNewOpen(false);
                    return;
                  }
                  if (label === "New folder") createFolder(); else createFile(kind, name, size);
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700">
                <Icon className="h-4 w-4 text-gray-400" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Batch Actions Floating Toolbar */}
      <BatchActionBar
        selectedCount={selectedIds.size}
        totalCount={browserItems.length}
        allSelected={selectedIds.size === browserItems.length && browserItems.length > 0}
        onToggleSelectAll={handleSelectAll}
        onBatchStar={handleBatchStar}
        onBatchDownload={handleBatchDownload}
        onBatchMove={handleBatchMove}
        onBatchDelete={handleBatchDelete}
        onClearSelection={handleClearSelection}
      />

      {/* Storage Analytics Manager Modal */}
      {storageModalOpen && (
        <StorageAnalyticsModal
          items={items}
          user={currentUser}
          onClose={() => setStorageModalOpen(false)}
          onDeleteFile={(file) => handleDelete(file)}
          onClearTrash={() => {
            setItems((prev) => prev.filter((i) => i.parentId !== 'trash'));
          }}
        />
      )}
    </div>
  );
}
