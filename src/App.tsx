import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Folder,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  Image as ImageIcon,
  Film,
  Music,
  File as FileGeneric,
  Search,
  Grid,
  List as ListIcon,
  Upload,
  FolderPlus,
  Plus,
  RefreshCw,
  MoreVertical,
  Download,
  Trash2,
  Edit2,
  Star,
  Eye,
  LogOut,
  HardDrive,
  Check,
  X,
  ChevronRight,
  Home,
  ShieldCheck,
  Lock,
  User as UserIcon,
  AlertCircle,
  Clock,
  Sparkles,
  ExternalLink,
  Users,
  Info,
  UserPlus,
  ChevronDown,
  Activity,
  ArrowUpDown,
  RotateCcw,
  Play,
  Share2,
  Copy,
  CheckCircle2,
  Moon,
  Sun,
  History,
  FileBarChart,
  FolderDown,
  Globe,
  Settings,
  Shield,
  Calendar,
  FolderInput,
  Files,
} from 'lucide-react';

import logoImg from './assets/logo.png';
import logoIconImg from './assets/logo-icon.png';

import {
  NCUser,
  FileItem,
  FileKind,
  TrashItem,
  NC_HOST,
  ncLogin,
  getCurrentUser,
  ncLogout,
  listFiles,
  createFolder,
  createOfficeDocument,
  moveItem,
  copyItem,
  uploadFiles,
  deleteItem,
  renameItem,
  downloadFile,
  fetchBlob,
  getStorageInfo,
  listTrash,
  restoreTrashItem,
  deleteTrashItem,
  emptyTrash,
  getUserAvatarUrl,
  listActivities,
  ActivityItem,
  listSharesForPath,
  createPublicShare,
  createUserShare,
  deleteShare,
  listSharedWithMe,
  ShareItem,
  searchSharees,
  ShareeItem,
  listNCUsers,
  createNCUser,
  deleteNCUser,
  NCProvisionedUser,
} from './lib/nc';

// Caches for media thumbnails
const imageThumbnailCache = new Map<string, string>();
const videoThumbnailCache = new Map<string, string>();

async function generateVideoThumbnail(blobUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = blobUrl;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    let done = false;
    const cleanUp = () => {
      done = true;
      video.pause();
      video.removeAttribute('src');
      video.load();
    };

    video.onloadeddata = () => {
      video.currentTime = Math.min(1.5, Math.max(0.1, video.duration ? video.duration / 4 : 0.5));
    };

    video.onseeked = () => {
      if (done) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          cleanUp();
          resolve(dataUrl);
        } else {
          cleanUp();
          reject(new Error('No 2d context'));
        }
      } catch (err) {
        cleanUp();
        reject(err);
      }
    };

    video.onerror = () => {
      cleanUp();
      reject(new Error('Video error'));
    };

    setTimeout(() => {
      if (!done) {
        cleanUp();
        reject(new Error('Video timeout'));
      }
    }, 7000);
  });
}

// ---------------------------------------------------------------------------
// Helper: format bytes
// ---------------------------------------------------------------------------
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 4);
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(1))} ${units[i]}`;
}

// ---------------------------------------------------------------------------
// Toast Notification Type
// ---------------------------------------------------------------------------
interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

// ---------------------------------------------------------------------------
// Professional User Avatar Component
// ---------------------------------------------------------------------------
function UserAvatar({
  username,
  displayName,
  size = 32,
  className = '',
}: {
  username: string;
  displayName: string;
  size?: number;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const avatarUrl = getUserAvatarUrl(username, size * 2);

  const initials = useMemo(() => {
    if (!displayName) return 'GD';
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase();
  }, [displayName]);

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0b57d0 0%, #4338ca 100%)',
        color: '#ffffff',
        fontWeight: 700,
        fontSize: Math.max(10, Math.floor(size * 0.38)),
        letterSpacing: '0.5px',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        border: '1.5px solid rgba(255,255,255,0.85)',
        flexShrink: 0,
      }}
    >
      {!imgError ? (
        <img
          src={avatarUrl}
          alt={displayName}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Application Component
// ---------------------------------------------------------------------------
export default function App() {
  // Auth state
  const [user, setUser] = useState<NCUser | null>(() => getCurrentUser());
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('gd_theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('gd_theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('gd_theme', 'light');
    }
  }, [isDarkMode]);

  // File explorer state
  const [currentPath, setCurrentPath] = useState<string>('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'mydrive' | 'recent' | 'starred' | 'shared' | 'trash'>('mydrive');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showActivity, setShowActivity] = useState<boolean>(true);
  const [activityTab, setActivityTab] = useState<'details' | 'activity'>('details');

  // Selected item inspector for Details tab
  const [selectedItem, setSelectedItem] = useState<FileItem | null>(null);

  // Drag and drop for moving files/folders into each other
  const [draggedItem, setDraggedItem] = useState<FileItem | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  // Marquee Selection (Click and Drag Box to select multiple items)
  const [marquee, setMarquee] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // Filters & Sorting Dropdowns
  const [typeFilter, setTypeFilter] = useState<'all' | 'folders' | 'doc' | 'sheet' | 'slides' | 'video' | 'image' | 'pdf'>('all');
  const [dateFilter, setDateFilter] = useState<'anytime' | 'today' | '7days' | '30days' | 'year'>('anytime');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'name_asc' | 'name_desc' | 'size_desc'>('name_asc');

  const [openDropdown, setOpenDropdown] = useState<'type' | 'date' | 'people' | 'sort' | 'new' | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Starred / Favorites local store
  const [starredIds, setStarredIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('gd_starred');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Selection state
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

  // Storage info
  const [storageInfo, setStorageInfo] = useState<{ used: number; total: number }>({
    used: user?.storageUsed || 0,
    total: user?.storageTotal || 0,
  });

  // Trash state
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loadingTrash, setLoadingTrash] = useState(false);
  const [emptyTrashConfirm, setEmptyTrashConfirm] = useState(false);

  // Activities state
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Shared With Me state
  const [sharedWithMeFiles, setSharedWithMeFiles] = useState<FileItem[]>([]);
  const [loadingSharedWithMe, setLoadingSharedWithMe] = useState(false);

  // Sharing Modal state
  const [shareModal, setShareModal] = useState<{
    open: boolean;
    item: FileItem | null;
    shares: ShareItem[];
    loading: boolean;
  }>({
    open: false,
    item: null,
    shares: [],
    loading: false,
  });
  const [sharePassword, setSharePassword] = useState('');
  const [shareExpireDate, setShareExpireDate] = useState('');
  const [shareWithUser, setShareWithUser] = useState('');
  const [shareesList, setShareesList] = useState<ShareeItem[]>([]);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);
  const [creatingShare, setCreatingShare] = useState(false);

  // Admin User Management state (Phase 4.7)
  const [adminUsersModalOpen, setAdminUsersModalOpen] = useState(false);
  const [adminUsersList, setAdminUsersList] = useState<NCProvisionedUser[]>([]);
  const [loadingAdminUsers, setLoadingAdminUsers] = useState(false);
  const [newAdminUserId, setNewAdminUserId] = useState('');
  const [newAdminUserPass, setNewAdminUserPass] = useState('');
  const [newAdminUserDisplay, setNewAdminUserDisplay] = useState('');

  // Move / Copy Destination Picker Modal
  const [moveCopyModal, setMoveCopyModal] = useState<{
    open: boolean;
    mode: 'move' | 'copy';
    items: FileItem[];
    selectedDestPath: string;
  } | null>(null);

  // Modals
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [newDocModal, setNewDocModal] = useState<{
    open: boolean;
    type: 'doc' | 'sheet' | 'slides' | 'text';
    title: string;
    ext: string;
  }>({
    open: false,
    type: 'doc',
    title: 'New Document',
    ext: '.docx',
  });
  const [newDocName, setNewDocName] = useState('');
  const [creatingDoc, setCreatingDoc] = useState(false);

  // Rename & Delete
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteTargets, setDeleteTargets] = useState<FileItem[]>([]);

  // Preview & OnlyOffice
  const [previewTarget, setPreviewTarget] = useState<FileItem | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [onlyOfficeModal, setOnlyOfficeModal] = useState<{
    open: boolean;
    url: string;
    name: string;
    item: FileItem;
  } | null>(null);

  // Context menu
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: FileItem;
  } | null>(null);

  // Upload widget
  const [uploadState, setUploadState] = useState<{
    uploading: boolean;
    fileName: string;
    progress: number;
    totalFiles: number;
    completed: boolean;
    error?: string;
  } | null>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // -------------------------------------------------------------------------
  // Toast Helper
  // -------------------------------------------------------------------------
  const addToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // -------------------------------------------------------------------------
  // Star toggle
  // -------------------------------------------------------------------------
  const toggleStar = useCallback((relPath: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(relPath)) next.delete(relPath);
      else next.add(relPath);
      localStorage.setItem('gd_starred', JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  // -------------------------------------------------------------------------
  // Load Files, Trash, Activities & Shares
  // -------------------------------------------------------------------------
  const refreshFiles = useCallback(async (path = currentPath) => {
    if (!user) return;
    setLoadingFiles(true);
    try {
      const items = await listFiles(path);
      setFiles(items);
      if (items.length > 0) {
        setSelectedItem((prev) => (prev ? items.find((f) => f.relPath === prev.relPath) || items[0] : items[0]));
      }
    } catch (err) {
      console.error('Failed to list files:', err);
      addToast('error', 'Failed to load folder contents.');
    } finally {
      setLoadingFiles(false);
    }
  }, [user, currentPath, addToast]);

  const refreshTrash = useCallback(async () => {
    if (!user) return;
    setLoadingTrash(true);
    try {
      const items = await listTrash();
      setTrashItems(items);
    } catch (err) {
      console.error('Failed to list trash:', err);
      addToast('error', 'Failed to load trashbin.');
    } finally {
      setLoadingTrash(false);
    }
  }, [user, addToast]);

  const refreshActivities = useCallback(async () => {
    if (!user) return;
    setLoadingActivities(true);
    try {
      const acts = await listActivities(40);
      setActivities(acts);
    } catch (err) {
      console.error('Failed to list activities:', err);
    } finally {
      setLoadingActivities(false);
    }
  }, [user]);

  const refreshSharedWithMe = useCallback(async () => {
    if (!user) return;
    setLoadingSharedWithMe(true);
    try {
      const sharedItems = await listSharedWithMe();
      setSharedWithMeFiles(sharedItems);
    } catch (err) {
      console.error('Failed to list shared items:', err);
      addToast('error', 'Failed to load shared items.');
    } finally {
      setLoadingSharedWithMe(false);
    }
  }, [user, addToast]);

  const refreshStorage = useCallback(async () => {
    if (!user) return;
    const q = await getStorageInfo();
    if (q) setStorageInfo(q);
  }, [user]);

  const refreshAdminUsers = useCallback(async () => {
    if (!user?.isAdmin) return;
    setLoadingAdminUsers(true);
    const uList = await listNCUsers();
    setAdminUsersList(uList);
    setLoadingAdminUsers(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      if (activeTab === 'trash') {
        refreshTrash();
      } else if (activeTab === 'shared') {
        refreshSharedWithMe();
      } else {
        refreshFiles(currentPath);
      }
      refreshStorage();
      setSelectedPaths(new Set());
    }
  }, [user, currentPath, activeTab, refreshFiles, refreshTrash, refreshSharedWithMe, refreshStorage]);

  useEffect(() => {
    if (user && showActivity) {
      refreshActivities();
    }
  }, [user, showActivity, refreshActivities]);

  // Trash actions
  const handleRestore = async (trashId: string, name: string) => {
    const res = await restoreTrashItem(trashId);
    if (res.ok) {
      addToast('success', `Restored "${name}" to Drive`);
      refreshTrash();
      refreshStorage();
      refreshActivities();
    } else {
      addToast('error', res.error || 'Failed to restore item.');
    }
  };

  const handleDeletePermanently = async (trashId: string, name: string) => {
    const res = await deleteTrashItem(trashId);
    if (res.ok) {
      addToast('success', `Permanently deleted "${name}"`);
      refreshTrash();
      refreshStorage();
    } else {
      addToast('error', res.error || 'Failed to delete item.');
    }
  };

  const handleEmptyTrash = async () => {
    const res = await emptyTrash();
    if (res.ok) {
      addToast('success', 'Emptied Trash');
      setEmptyTrashConfirm(false);
      refreshTrash();
      refreshStorage();
    } else {
      addToast('error', res.error || 'Failed to empty trash.');
    }
  };

  // Keyboard Delete / Backspace listener & Escape listener
  useEffect(() => {
    const handleGlobalClick = () => {
      setOpenDropdown(null);
      setContextMenu(null);
      setShowProfileMenu(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.key === 'Escape') {
        setOpenDropdown(null);
        setContextMenu(null);
        setShowProfileMenu(false);
        setNewFolderModalOpen(false);
        setNewDocModal((p) => ({ ...p, open: false }));
        setRenameTarget(null);
        setDeleteTargets([]);
        setEmptyTrashConfirm(false);
        setShareModal((p) => ({ ...p, open: false }));
        setAdminUsersModalOpen(false);
        setMoveCopyModal(null);
        closePreview();
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedPaths.size > 0 && activeTab !== 'trash') {
          const targets = files.filter((f) => selectedPaths.has(f.relPath));
          if (targets.length > 0) {
            setDeleteTargets(targets);
          }
        }
      }
    };

    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedPaths, files, activeTab]);

  // -------------------------------------------------------------------------
  // Marquee Selection Logic (Click and Drag to select multiple items)
  // -------------------------------------------------------------------------
  const handleMouseDownCanvas = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only trigger marquee on left click on the background canvas
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('.file-card-tile') || target.closest('.folder-chip') || target.closest('button') || target.closest('input')) {
      return;
    }

    // Deselect if not holding Ctrl/Cmd
    if (!e.ctrlKey && !e.metaKey) {
      setSelectedPaths(new Set());
    }

    setMarquee({
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
    });
  };

  useEffect(() => {
    if (!marquee) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMarquee((prev) => (prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null));

      // Calculate bounding rectangle
      const rectBox = {
        left: Math.min(marquee.startX, e.clientX),
        top: Math.min(marquee.startY, e.clientY),
        right: Math.max(marquee.startX, e.clientX),
        bottom: Math.max(marquee.startY, e.clientY),
      };

      // Find all intersecting items
      const elements = document.querySelectorAll<HTMLElement>('[data-relpath]');
      const nextSelected = new Set<string>();

      elements.forEach((el) => {
        const itemRect = el.getBoundingClientRect();
        const overlaps = !(
          itemRect.right < rectBox.left ||
          itemRect.left > rectBox.right ||
          itemRect.bottom < rectBox.top ||
          itemRect.top > rectBox.bottom
        );
        if (overlaps) {
          const path = el.getAttribute('data-relpath');
          if (path) nextSelected.add(path);
        }
      });

      if (nextSelected.size > 0) {
        setSelectedPaths(nextSelected);
      }
    };

    const handleMouseUp = () => {
      setMarquee(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [marquee]);

  // -------------------------------------------------------------------------
  // Login / Logout Handlers
  // -------------------------------------------------------------------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword) return;
    setLoginLoading(true);
    setLoginError('');

    const res = await ncLogin(loginUsername.trim(), loginPassword);
    if (res.ok) {
      setUser(res.user);
      setLoginPassword('');
      addToast('success', `Welcome back, ${res.user.displayName}!`);
    } else {
      setLoginError(res.error);
    }
    setLoginLoading(false);
  };

  const handleLogout = () => {
    ncLogout();
    setUser(null);
    setFiles([]);
    setCurrentPath('');
    setSelectedPaths(new Set());
    setSelectedItem(null);
  };

  // -------------------------------------------------------------------------
  // Folder Navigation & Breadcrumb Trail
  // -------------------------------------------------------------------------
  const navigateToFolder = (relPath: string) => {
    setCurrentPath(relPath);
    setActiveTab('mydrive');
  };

  // Breadcrumbs array
  const breadcrumbs = useMemo(() => {
    if (!currentPath) {
      return [{ name: 'My Drive', path: '' }];
    }
    const parts = currentPath.split('/').filter(Boolean);
    const crumbs = [{ name: 'My Drive', path: '' }];
    let acc = '';
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part;
      crumbs.push({ name: part, path: acc });
    }
    return crumbs;
  }, [currentPath]);

  // -------------------------------------------------------------------------
  // Sharing Handlers (Nextcloud OCS Share API)
  // -------------------------------------------------------------------------
  const handleOpenShareModal = async (item: FileItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedItem(item);
    setShareModal({
      open: true,
      item,
      shares: [],
      loading: true,
    });
    setSharePassword('');
    setShareExpireDate('');
    setShareWithUser('');
    setCopiedShareId(null);

    const [existingShares, sharees] = await Promise.all([
      listSharesForPath(item.relPath),
      searchSharees(''),
    ]);
    setShareModal((prev) => ({
      ...prev,
      shares: existingShares,
      loading: false,
    }));
    setShareesList(sharees);
  };

  const handleCreatePublicShareLink = async () => {
    if (!shareModal.item) return;
    setCreatingShare(true);

    const res = await createPublicShare(shareModal.item.relPath, {
      password: sharePassword.trim() || undefined,
      expireDate: shareExpireDate || undefined,
    });

    setCreatingShare(false);
    if (res.ok && res.share) {
      if (res.share.url) {
        const fullUrl = res.share.url.startsWith('http') ? res.share.url : `${window.location.origin}${res.share.url}`;
        navigator.clipboard.writeText(fullUrl).catch(() => {});
        setCopiedShareId(res.share.id);
        addToast('success', 'Public share link created and copied to clipboard!');
      } else {
        addToast('success', 'Public share link created!');
      }
      setShareModal((prev) => ({
        ...prev,
        shares: [...prev.shares, res.share!],
      }));
      setSharePassword('');
      setShareExpireDate('');
      refreshActivities();
    } else {
      addToast('error', res.error || 'Failed to create share link.');
    }
  };

  const handleCreateUserShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareModal.item || !shareWithUser.trim()) return;

    const res = await createUserShare(shareModal.item.relPath, shareWithUser.trim());
    if (res.ok && res.share) {
      addToast('success', `Shared with ${shareWithUser.trim()}`);
      setShareModal((prev) => ({
        ...prev,
        shares: [...prev.shares, res.share!],
      }));
      setShareWithUser('');
      refreshActivities();
    } else {
      addToast('error', res.error || 'Failed to share with user.');
    }
  };

  const handleDeleteShareItem = async (shareId: string) => {
    const res = await deleteShare(shareId);
    if (res.ok) {
      addToast('success', 'Share removed.');
      setShareModal((prev) => ({
        ...prev,
        shares: prev.shares.filter((s) => s.id !== shareId),
      }));
      refreshActivities();
    } else {
      addToast('error', res.error || 'Failed to remove share.');
    }
  };

  const handleCopyShareLink = (url: string, id: string) => {
    const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedShareId(id);
    addToast('success', 'Share link copied to clipboard!');
    setTimeout(() => setCopiedShareId(null), 3000);
  };

  // -------------------------------------------------------------------------
  // Filtered & Separated Folders vs Files
  // -------------------------------------------------------------------------
  const { displayFolders, displayFiles } = useMemo(() => {
    let result = activeTab === 'shared' ? [...sharedWithMeFiles] : [...files];

    // Nav tabs
    if (activeTab === 'starred') {
      result = result.filter((f) => starredIds.has(f.relPath));
    } else if (activeTab === 'recent') {
      result.sort((a, b) => b.modified.getTime() - a.modified.getTime());
    }

    // Type filter
    if (typeFilter === 'folders') {
      result = result.filter((f) => f.isDir);
    } else if (typeFilter === 'doc') {
      result = result.filter((f) => f.kind === 'doc');
    } else if (typeFilter === 'sheet') {
      result = result.filter((f) => f.kind === 'sheet');
    } else if (typeFilter === 'slides') {
      result = result.filter((f) => f.kind === 'slides');
    } else if (typeFilter === 'video') {
      result = result.filter((f) => f.kind === 'video');
    } else if (typeFilter === 'image') {
      result = result.filter((f) => f.kind === 'image');
    } else if (typeFilter === 'pdf') {
      result = result.filter((f) => f.kind === 'pdf');
    }

    // Date filter
    if (dateFilter !== 'anytime') {
      const now = new Date().getTime();
      const oneDay = 24 * 60 * 60 * 1000;
      if (dateFilter === 'today') {
        result = result.filter((f) => now - f.modified.getTime() <= oneDay);
      } else if (dateFilter === '7days') {
        result = result.filter((f) => now - f.modified.getTime() <= 7 * oneDay);
      } else if (dateFilter === '30days') {
        result = result.filter((f) => now - f.modified.getTime() <= 30 * oneDay);
      } else if (dateFilter === 'year') {
        result = result.filter((f) => f.modified.getFullYear() === new Date().getFullYear());
      }
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(q));
    }

    // Sort order
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        case 'name_desc':
          return b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: 'base' });
        case 'date_desc':
          return b.modified.getTime() - a.modified.getTime();
        case 'date_asc':
          return a.modified.getTime() - b.modified.getTime();
        case 'size_desc':
          return b.size - a.size;
        default:
          return 0;
      }
    });

    const folders = result.filter((f) => f.isDir);
    const regularFiles = result.filter((f) => !f.isDir);

    return { displayFolders: folders, displayFiles: regularFiles };
  }, [files, sharedWithMeFiles, activeTab, starredIds, typeFilter, dateFilter, searchQuery, sortBy]);

  // -------------------------------------------------------------------------
  // Create Folder & Documents
  // -------------------------------------------------------------------------
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;

    const folderPath = currentPath ? `${currentPath}/${name}` : name;
    const res = await createFolder(folderPath);
    if (res.ok) {
      addToast('success', `Created folder "${name}"`);
      setNewFolderName('');
      setNewFolderModalOpen(false);
      refreshFiles();
      refreshActivities();
    } else {
      addToast('error', res.error || 'Could not create folder.');
    }
  };

  const openInOnlyOffice = (item: FileItem) => {
    const editorUrl = item.fileId
      ? `/index.php/apps/onlyoffice/${item.fileId}`
      : `/apps/files/?dir=/${encodeURIComponent(item.relPath.includes('/') ? item.relPath.substring(0, item.relPath.lastIndexOf('/')) : '')}`;

    setOnlyOfficeModal({
      open: true,
      url: editorUrl,
      name: item.name,
      item,
    });
  };

  const handleOpenNewDocModal = (type: 'doc' | 'sheet' | 'slides' | 'text') => {
    const titles = {
      doc: 'New Word Document',
      sheet: 'New Excel Spreadsheet',
      slides: 'New PowerPoint Presentation',
      text: 'New Text Document',
    };
    const exts = { doc: '.docx', sheet: '.xlsx', slides: '.pptx', text: '.md' };
    const defaults = {
      doc: 'Untitled document',
      sheet: 'Untitled spreadsheet',
      slides: 'Untitled presentation',
      text: 'Untitled note',
    };

    setNewDocModal({
      open: true,
      type,
      title: titles[type],
      ext: exts[type],
    });
    setNewDocName(defaults[type]);
    setOpenDropdown(null);
  };

  const handleCreateDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim()) return;

    setCreatingDoc(true);
    const res = await createOfficeDocument(newDocName.trim(), newDocModal.type, currentPath);
    setCreatingDoc(false);

    if (res.ok && res.relPath) {
      const createdFileName = `${newDocName.trim()}${newDocModal.ext}`;
      addToast('success', `Created ${createdFileName}`);
      setNewDocModal((prev) => ({ ...prev, open: false }));

      const updatedList = await listFiles(currentPath);
      setFiles(updatedList);
      refreshActivities();

      const foundItem = updatedList.find((f) => f.name === createdFileName || f.relPath.endsWith(createdFileName));
      if (foundItem) {
        setSelectedItem(foundItem);
        openInOnlyOffice(foundItem);
      }
    } else {
      addToast('error', res.error || 'Failed to create document.');
    }
  };

  // -------------------------------------------------------------------------
  // Upload Files
  // -------------------------------------------------------------------------
  const handleUploadFileList = async (fileList: FileList | File[]) => {
    const arr = Array.from(fileList);
    if (arr.length === 0) return;

    setUploadState({
      uploading: true,
      fileName: arr[0].name,
      progress: 5,
      totalFiles: arr.length,
      completed: false,
    });

    const res = await uploadFiles(arr, currentPath, (pct, fn) => {
      setUploadState((prev) => ({
        uploading: true,
        fileName: fn,
        progress: pct,
        totalFiles: arr.length,
        completed: pct >= 100,
        error: prev?.error,
      }));
    });

    if (res.ok) {
      addToast('success', `Uploaded ${arr.length} ${arr.length === 1 ? 'file' : 'files'}`);
      setUploadState((prev) => (prev ? { ...prev, uploading: false, completed: true, progress: 100 } : null));
      setTimeout(() => setUploadState(null), 4000);
      refreshFiles();
      refreshStorage();
      refreshActivities();
    } else {
      addToast('error', `Failed to upload: ${res.failed.join(', ')}`);
      setUploadState((prev) => (prev ? { ...prev, uploading: false, error: 'Some files failed to upload' } : null));
    }
  };

  // Drag & drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFileList(e.dataTransfer.files);
    }
  };

  // -------------------------------------------------------------------------
  // Delete / Rename / Batch Handlers
  // -------------------------------------------------------------------------
  const handleDeleteConfirm = async () => {
    if (deleteTargets.length === 0) return;
    let successCount = 0;

    for (const item of deleteTargets) {
      const res = await deleteItem(item.relPath);
      if (res.ok) successCount++;
    }

    if (successCount > 0) {
      addToast('success', `Moved ${successCount} ${successCount === 1 ? 'item' : 'items'} to Trash`);
      refreshFiles();
      refreshStorage();
      refreshActivities();
      setSelectedPaths(new Set());
      if (deleteTargets.some((d) => d.relPath === selectedItem?.relPath)) {
        setSelectedItem(null);
      }
    } else {
      addToast('error', 'Failed to delete selected item(s).');
    }
    setDeleteTargets([]);
  };

  const handleBatchDelete = () => {
    const targets = files.filter((f) => selectedPaths.has(f.relPath));
    if (targets.length > 0) {
      setDeleteTargets(targets);
    }
  };

  const handleBatchDownload = async () => {
    const targets = displayFiles.filter((f) => selectedPaths.has(f.relPath));
    for (const target of targets) {
      downloadFile(target.relPath, target.name);
    }
  };

  const handleBatchStar = () => {
    setStarredIds((prev) => {
      const next = new Set(prev);
      const targets = files.filter((f) => selectedPaths.has(f.relPath));
      const allStarred = targets.every((t) => next.has(t.relPath));

      targets.forEach((t) => {
        if (allStarred) next.delete(t.relPath);
        else next.add(t.relPath);
      });

      localStorage.setItem('gd_starred', JSON.stringify(Array.from(next)));
      return next;
    });
    addToast('info', 'Updated Starred items');
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !renameValue.trim()) return;

    const res = await renameItem(renameTarget.relPath, renameValue.trim());
    if (res.ok) {
      addToast('success', `Renamed to "${renameValue.trim()}"`);
      setRenameTarget(null);
      setRenameValue('');
      refreshFiles();
      refreshActivities();
    } else {
      addToast('error', res.error || 'Failed to rename.');
    }
  };

  // -------------------------------------------------------------------------
  // Move / Copy Execution (Modal)
  // -------------------------------------------------------------------------
  const handleExecuteMoveCopy = async () => {
    if (!moveCopyModal || moveCopyModal.items.length === 0) return;

    const destDir = moveCopyModal.selectedDestPath;
    let count = 0;

    for (const item of moveCopyModal.items) {
      const targetRelPath = destDir ? `${destDir}/${item.name}` : item.name;
      const res = moveCopyModal.mode === 'move'
        ? await moveItem(item.relPath, targetRelPath)
        : await copyItem(item.relPath, targetRelPath);

      if (res.ok) count++;
    }

    if (count > 0) {
      addToast('success', `${moveCopyModal.mode === 'move' ? 'Moved' : 'Copied'} ${count} item(s)`);
      refreshFiles();
      refreshStorage();
      refreshActivities();
      setSelectedPaths(new Set());
    } else {
      addToast('error', `Failed to ${moveCopyModal.mode} items.`);
    }
    setMoveCopyModal(null);
  };

  // -------------------------------------------------------------------------
  // Admin User Creation (Phase 4.7)
  // -------------------------------------------------------------------------
  const handleCreateAdminUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminUserId.trim() || !newAdminUserPass) return;

    const res = await createNCUser({
      userid: newAdminUserId.trim(),
      password: newAdminUserPass,
      displayName: newAdminUserDisplay.trim() || newAdminUserId.trim(),
    });

    if (res.ok) {
      addToast('success', `Created user "${newAdminUserId.trim()}"`);
      setNewAdminUserId('');
      setNewAdminUserPass('');
      setNewAdminUserDisplay('');
      refreshAdminUsers();
    } else {
      addToast('error', res.error || 'Failed to create user.');
    }
  };

  const handleDeleteAdminUser = async (uid: string) => {
    const res = await deleteNCUser(uid);
    if (res.ok) {
      addToast('success', `Deleted user "${uid}"`);
      refreshAdminUsers();
    } else {
      addToast('error', res.error || 'Failed to delete user.');
    }
  };

  // -------------------------------------------------------------------------
  // File Click / Selection / Preview
  // -------------------------------------------------------------------------
  const handleItemSelect = (item: FileItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItem(item);

    if (e.ctrlKey || e.metaKey) {
      setSelectedPaths((prev) => {
        const next = new Set(prev);
        if (next.has(item.relPath)) next.delete(item.relPath);
        else next.add(item.relPath);
        return next;
      });
    } else {
      setSelectedPaths(new Set([item.relPath]));
    }
  };

  const handleFileClick = async (item: FileItem) => {
    setSelectedItem(item);

    if (item.isDir) {
      navigateToFolder(item.relPath);
      return;
    }

    if (['doc', 'sheet', 'slides'].includes(item.kind) || item.name.endsWith('.docx') || item.name.endsWith('.xlsx') || item.name.endsWith('.pptx') || item.name.endsWith('.csv')) {
      openInOnlyOffice(item);
      return;
    }

    setPreviewTarget(item);
    setPreviewLoading(true);
    const url = await fetchBlob(item.relPath);
    setPreviewBlobUrl(url);
    setPreviewLoading(false);
  };

  const closePreview = () => {
    if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    setPreviewTarget(null);
    setPreviewBlobUrl(null);
  };

  // Helper: Card banner class
  const getBannerGradient = (kind: FileKind): string => {
    switch (kind) {
      case 'doc': return 'gradient-blue';
      case 'sheet': return 'gradient-green';
      case 'slides': return 'gradient-amber';
      case 'pdf': return 'gradient-red';
      case 'video': return 'gradient-red';
      case 'image': return 'gradient-purple';
      case 'code': return 'gradient-purple';
      default: return 'gradient-slate';
    }
  };

  // Helper: File Icon
  const renderTileIcon = (kind: FileKind) => {
    switch (kind) {
      case 'image': return <ImageIcon size={28} className="file-tile-icon" />;
      case 'video': return <Film size={28} className="file-tile-icon" />;
      case 'sheet': return <FileSpreadsheet size={28} className="file-tile-icon" />;
      case 'slides': return <FileText size={28} className="file-tile-icon" />;
      case 'pdf': return <FileGeneric size={28} className="file-tile-icon" />;
      case 'doc': return <FileText size={28} className="file-tile-icon" />;
      default: return <FileGeneric size={28} className="file-tile-icon" />;
    }
  };

  // Component: Rich Thumbnail Banner
  function FileTileBanner({ file }: { file: FileItem | TrashItem }) {
    const [imgUrl, setImgUrl] = useState<string | null>(() => {
      return 'relPath' in file && imageThumbnailCache.has(file.relPath) ? imageThumbnailCache.get(file.relPath)! : null;
    });
    const [videoThumbUrl, setVideoThumbUrl] = useState<string | null>(() => {
      return 'relPath' in file && videoThumbnailCache.has(file.relPath) ? videoThumbnailCache.get(file.relPath)! : null;
    });

    useEffect(() => {
      let active = true;
      if (file.kind === 'image' && 'relPath' in file && !imageThumbnailCache.has(file.relPath)) {
        fetchBlob(file.relPath).then((url) => {
          if (active && url) {
            imageThumbnailCache.set(file.relPath, url);
            setImgUrl(url);
          }
        });
      } else if (file.kind === 'video' && 'relPath' in file && !videoThumbnailCache.has(file.relPath)) {
        fetchBlob(file.relPath).then(async (blobUrl) => {
          if (!blobUrl || !active) return;
          try {
            const snap = await generateVideoThumbnail(blobUrl);
            videoThumbnailCache.set(file.relPath, snap);
            if (active) setVideoThumbUrl(snap);
          } catch {
            // Fallback
          }
        });
      }
      return () => {
        active = false;
      };
    }, [file]);

    if (file.kind === 'image' && imgUrl) {
      return (
        <div className="file-tile-banner">
          <img src={imgUrl} alt={file.name} className="file-tile-img-cover" />
        </div>
      );
    }

    if (file.kind === 'video') {
      if (videoThumbUrl) {
        return (
          <div className="file-tile-banner" style={{ background: '#0f172a' }}>
            <img src={videoThumbUrl} alt={file.name} className="file-tile-img-cover" />
            <div className="video-play-badge">
              <Play size={16} fill="#ffffff" color="#ffffff" style={{ marginLeft: 2 }} />
            </div>
          </div>
        );
      }
      return (
        <div className="file-tile-banner gradient-red">
          <Film size={34} className="file-tile-icon" />
          <div className="video-play-badge">
            <Play size={14} fill="#ffffff" color="#ffffff" style={{ marginLeft: 2 }} />
          </div>
        </div>
      );
    }

    if (file.kind === 'doc') {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'doc';
      const isMd = ext === 'md' || ext === 'markdown';
      const isTxt = ext === 'txt';
      const isWord = ext === 'docx' || ext === 'doc' || ext === 'odt';
      const bannerBg = isMd ? 'gradient-purple' : isTxt ? 'gradient-slate' : 'gradient-blue';
      const headerBg = isMd ? '#7c3aed' : isTxt ? '#475569' : '#2563eb';
      const badgeText = isMd ? 'MD' : isTxt ? 'TXT' : isWord ? 'DOCX' : ext.toUpperCase();

      return (
        <div className={`file-tile-banner ${bannerBg}`}>
          <div className="doc-mockup-preview">
            <div className="doc-mockup-header" style={{ background: headerBg }} />
            <div className="doc-mockup-line" />
            <div className="doc-mockup-line" />
            <div className="doc-mockup-line medium" />
            <div className="doc-mockup-line short" />
            <span className="doc-mockup-badge" style={{ background: headerBg }}>{badgeText}</span>
          </div>
        </div>
      );
    }

    if (file.kind === 'sheet') {
      return (
        <div className="file-tile-banner gradient-green">
          <div className="doc-mockup-preview">
            <div className="doc-mockup-header" style={{ background: '#16a34a' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, marginTop: 2 }}>
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} style={{ height: 10, background: '#f1f5f9', borderRadius: 1 }} />
              ))}
            </div>
            <span className="doc-mockup-badge" style={{ background: '#16a34a' }}>XLSX</span>
          </div>
        </div>
      );
    }

    if (file.kind === 'slides') {
      return (
        <div className="file-tile-banner gradient-amber">
          <div className="doc-mockup-preview">
            <div style={{ width: '100%', height: '52%', background: '#fef3c7', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={18} className="text-amber-600" />
            </div>
            <div className="doc-mockup-line medium" style={{ marginTop: 2 }} />
            <div className="doc-mockup-line short" />
            <span className="doc-mockup-badge" style={{ background: '#d97706' }}>PPTX</span>
          </div>
        </div>
      );
    }

    if (file.kind === 'pdf') {
      return (
        <div className="file-tile-banner gradient-red">
          <div className="doc-mockup-preview">
            <div className="doc-mockup-header" style={{ background: '#dc2626' }} />
            <div className="doc-mockup-line" />
            <div className="doc-mockup-line medium" />
            <div className="doc-mockup-line short" />
            <span className="doc-mockup-badge" style={{ background: '#dc2626' }}>PDF</span>
          </div>
        </div>
      );
    }

    const bannerGradient = getBannerGradient(file.kind);
    return (
      <div className={`file-tile-banner ${bannerGradient}`}>
        {renderTileIcon(file.kind)}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // VIEW: LOGIN SCREEN
  // -------------------------------------------------------------------------
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--main-bg)', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 400, background: 'var(--surface)', borderRadius: 16, padding: '36px 32px', boxShadow: '0 10px 30px rgba(0,0,0,.08)', border: '1px solid var(--border)' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <img src="/Govind Drive Logo Small 2.png" alt="Govind Drive" style={{ height: 44, width: 'auto', objectFit: 'contain', marginBottom: 14 }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-main)' }}>Sign in to Govind Drive</h2>
            <p style={{ fontSize: 13, color: 'var(--text-sub)', marginTop: 4 }}>Enterprise Home Cloud • 4TB NVMe High Speed</p>
          </div>

          {loginError && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#ef4444', fontSize: 12.5, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={16} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 6 }}>Username / Email</label>
              <input
                type="text"
                required
                autoFocus
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="e.g. govindvaghasia@gmail.com"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 6 }}>Password</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••••••"
              />
            </div>
            <button type="submit" disabled={loginLoading} className="btn btn-primary" style={{ justifyContent: 'center', marginTop: 8, padding: '10px 0', borderRadius: 8 }}>
              {loginLoading ? <RefreshCw size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              <span>{loginLoading ? 'Signing In...' : 'Sign In'}</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // VIEW: MAIN APPLICATION
  // -------------------------------------------------------------------------
  const isStarredTab = activeTab === 'starred';
  const hasItems = displayFolders.length > 0 || displayFiles.length > 0;

  return (
    <div className="app-container">
      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === 'success' && <Check size={16} />}
            {t.type === 'error' && <AlertCircle size={16} />}
            {t.type === 'info' && <Sparkles size={16} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Marquee Selection Visual Box */}
      {marquee && (
        <div
          className="marquee-selection-box"
          style={{
            left: Math.min(marquee.startX, marquee.currentX),
            top: Math.min(marquee.startY, marquee.currentY),
            width: Math.abs(marquee.currentX - marquee.startX),
            height: Math.abs(marquee.currentY - marquee.startY),
          }}
        />
      )}

      {/* Hidden File Inputs */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files) handleUploadFileList(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        type="file"
        multiple
        // @ts-expect-error webkitdirectory standard
        webkitdirectory="true"
        ref={folderInputRef}
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files) handleUploadFileList(e.target.files);
          e.target.value = '';
        }}
      />

      {/* ── LEFT SIDEBAR ── */}
      <aside className="sidebar">
        {/* Sidebar Brand / Logo */}
        <div
          className="sidebar-logo"
          onClick={() => {
            setActiveTab('mydrive');
            navigateToFolder('');
          }}
          style={{ cursor: 'pointer' }}
        >
          <img
            src="/Govind Drive Logo Small 2.png"
            alt="Govind Drive"
            style={{ height: 50, width: 'auto', objectFit: 'contain', maxWidth: '100%' }}
          />
        </div>

        {/* "+ New" Pill Button */}
        <div className="sidebar-new-container">
          <button
            className="sidebar-new-btn"
            onClick={(e) => {
              e.stopPropagation();
              setOpenDropdown(openDropdown === 'new' ? null : 'new');
            }}
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>New</span>
          </button>

          {/* New Menu Dropdown */}
          {openDropdown === 'new' && (
            <div className="dropdown-menu left" style={{ width: 220, top: 46 }} onClick={(e) => e.stopPropagation()}>
              <button
                className="dropdown-item"
                onClick={() => {
                  setOpenDropdown(null);
                  setNewFolderModalOpen(true);
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FolderPlus size={16} className="text-amber-500" />
                  <span>New folder</span>
                </div>
              </button>
              <div className="ctx-sep" />
              <button
                className="dropdown-item"
                onClick={() => {
                  setOpenDropdown(null);
                  fileInputRef.current?.click();
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Upload size={16} style={{ color: 'var(--primary-blue)' }} />
                  <span>File upload</span>
                </div>
              </button>
              <button
                className="dropdown-item"
                onClick={() => {
                  setOpenDropdown(null);
                  folderInputRef.current?.click();
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Folder size={16} style={{ color: 'var(--primary-blue)' }} />
                  <span>Folder upload</span>
                </div>
              </button>
              <div className="ctx-sep" />
              <button className="dropdown-item" onClick={() => handleOpenNewDocModal('doc')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FileText size={16} style={{ color: '#2563eb' }} />
                  <span>Word Document</span>
                </div>
              </button>
              <button className="dropdown-item" onClick={() => handleOpenNewDocModal('sheet')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FileSpreadsheet size={16} style={{ color: '#16a34a' }} />
                  <span>Excel Spreadsheet</span>
                </div>
              </button>
              <button className="dropdown-item" onClick={() => handleOpenNewDocModal('slides')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FileText size={16} style={{ color: '#d97706' }} />
                  <span>PowerPoint Slides</span>
                </div>
              </button>
              <button className="dropdown-item" onClick={() => handleOpenNewDocModal('text')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FileCode size={16} style={{ color: '#64748b' }} />
                  <span>Text Document</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Nav */}
        <nav className="sidebar-nav">
          <button
            className={`sidebar-nav-item ${activeTab === 'mydrive' && !currentPath ? 'active' : ''} ${dragOverTarget === 'root' ? 'drag-target' : ''}`}
            onClick={() => {
              setActiveTab('mydrive');
              setCurrentPath('');
            }}
            onDragOver={(e) => {
              if (draggedItem && currentPath !== '') {
                e.preventDefault();
                e.stopPropagation();
                setDragOverTarget('root');
              }
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (dragOverTarget === 'root') setDragOverTarget(null);
            }}
            onDrop={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragOverTarget(null);
              if (!draggedItem || currentPath === '') return;
              const targets = selectedPaths.has(draggedItem.relPath)
                ? files.filter((f) => selectedPaths.has(f.relPath))
                : [draggedItem];

              for (const target of targets) {
                await moveItem(target.relPath, target.name);
              }
              addToast('success', `Moved ${targets.length} item(s) to My Drive root`);
              refreshFiles();
              refreshStorage();
              refreshActivities();
              setDraggedItem(null);
            }}
          >
            <Folder size={17} />
            <span>My Drive</span>
          </button>
          <button
            className={`sidebar-nav-item ${activeTab === 'recent' ? 'active' : ''}`}
            onClick={() => setActiveTab('recent')}
          >
            <Clock size={17} />
            <span>Recent</span>
          </button>
          <button
            className={`sidebar-nav-item ${activeTab === 'starred' ? 'active' : ''}`}
            onClick={() => setActiveTab('starred')}
          >
            <Star size={17} />
            <span>Starred</span>
          </button>
          <button
            className={`sidebar-nav-item ${activeTab === 'shared' ? 'active' : ''}`}
            onClick={() => setActiveTab('shared')}
          >
            <Users size={17} />
            <span>Shared with me</span>
          </button>
          <button
            className={`sidebar-nav-item ${activeTab === 'trash' ? 'active' : ''}`}
            onClick={() => setActiveTab('trash')}
          >
            <Trash2 size={17} />
            <span>Trash</span>
          </button>
        </nav>

        {/* Sidebar Bottom (User & Storage) */}
        <div className="sidebar-bottom">
          <div className="sidebar-user-card" onClick={(e) => { e.stopPropagation(); setShowProfileMenu(!showProfileMenu); }} style={{ cursor: 'pointer' }}>
            <UserAvatar username={user.username} displayName={user.displayName} size={34} />
            <div className="sidebar-user-details">
              <div className="sidebar-user-name">{user.displayName}</div>
              <div className="sidebar-user-email">{user.email || user.username}</div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
              title="Sign Out"
              style={{ color: 'var(--text-sub)' }}
            >
              <LogOut size={15} />
            </button>
          </div>

          <div className="sidebar-storage-box">
            <div className="sidebar-storage-label">
              <HardDrive size={12} />
              <span>NVMe Storage</span>
            </div>
            <div className="sidebar-storage-bar">
              <div
                className="sidebar-storage-fill"
                style={{
                  width: storageInfo.total > 0
                    ? `${Math.min(100, (storageInfo.used / storageInfo.total) * 100)}%`
                    : '12%',
                }}
              />
            </div>
            <div className="sidebar-storage-text">
              {formatBytes(storageInfo.used)}
              {storageInfo.total > 0 && ` of ${formatBytes(storageInfo.total)}`} used
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN WRAPPER ── */}
      <div className="main-wrapper">
        {/* Topbar Header */}
        <header className="topbar">
          {/* Search Pill */}
          <div className="search-pill">
            <Search size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in Drive..."
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-sub)' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Action Filters & Right Controls */}
          <div className="header-actions">
            {/* Type Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                className="dropdown-filter-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenDropdown(openDropdown === 'type' ? null : 'type');
                }}
              >
                <span>Type</span>
                <ChevronDown size={14} />
              </button>
              {openDropdown === 'type' && (
                <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                  <button className={`dropdown-item ${typeFilter === 'all' ? 'active' : ''}`} onClick={() => { setTypeFilter('all'); setOpenDropdown(null); }}>
                    <span>All file types</span>
                    {typeFilter === 'all' && <Check size={14} />}
                  </button>
                  <button className={`dropdown-item ${typeFilter === 'folders' ? 'active' : ''}`} onClick={() => { setTypeFilter('folders'); setOpenDropdown(null); }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Folder size={14} className="text-amber-500" /><span>Folders</span></div>
                    {typeFilter === 'folders' && <Check size={14} />}
                  </button>
                  <button className={`dropdown-item ${typeFilter === 'doc' ? 'active' : ''}`} onClick={() => { setTypeFilter('doc'); setOpenDropdown(null); }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={14} className="text-blue-600" /><span>Documents</span></div>
                    {typeFilter === 'doc' && <Check size={14} />}
                  </button>
                  <button className={`dropdown-item ${typeFilter === 'sheet' ? 'active' : ''}`} onClick={() => { setTypeFilter('sheet'); setOpenDropdown(null); }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FileSpreadsheet size={14} className="text-emerald-600" /><span>Spreadsheets</span></div>
                    {typeFilter === 'sheet' && <Check size={14} />}
                  </button>
                  <button className={`dropdown-item ${typeFilter === 'slides' ? 'active' : ''}`} onClick={() => { setTypeFilter('slides'); setOpenDropdown(null); }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={14} className="text-amber-600" /><span>Presentations</span></div>
                    {typeFilter === 'slides' && <Check size={14} />}
                  </button>
                  <button className={`dropdown-item ${typeFilter === 'video' ? 'active' : ''}`} onClick={() => { setTypeFilter('video'); setOpenDropdown(null); }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Film size={14} className="text-rose-600" /><span>Videos</span></div>
                    {typeFilter === 'video' && <Check size={14} />}
                  </button>
                  <button className={`dropdown-item ${typeFilter === 'image' ? 'active' : ''}`} onClick={() => { setTypeFilter('image'); setOpenDropdown(null); }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ImageIcon size={14} className="text-purple-600" /><span>Photos & Images</span></div>
                    {typeFilter === 'image' && <Check size={14} />}
                  </button>
                  <button className={`dropdown-item ${typeFilter === 'pdf' ? 'active' : ''}`} onClick={() => { setTypeFilter('pdf'); setOpenDropdown(null); }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FileGeneric size={14} className="text-red-500" /><span>PDFs</span></div>
                    {typeFilter === 'pdf' && <Check size={14} />}
                  </button>
                </div>
              )}
            </div>

            {/* Modified Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                className="dropdown-filter-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenDropdown(openDropdown === 'date' ? null : 'date');
                }}
              >
                <span>Modified</span>
                <ChevronDown size={14} />
              </button>
              {openDropdown === 'date' && (
                <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                  <button className={`dropdown-item ${dateFilter === 'anytime' ? 'active' : ''}`} onClick={() => { setDateFilter('anytime'); setOpenDropdown(null); }}>
                    <span>Anytime</span>
                    {dateFilter === 'anytime' && <Check size={14} />}
                  </button>
                  <button className={`dropdown-item ${dateFilter === 'today' ? 'active' : ''}`} onClick={() => { setDateFilter('today'); setOpenDropdown(null); }}>
                    <span>Today</span>
                    {dateFilter === 'today' && <Check size={14} />}
                  </button>
                  <button className={`dropdown-item ${dateFilter === '7days' ? 'active' : ''}`} onClick={() => { setDateFilter('7days'); setOpenDropdown(null); }}>
                    <span>Last 7 days</span>
                    {dateFilter === '7days' && <Check size={14} />}
                  </button>
                  <button className={`dropdown-item ${dateFilter === '30days' ? 'active' : ''}`} onClick={() => { setDateFilter('30days'); setOpenDropdown(null); }}>
                    <span>Last 30 days</span>
                    {dateFilter === '30days' && <Check size={14} />}
                  </button>
                  <button className={`dropdown-item ${dateFilter === 'year' ? 'active' : ''}`} onClick={() => { setDateFilter('year'); setOpenDropdown(null); }}>
                    <span>This year ({new Date().getFullYear()})</span>
                    {dateFilter === 'year' && <Check size={14} />}
                  </button>
                </div>
              )}
            </div>

            {/* Grid / List View Toggle */}
            <button
              className={`topbar-icon ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              title="Toggle Grid / List View"
            >
              {viewMode === 'grid' ? <Grid size={16} /> : <ListIcon size={16} />}
            </button>

            {/* Sort Date Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                className="dropdown-filter-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenDropdown(openDropdown === 'sort' ? null : 'sort');
                }}
              >
                <span>Sort</span>
                <ChevronDown size={14} />
              </button>
              {openDropdown === 'sort' && (
                <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                  <button className={`dropdown-item ${sortBy === 'name_asc' ? 'active' : ''}`} onClick={() => { setSortBy('name_asc'); setOpenDropdown(null); }}>
                    <span>Name (A-Z)</span>
                    {sortBy === 'name_asc' && <Check size={14} />}
                  </button>
                  <button className={`dropdown-item ${sortBy === 'name_desc' ? 'active' : ''}`} onClick={() => { setSortBy('name_desc'); setOpenDropdown(null); }}>
                    <span>Name (Z-A)</span>
                    {sortBy === 'name_desc' && <Check size={14} />}
                  </button>
                  <button className={`dropdown-item ${sortBy === 'date_desc' ? 'active' : ''}`} onClick={() => { setSortBy('date_desc'); setOpenDropdown(null); }}>
                    <span>Modified (Newest)</span>
                    {sortBy === 'date_desc' && <Check size={14} />}
                  </button>
                  <button className={`dropdown-item ${sortBy === 'date_asc' ? 'active' : ''}`} onClick={() => { setSortBy('date_asc'); setOpenDropdown(null); }}>
                    <span>Modified (Oldest)</span>
                    {sortBy === 'date_asc' && <Check size={14} />}
                  </button>
                  <button className={`dropdown-item ${sortBy === 'size_desc' ? 'active' : ''}`} onClick={() => { setSortBy('size_desc'); setOpenDropdown(null); }}>
                    <span>Size (Largest)</span>
                    {sortBy === 'size_desc' && <Check size={14} />}
                  </button>
                </div>
              )}
            </div>

            {/* Activity Toggle */}
            <button
              className={`topbar-icon ${showActivity ? 'active' : ''}`}
              onClick={() => setShowActivity(!showActivity)}
              title="Toggle Details & Activity Sidebar"
            >
              <Info size={16} />
            </button>

            {/* Top Right Profile Avatar with Interactive Dropdown */}
            <div style={{ position: 'relative' }}>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProfileMenu(!showProfileMenu);
                }}
                style={{ cursor: 'pointer' }}
                title={user.displayName}
              >
                <UserAvatar username={user.username} displayName={user.displayName} size={34} />
              </div>

              {/* Profile Popover Menu */}
              {showProfileMenu && (
                <div className="profile-popover" onClick={(e) => e.stopPropagation()}>
                  <div className="profile-popover-header">
                    <UserAvatar username={user.username} displayName={user.displayName} size={44} />
                    <div className="profile-popover-info">
                      <div className="profile-popover-name">{user.displayName}</div>
                      <div className="profile-popover-email">{user.email || user.username}</div>
                      {user.isAdmin && <div className="profile-popover-badge"><Shield size={10} /> Admin</div>}
                    </div>
                  </div>

                  {/* Storage Meter */}
                  <div className="profile-popover-storage">
                    <div className="profile-storage-labels">
                      <span>NVMe High-Speed Quota</span>
                      <span>{formatBytes(storageInfo.used)}</span>
                    </div>
                    <div className="sidebar-storage-bar">
                      <div
                        className="sidebar-storage-fill"
                        style={{
                          width: storageInfo.total > 0
                            ? `${Math.min(100, (storageInfo.used / storageInfo.total) * 100)}%`
                            : '12%',
                        }}
                      />
                    </div>
                  </div>

                  {/* Server Connection Status */}
                  <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-sub)' }}>
                      <Globe size={13} className="text-emerald-600" />
                      <span>Nextcloud Server</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-main)' }}>Online</span>
                  </div>

                  {/* Theme Switcher & Actions */}
                  <div className="profile-popover-menu">
                    {user.isAdmin && (
                      <button
                        className="profile-menu-item"
                        onClick={() => {
                          setShowProfileMenu(false);
                          setAdminUsersModalOpen(true);
                          refreshAdminUsers();
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Users size={15} className="text-indigo-600" />
                          <span>Admin User Management</span>
                        </div>
                      </button>
                    )}

                    <button
                      className="profile-menu-item"
                      onClick={() => setIsDarkMode(!isDarkMode)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {isDarkMode ? <Sun size={15} className="text-amber-500" /> : <Moon size={15} className="text-indigo-500" />}
                        <span>Dark Theme</span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-sub)' }}>{isDarkMode ? 'On' : 'Off'}</span>
                    </button>

                    <button
                      className="profile-menu-item"
                      onClick={() => {
                        setShowProfileMenu(false);
                        window.open(NC_HOST, '_blank');
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ExternalLink size={15} />
                        <span>Open Nextcloud Web</span>
                      </div>
                    </button>

                    <div className="ctx-sep" />

                    <button
                      className="profile-menu-item danger"
                      onClick={() => {
                        setShowProfileMenu(false);
                        handleLogout();
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <LogOut size={15} />
                        <span>Sign Out</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Layout (Main Area + Right Activity) */}
        <div className="content-layout">
          {/* Main Scrollable Area */}
          <div
            ref={scrollAreaRef}
            className={`content-scroll-area ${isDragOver ? 'drag-over' : ''}`}
            onMouseDown={handleMouseDownCanvas}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Interactive Breadcrumbs Bar */}
            <div className="breadcrumbs-bar">
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={crumb.path}>
                    <div
                      className={`breadcrumb-crumb ${isLast ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToFolder(crumb.path);
                      }}
                      onDragOver={(e) => {
                        if (draggedItem && draggedItem.relPath !== crumb.path) {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragOverTarget(crumb.path || 'root');
                        }
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (dragOverTarget === (crumb.path || 'root')) setDragOverTarget(null);
                      }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverTarget(null);
                        if (!draggedItem || draggedItem.relPath === crumb.path) return;

                        const targets = selectedPaths.has(draggedItem.relPath)
                          ? files.filter((f) => selectedPaths.has(f.relPath))
                          : [draggedItem];

                        for (const target of targets) {
                          const targetRelPath = crumb.path ? `${crumb.path}/${target.name}` : target.name;
                          await moveItem(target.relPath, targetRelPath);
                        }

                        addToast('success', `Moved ${targets.length} item(s) to ${crumb.name}`);
                        refreshFiles();
                        refreshStorage();
                        refreshActivities();
                        setDraggedItem(null);
                      }}
                    >
                      {idx === 0 && <Home size={14} />}
                      <span>{crumb.name}</span>
                    </div>
                    {!isLast && (
                      <span className="breadcrumb-sep">
                        <ChevronRight size={14} />
                      </span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Title Bar with Empty Trash button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h1 className="page-title" style={{ margin: 0 }}>
                {activeTab === 'trash'
                  ? 'Trash'
                  : isStarredTab
                  ? 'Starred'
                  : activeTab === 'recent'
                  ? 'Recent'
                  : activeTab === 'shared'
                  ? 'Shared with me'
                  : currentPath
                  ? currentPath.split('/').pop()
                  : 'My Drive'}
              </h1>
              {activeTab === 'trash' && trashItems.length > 0 && (
                <button
                  className="btn btn-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEmptyTrashConfirm(true);
                  }}
                  style={{ borderRadius: 'var(--r-full)' }}
                >
                  <Trash2 size={15} />
                  <span>Empty Trash</span>
                </button>
              )}
            </div>

            {/* ── TRASH VIEW ── */}
            {activeTab === 'trash' ? (
              trashItems.length === 0 && !loadingTrash ? (
                <div className="empty-folder-box">
                  <div className="empty-folder-icon-wrap">
                    <Trash2 size={36} strokeWidth={1.75} />
                  </div>
                  <h3 className="empty-folder-title">Trash is empty</h3>
                  <p className="empty-folder-subtitle">
                    Items moved to trash will appear here and can be restored or permanently deleted.
                  </p>
                </div>
              ) : (
                <section>
                  <div className="section-label">Deleted Items ({trashItems.length})</div>
                  <div className="files-grid">
                    {trashItems.map((item) => {
                      return (
                        <div key={item.id} className="file-card-tile">
                          <FileTileBanner file={item} />
                          <div className="file-tile-info">
                            <div className="file-tile-title" title={item.name}>
                              {item.name}
                            </div>
                            <div className="file-tile-meta" style={{ marginBottom: 8 }}>
                              <span>{item.deletedAtStr}</span>
                              <span>{item.sizeStr}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 6, borderTop: '1px solid var(--border-light)', paddingTop: 8 }}>
                              <button
                                className="btn btn-ghost"
                                style={{ flex: 1, padding: '4px 6px', fontSize: 11.5, justifyContent: 'center' }}
                                onClick={() => handleRestore(item.id, item.name)}
                                title="Restore to Drive"
                              >
                                <RotateCcw size={13} style={{ color: 'var(--primary-blue)' }} />
                                <span>Restore</span>
                              </button>
                              <button
                                className="btn btn-ghost text-red-500"
                                style={{ padding: '4px 6px', fontSize: 11.5 }}
                                onClick={() => handleDeletePermanently(item.id, item.name)}
                                title="Delete Forever"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )
            ) : !hasItems && !loadingFiles && !loadingSharedWithMe ? (
              <div className="empty-folder-box">
                <div className="empty-folder-icon-wrap">
                  <Folder size={36} strokeWidth={1.75} />
                </div>
                <h3 className="empty-folder-title">
                  {activeTab === 'shared' ? 'No shared files' : 'Empty folder'}
                </h3>
                <p className="empty-folder-subtitle">
                  {activeTab === 'shared'
                    ? 'Files and folders shared with you by others will appear here.'
                    : 'Drop files here or click + New above to upload items to this folder.'}
                </p>
              </div>
            ) : viewMode === 'list' ? (
              /* ── TABLE / LIST VIEW ── */
              <div className="files-table-container">
                <table className="files-table">
                  <thead>
                    <tr>
                      <th style={{ width: '45%' }}>Name</th>
                      <th style={{ width: '20%' }}>Owner</th>
                      <th style={{ width: '20%' }}>Last Modified</th>
                      <th style={{ width: '15%', textAlign: 'right' }}>File Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Folders Rows */}
                    {displayFolders.map((folder) => {
                      const isSelected = selectedPaths.has(folder.relPath);
                      return (
                        <tr
                          key={folder.relPath}
                          data-relpath={folder.relPath}
                          className={`files-table-row ${isSelected ? 'selected' : ''}`}
                          onClick={(e) => handleItemSelect(folder, e)}
                          onDoubleClick={() => navigateToFolder(folder.relPath)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({ x: e.clientX, y: e.clientY, item: folder });
                            setSelectedItem(folder);
                          }}
                        >
                          <td>
                            <div className="table-file-name-cell">
                              <Folder size={18} className="text-amber-500 fill-amber-500/20" />
                              <span title={folder.name}>{folder.name}</span>
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-sub)' }}>me</td>
                          <td style={{ color: 'var(--text-sub)' }}>{folder.modifiedStr}</td>
                          <td style={{ textAlign: 'right', color: 'var(--text-sub)' }}>—</td>
                        </tr>
                      );
                    })}

                    {/* Files Rows */}
                    {displayFiles.map((file) => {
                      const isSelected = selectedPaths.has(file.relPath);
                      return (
                        <tr
                          key={file.id || file.relPath}
                          data-relpath={file.relPath}
                          className={`files-table-row ${isSelected ? 'selected' : ''}`}
                          onClick={(e) => handleItemSelect(file, e)}
                          onDoubleClick={() => handleFileClick(file)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({ x: e.clientX, y: e.clientY, item: file });
                            setSelectedItem(file);
                          }}
                        >
                          <td>
                            <div className="table-file-name-cell">
                              {file.kind === 'doc' ? <FileText size={17} className="text-blue-600" /> :
                               file.kind === 'sheet' ? <FileSpreadsheet size={17} className="text-emerald-600" /> :
                               file.kind === 'slides' ? <FileText size={17} className="text-amber-600" /> :
                               file.kind === 'pdf' ? <FileGeneric size={17} className="text-red-500" /> :
                               file.kind === 'image' ? <ImageIcon size={17} className="text-purple-600" /> :
                               file.kind === 'video' ? <Film size={17} className="text-rose-600" /> :
                               <FileGeneric size={17} className="text-slate-500" />}
                              <span title={file.name}>{file.name}</span>
                              {starredIds.has(file.relPath) && (
                                <Star size={13} className="text-amber-400 fill-amber-400" />
                              )}
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-sub)' }}>me</td>
                          <td style={{ color: 'var(--text-sub)' }}>{file.modifiedStr}</td>
                          <td style={{ textAlign: 'right', color: 'var(--text-sub)' }}>{file.sizeStr}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* ── GRID VIEW ── */
              <>
                {/* Folders Section */}
                {displayFolders.length > 0 && (
                  <section style={{ marginBottom: 28 }}>
                    <div className="section-label">Folders</div>
                    <div className="folders-grid">
                      {displayFolders.map((folder) => {
                        const isSelected = selectedPaths.has(folder.relPath);
                        const isDragTarget = dragOverTarget === folder.relPath;
                        const isCurrentlyDragged = draggedItem?.relPath === folder.relPath;

                        return (
                          <div
                            key={folder.relPath}
                            data-relpath={folder.relPath}
                            draggable={true}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', folder.relPath);
                              setDraggedItem(folder);
                            }}
                            onDragEnd={() => {
                              setDraggedItem(null);
                              setDragOverTarget(null);
                            }}
                            className={`folder-chip ${isSelected ? 'selected' : ''} ${isDragTarget ? 'drag-target' : ''} ${isCurrentlyDragged ? 'dragging' : ''}`}
                            onClick={(e) => {
                              handleItemSelect(folder, e);
                            }}
                            onDoubleClick={() => navigateToFolder(folder.relPath)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setContextMenu({ x: e.clientX, y: e.clientY, item: folder });
                              setSelectedItem(folder);
                            }}
                            onDragOver={(e) => {
                              if (draggedItem && draggedItem.relPath !== folder.relPath && !folder.relPath.startsWith(draggedItem.relPath + '/')) {
                                e.preventDefault();
                                e.stopPropagation();
                                setDragOverTarget(folder.relPath);
                              }
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (dragOverTarget === folder.relPath) setDragOverTarget(null);
                            }}
                            onDrop={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDragOverTarget(null);
                              if (!draggedItem || draggedItem.relPath === folder.relPath) return;

                              const targets = selectedPaths.has(draggedItem.relPath)
                                ? files.filter((f) => selectedPaths.has(f.relPath))
                                : [draggedItem];

                              for (const target of targets) {
                                const targetRelPath = `${folder.relPath}/${target.name}`;
                                await moveItem(target.relPath, targetRelPath);
                              }

                              addToast('success', `Moved ${targets.length} item(s) into "${folder.name}"`);
                              refreshFiles();
                              refreshStorage();
                              refreshActivities();
                              setDraggedItem(null);
                            }}
                          >
                            <Folder size={18} className="text-amber-500 fill-amber-500/20" />
                            <span className="folder-chip-name" title={folder.name}>
                              {folder.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Files Section */}
                {displayFiles.length > 0 && (
                  <section>
                    <div className="section-label">Files</div>
                    <div className="files-grid">
                      {displayFiles.map((file) => {
                        const isSelected = selectedPaths.has(file.relPath);
                        const isCurrentlyDragged = draggedItem?.relPath === file.relPath;

                        return (
                          <div
                            key={file.id || file.relPath}
                            data-relpath={file.relPath}
                            draggable={true}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', file.relPath);
                              setDraggedItem(file);
                            }}
                            onDragEnd={() => {
                              setDraggedItem(null);
                              setDragOverTarget(null);
                            }}
                            className={`file-card-tile ${isSelected ? 'selected' : ''} ${isCurrentlyDragged ? 'dragging' : ''}`}
                            onClick={(e) => {
                              handleItemSelect(file, e);
                            }}
                            onDoubleClick={() => handleFileClick(file)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setContextMenu({ x: e.clientX, y: e.clientY, item: file });
                              setSelectedItem(file);
                            }}
                          >
                            {/* Rich Thumbnail Banner */}
                            <FileTileBanner file={file} />

                            {/* Lower Card Details */}
                            <div className="file-tile-info">
                              <div className="file-tile-title" title={file.name}>
                                {file.name}
                              </div>
                              <div className="file-tile-meta">
                                <span>{file.modifiedStr}</span>
                                <span>{file.sizeStr}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>

          {/* ── RIGHT DETAILS & ACTIVITY SIDEBAR ── */}
          {showActivity && (
            <aside className="activity-sidebar">
              {/* Dual Tabs Header */}
              <div className="activity-tabs-header">
                <button
                  className={`activity-tab-btn ${activityTab === 'details' ? 'active' : ''}`}
                  onClick={() => setActivityTab('details')}
                >
                  <Info size={14} />
                  <span>Details</span>
                </button>
                <button
                  className={`activity-tab-btn ${activityTab === 'activity' ? 'active' : ''}`}
                  onClick={() => {
                    setActivityTab('activity');
                    refreshActivities();
                  }}
                >
                  <Activity size={14} />
                  <span>Activity</span>
                </button>
              </div>

              {/* Tab Contents */}
              <div className="activity-tab-content">
                {activityTab === 'details' ? (
                  selectedItem ? (
                    <div className="details-panel">
                      <div className="details-preview-card">
                        <FileTileBanner file={selectedItem} />
                      </div>

                      <div>
                        <div className="details-item-name">{selectedItem.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-sub)', marginTop: 4 }}>
                          {selectedItem.isDir ? 'Folder' : selectedItem.kind.toUpperCase()}
                        </div>
                      </div>

                      {/* Quick Action Grid */}
                      <div className="details-actions-grid">
                        {!selectedItem.isDir && (
                          <button
                            className="details-action-btn"
                            onClick={() => handleFileClick(selectedItem)}
                          >
                            <Eye size={14} />
                            <span>Preview</span>
                          </button>
                        )}

                        <button
                          className="details-action-btn"
                          onClick={() => handleOpenShareModal(selectedItem)}
                        >
                          <Share2 size={14} />
                          <span>Share</span>
                        </button>

                        <button
                          className="details-action-btn"
                          onClick={() => setMoveCopyModal({ open: true, mode: 'move', items: [selectedItem], selectedDestPath: '' })}
                        >
                          <FolderInput size={14} />
                          <span>Move</span>
                        </button>

                        <button
                          className="details-action-btn"
                          onClick={() => setMoveCopyModal({ open: true, mode: 'copy', items: [selectedItem], selectedDestPath: '' })}
                        >
                          <Copy size={14} />
                          <span>Copy</span>
                        </button>

                        {!selectedItem.isDir && (
                          <button
                            className="details-action-btn"
                            onClick={() => downloadFile(selectedItem.relPath, selectedItem.name)}
                          >
                            <Download size={14} />
                            <span>Download</span>
                          </button>
                        )}

                        <button
                          className="details-action-btn"
                          onClick={() => toggleStar(selectedItem.relPath)}
                        >
                          <Star size={14} className={starredIds.has(selectedItem.relPath) ? 'text-amber-500 fill-amber-500' : ''} />
                          <span>{starredIds.has(selectedItem.relPath) ? 'Starred' : 'Star'}</span>
                        </button>

                        <button
                          className="details-action-btn"
                          style={{ color: 'var(--danger)', gridColumn: 'span 2' }}
                          onClick={() => setDeleteTargets([selectedItem])}
                        >
                          <Trash2 size={14} />
                          <span>Delete</span>
                        </button>
                      </div>

                      {/* Detailed Meta Table */}
                      <div className="details-meta-table">
                        <div className="details-meta-row">
                          <span className="details-meta-label">Type</span>
                          <span className="details-meta-val">{selectedItem.isDir ? 'File Folder' : selectedItem.mimeType || selectedItem.kind}</span>
                        </div>
                        <div className="details-meta-row">
                          <span className="details-meta-label">Size</span>
                          <span className="details-meta-val">{selectedItem.sizeStr}</span>
                        </div>
                        <div className="details-meta-row">
                          <span className="details-meta-label">Location</span>
                          <span className="details-meta-val" title={`/${selectedItem.relPath}`}>/{selectedItem.relPath}</span>
                        </div>
                        <div className="details-meta-row">
                          <span className="details-meta-label">Owner</span>
                          <span className="details-meta-val">{user.displayName}</span>
                        </div>
                        <div className="details-meta-row">
                          <span className="details-meta-label">Modified</span>
                          <span className="details-meta-val">{selectedItem.modifiedStr}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="activity-empty">
                      <HardDrive size={36} className="activity-pulse-icon" />
                      <p className="activity-empty-text">Select a file or folder to view detailed information and quick actions.</p>
                    </div>
                  )
                ) : (
                  /* Activity Feed Tab */
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-sub)' }}>Audit Stream</span>
                      <button
                        onClick={refreshActivities}
                        className="btn btn-ghost"
                        style={{ padding: '4px 6px' }}
                        title="Refresh Activities"
                      >
                        <RefreshCw size={13} className={loadingActivities ? 'animate-spin' : ''} />
                      </button>
                    </div>

                    {activities.length === 0 && !loadingActivities ? (
                      <div className="activity-empty">
                        <Activity size={32} className="activity-pulse-icon" />
                        <p className="activity-empty-text">No recent activities on your Nextcloud instance.</p>
                      </div>
                    ) : (
                      <div className="activity-timeline">
                        {activities.map((act) => (
                          <div key={act.id} className="activity-item">
                            <div className="activity-icon-badge">
                              <History size={14} />
                            </div>
                            <div className="activity-content">
                              <div className="activity-subject">{act.subject}</div>
                              <div className="activity-time">{act.datetimeStr}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* ── BATCH MULTI-SELECT FLOATING ACTION BAR ── */}
      {selectedPaths.size > 0 && (
        <div className="batch-floating-bar">
          <span className="batch-count">{selectedPaths.size} selected</span>

          <button
            className="batch-btn"
            onClick={() => {
              const targets = files.filter((f) => selectedPaths.has(f.relPath));
              if (targets.length > 0) {
                setMoveCopyModal({ open: true, mode: 'move', items: targets, selectedDestPath: '' });
              }
            }}
            title="Move Selected"
          >
            <FolderInput size={14} />
            <span>Move</span>
          </button>

          <button
            className="batch-btn"
            onClick={() => {
              const targets = files.filter((f) => selectedPaths.has(f.relPath));
              if (targets.length > 0) {
                setMoveCopyModal({ open: true, mode: 'copy', items: targets, selectedDestPath: '' });
              }
            }}
            title="Copy Selected"
          >
            <Copy size={14} />
            <span>Copy</span>
          </button>

          <button className="batch-btn" onClick={handleBatchDownload} title="Download Selected">
            <Download size={14} />
            <span>Download</span>
          </button>

          <button className="batch-btn" onClick={handleBatchStar} title="Star Selected">
            <Star size={14} />
            <span>Star</span>
          </button>

          {selectedPaths.size === 1 && (
            <button
              className="batch-btn"
              onClick={() => {
                const target = files.find((f) => selectedPaths.has(f.relPath));
                if (target) handleOpenShareModal(target);
              }}
              title="Share Selected"
            >
              <Share2 size={14} />
              <span>Share</span>
            </button>
          )}

          <button className="batch-btn danger" onClick={handleBatchDelete} title="Delete Selected">
            <Trash2 size={14} />
            <span>Delete</span>
          </button>

          <button className="batch-btn" onClick={() => setSelectedPaths(new Set())} title="Deselect All">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── CONTEXT MENU ── */}
      {contextMenu && (
        <div
          className="ctx-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.item.isDir ? (
            <button
              className="ctx-item"
              onClick={() => {
                navigateToFolder(contextMenu.item.relPath);
                setContextMenu(null);
              }}
            >
              <Folder size={15} />
              <span>Open Folder</span>
            </button>
          ) : (
            <>
              <button
                className="ctx-item brand"
                onClick={() => {
                  openInOnlyOffice(contextMenu.item);
                  setContextMenu(null);
                }}
              >
                <ExternalLink size={15} />
                <span>Edit in OnlyOffice</span>
              </button>
              <button
                className="ctx-item"
                onClick={() => {
                  handleFileClick(contextMenu.item);
                  setContextMenu(null);
                }}
              >
                <Eye size={15} />
                <span>Preview</span>
              </button>
              <button
                className="ctx-item"
                onClick={() => {
                  downloadFile(contextMenu.item.relPath, contextMenu.item.name);
                  setContextMenu(null);
                }}
              >
                <Download size={15} />
                <span>Download</span>
              </button>
            </>
          )}

          <button
            className="ctx-item"
            onClick={() => {
              handleOpenShareModal(contextMenu.item);
              setContextMenu(null);
            }}
          >
            <Share2 size={15} />
            <span>Share...</span>
          </button>

          <button
            className="ctx-item"
            onClick={() => {
              setMoveCopyModal({ open: true, mode: 'move', items: [contextMenu.item], selectedDestPath: '' });
              setContextMenu(null);
            }}
          >
            <FolderInput size={15} />
            <span>Move to...</span>
          </button>

          <button
            className="ctx-item"
            onClick={() => {
              setMoveCopyModal({ open: true, mode: 'copy', items: [contextMenu.item], selectedDestPath: '' });
              setContextMenu(null);
            }}
          >
            <Copy size={15} />
            <span>Copy to...</span>
          </button>

          <button
            className="ctx-item"
            onClick={() => {
              toggleStar(contextMenu.item.relPath);
              setContextMenu(null);
            }}
          >
            <Star size={15} />
            <span>{starredIds.has(contextMenu.item.relPath) ? 'Remove Star' : 'Add Star'}</span>
          </button>

          <button
            className="ctx-item"
            onClick={() => {
              setRenameTarget(contextMenu.item);
              setRenameValue(contextMenu.item.name);
              setContextMenu(null);
            }}
          >
            <Edit2 size={15} />
            <span>Rename</span>
          </button>

          <div className="ctx-sep" />

          <button
            className="ctx-item danger"
            onClick={() => {
              setDeleteTargets([contextMenu.item]);
              setContextMenu(null);
            }}
          >
            <Trash2 size={15} />
            <span>Delete</span>
          </button>
        </div>
      )}

      {/* ── MODAL: MOVE / COPY DESTINATION PICKER ── */}
      {moveCopyModal && (
        <div className="overlay" onClick={() => setMoveCopyModal(null)}>
          <div className="modal" style={{ width: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              {moveCopyModal.mode === 'move' ? 'Move' : 'Copy'} {moveCopyModal.items.length === 1 ? `"${moveCopyModal.items[0].name}"` : `${moveCopyModal.items.length} items`} to...
            </div>
            <div className="modal-body">
              <div style={{ fontSize: 12, color: 'var(--text-sub)', marginBottom: 6 }}>
                Select destination folder:
              </div>
              <div className="folder-picker-list">
                <button
                  className={`folder-picker-item ${moveCopyModal.selectedDestPath === '' ? 'active' : ''}`}
                  onClick={() => setMoveCopyModal({ ...moveCopyModal, selectedDestPath: '' })}
                >
                  <Home size={15} />
                  <span>My Drive (Root)</span>
                </button>
                {displayFolders.map((f) => (
                  <button
                    key={f.relPath}
                    className={`folder-picker-item ${moveCopyModal.selectedDestPath === f.relPath ? 'active' : ''}`}
                    onClick={() => setMoveCopyModal({ ...moveCopyModal, selectedDestPath: f.relPath })}
                  >
                    <Folder size={15} className="text-amber-500" />
                    <span>{f.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setMoveCopyModal(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleExecuteMoveCopy}>
                {moveCopyModal.mode === 'move' ? 'Move Here' : 'Copy Here'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ADMIN USER MANAGEMENT (PHASE 4.7) ── */}
      {adminUsersModalOpen && (
        <div className="overlay" onClick={() => setAdminUsersModalOpen(false)}>
          <div className="modal" style={{ width: 540, maxWidth: '95vw' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield size={18} className="text-blue-600" />
                <span>Nextcloud User Management</span>
              </div>
              <button className="btn btn-ghost" onClick={() => setAdminUsersModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              {/* Create User Box */}
              <form onSubmit={handleCreateAdminUser} style={{ background: 'var(--border-light)', padding: 14, borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>Create New Nextcloud User</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input
                    type="text"
                    required
                    placeholder="Username"
                    value={newAdminUserId}
                    onChange={(e) => setNewAdminUserId(e.target.value)}
                  />
                  <input
                    type="password"
                    required
                    placeholder="Password"
                    value={newAdminUserPass}
                    onChange={(e) => setNewAdminUserPass(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Display Name (e.g. John Doe)"
                    value={newAdminUserDisplay}
                    onChange={(e) => setNewAdminUserDisplay(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="btn btn-primary">
                    <UserPlus size={14} />
                    <span>Create User</span>
                  </button>
                </div>
              </form>

              {/* Users List */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Existing Users ({adminUsersList.length})</span>
                  <button className="btn btn-ghost" onClick={refreshAdminUsers} style={{ padding: '2px 6px' }}>
                    <RefreshCw size={12} className={loadingAdminUsers ? 'animate-spin' : ''} />
                  </button>
                </div>

                <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {adminUsersList.map((u) => (
                    <div
                      key={u.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--r-sm)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <UserAvatar username={u.id} displayName={u.displayName || u.id} size={28} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>{u.displayName || u.id}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-sub)' }}>@{u.id}</div>
                        </div>
                      </div>
                      {u.id !== user?.username && (
                        <button
                          className="btn btn-ghost text-red-500"
                          onClick={() => handleDeleteAdminUser(u.id)}
                          style={{ padding: '4px 6px' }}
                          title="Delete User"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: SHARE (PUBLIC LINK & USER SHARING) ── */}
      {shareModal.open && shareModal.item && (
        <div className="overlay" onClick={() => setShareModal((p) => ({ ...p, open: false }))}>
          <div className="modal share-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Share2 size={18} className="text-blue-600" />
                <span>Share "{shareModal.item.name}"</span>
              </div>
              <button className="btn btn-ghost" onClick={() => setShareModal((p) => ({ ...p, open: false }))}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              {/* Public Link Generator Box */}
              <div className="share-public-box">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>Public Web Link</div>
                  <span style={{ fontSize: 11, color: 'var(--text-sub)' }}>Anyone with link</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--text-sub)', marginBottom: 4 }}>Password (Optional)</label>
                    <input
                      type="password"
                      placeholder="Protect with password"
                      value={sharePassword}
                      onChange={(e) => setSharePassword(e.target.value)}
                      style={{ fontSize: 12, padding: '6px 10px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--text-sub)', marginBottom: 4 }}>Expiry Date</label>
                    <input
                      type="date"
                      value={shareExpireDate}
                      onChange={(e) => setShareExpireDate(e.target.value)}
                      style={{ fontSize: 12, padding: '6px 10px' }}
                    />
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handleCreatePublicShareLink}
                  disabled={creatingShare}
                  style={{ marginTop: 12, width: '100%', justifyContent: 'center', padding: '7px 0' }}
                >
                  <Plus size={14} />
                  <span>{creatingShare ? 'Creating Link...' : 'Create Public Share Link'}</span>
                </button>
              </div>

              {/* Share With Specific Nextcloud User */}
              <form onSubmit={handleCreateUserShareSubmit}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
                  Share with Nextcloud User / Group
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    list="sharees-datalist"
                    placeholder="Search or select user / group"
                    value={shareWithUser}
                    onChange={(e) => setShareWithUser(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <datalist id="sharees-datalist">
                    {shareesList.map((s) => (
                      <option key={`${s.value.shareType}_${s.value.shareWith}`} value={s.value.shareWith}>
                        {s.label}
                      </option>
                    ))}
                  </datalist>
                  <button type="submit" className="btn btn-primary">
                    <UserPlus size={14} />
                    <span>Share</span>
                  </button>
                </div>

                {/* Quick Add User Chips */}
                {shareesList.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginTop: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-sub)', marginRight: 2 }}>Users:</span>
                    {shareesList
                      .filter((s) => s.value.shareWith !== user?.username)
                      .map((s) => (
                        <button
                          key={s.value.shareWith}
                          type="button"
                          className="btn btn-ghost"
                          style={{
                            padding: '2px 8px',
                            fontSize: 11,
                            borderRadius: 'var(--r-full)',
                            background: shareWithUser === s.value.shareWith ? 'var(--primary-blue-light)' : 'var(--border-light)',
                            color: shareWithUser === s.value.shareWith ? 'var(--primary-blue)' : 'var(--text-main)',
                            fontWeight: shareWithUser === s.value.shareWith ? 600 : 400,
                          }}
                          onClick={() => setShareWithUser(s.value.shareWith)}
                        >
                          {s.label}
                        </button>
                      ))}
                  </div>
                )}
              </form>

              {/* Active Shares List */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginTop: 8, marginBottom: 6 }}>
                  Active Shares ({shareModal.shares.length})
                </div>
                {shareModal.shares.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text-sub)', fontStyle: 'italic', padding: '6px 0' }}>
                    No active share links for this item yet.
                  </div>
                ) : (
                  <div className="share-active-list">
                    {shareModal.shares.map((s) => (
                      <div key={s.id} className="share-active-item">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {s.shareType === 3 ? <Globe size={13} className="text-blue-600" /> : <UserIcon size={13} className="text-indigo-600" />}
                            <span>{s.shareType === 3 ? 'Public Link' : s.shareWithDisplayname || s.shareWith}</span>
                            {s.hasPassword && <span title="Password protected"><Lock size={11} className="text-amber-500" /></span>}
                          </div>
                          {s.url && (
                            <div style={{ fontSize: 11, color: 'var(--text-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {s.url}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 6 }}>
                          {s.url && (
                            <button
                              className="btn btn-ghost"
                              onClick={() => handleCopyShareLink(s.url!, s.id)}
                              style={{ padding: '4px 8px', fontSize: 11.5 }}
                              title="Copy Share Link"
                            >
                              {copiedShareId === s.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                              <span>{copiedShareId === s.id ? 'Copied' : 'Copy'}</span>
                            </button>
                          )}
                          <button
                            className="btn btn-ghost text-red-500"
                            onClick={() => handleDeleteShareItem(s.id)}
                            style={{ padding: '4px 6px' }}
                            title="Revoke Share"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE NEW FOLDER ── */}
      {newFolderModalOpen && (
        <div className="overlay" onClick={() => setNewFolderModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">New Folder</div>
            <form onSubmit={handleCreateFolder}>
              <div className="modal-body">
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setNewFolderModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE DOCUMENT / SHEET / SLIDES ── */}
      {newDocModal.open && (
        <div className="overlay" onClick={() => setNewDocModal((p) => ({ ...p, open: false }))}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">{newDocModal.title}</div>
            <form onSubmit={handleCreateDocSubmit}>
              <div className="modal-body">
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 6 }}>Document Name</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    autoFocus
                    required
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    placeholder="Enter name"
                  />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-sub)', fontSize: 13 }}>
                    {newDocModal.ext}
                  </span>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setNewDocModal((p) => ({ ...p, open: false }))}>
                  Cancel
                </button>
                <button type="submit" disabled={creatingDoc} className="btn btn-primary">
                  {creatingDoc ? 'Creating...' : 'Create & Edit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: RENAME ── */}
      {renameTarget && (
        <div className="overlay" onClick={() => setRenameTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">Rename Item</div>
            <form onSubmit={handleRenameSubmit}>
              <div className="modal-body">
                <input
                  type="text"
                  autoFocus
                  required
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setRenameTarget(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: DELETE ── */}
      {deleteTargets.length > 0 && (
        <div className="overlay" onClick={() => setDeleteTargets([])}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">Delete Item(s)</div>
            <div className="modal-body" style={{ color: 'var(--text-muted)' }}>
              Are you sure you want to move {deleteTargets.length === 1 ? `"${deleteTargets[0].name}"` : `${deleteTargets.length} items`} to the trashbin?
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setDeleteTargets([])}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDeleteConfirm}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: EMPTY TRASH CONFIRMATION ── */}
      {emptyTrashConfirm && (
        <div className="overlay" onClick={() => setEmptyTrashConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">Empty Trash?</div>
            <div className="modal-body" style={{ color: 'var(--text-muted)' }}>
              All {trashItems.length} items in the trash will be permanently deleted. This action cannot be undone.
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setEmptyTrashConfirm(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={handleEmptyTrash}>
                Empty Trash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: FILE PREVIEW (MEDIA / PDF) ── */}
      {previewTarget && (
        <div className="overlay" onClick={closePreview}>
          <div className="modal" style={{ maxWidth: 800, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{previewTarget.name}</span>
              <button className="btn btn-ghost" onClick={closePreview}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 280 }}>
              {previewLoading ? (
                <RefreshCw size={28} className="animate-spin text-blue-600" />
              ) : previewTarget.kind === 'image' && previewBlobUrl ? (
                <img src={previewBlobUrl} alt={previewTarget.name} style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: 8 }} />
              ) : previewTarget.kind === 'video' && previewBlobUrl ? (
                <video src={previewBlobUrl} controls autoPlay style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: 8 }} />
              ) : previewTarget.kind === 'pdf' && previewBlobUrl ? (
                <iframe src={previewBlobUrl} title={previewTarget.name} style={{ width: '100%', height: '65vh', border: 'none' }} />
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{previewTarget.name}</div>
                  <button className="btn btn-primary" onClick={() => downloadFile(previewTarget.relPath, previewTarget.name)}>
                    <Download size={15} />
                    <span>Download File</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ONLYOFFICE EMBEDDED FULL-SCREEN EDITOR MODAL ── */}
      {onlyOfficeModal && (
        <div className="onlyoffice-overlay">
          <div className="onlyoffice-header">
            <div className="onlyoffice-title-wrap">
              <img src="/Govind Drive Logo Small 2.png" alt="Govind Drive" style={{ height: 26, width: 'auto', objectFit: 'contain' }} />
              <span className="onlyoffice-title">{onlyOfficeModal.name}</span>
              <span className="onlyoffice-badge">OnlyOffice Docs CE</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Check size={14} className="text-emerald-600" />
                Saved to 4TB NVMe
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className="btn btn-ghost"
                onClick={() => window.open(`${NC_HOST}${onlyOfficeModal.url}`, '_blank')}
                title="Open in Full Tab"
              >
                <ExternalLink size={15} />
                <span>Open in Tab</span>
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => downloadFile(onlyOfficeModal.item.relPath, onlyOfficeModal.item.name)}
                title="Download file"
              >
                <Download size={15} />
                <span>Download</span>
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setOnlyOfficeModal(null);
                  refreshFiles();
                  refreshActivities();
                }}
                style={{ padding: '6px 8px' }}
                title="Close Editor"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="onlyoffice-iframe-container">
            <iframe
              src={onlyOfficeModal.url}
              title={onlyOfficeModal.name}
              className="onlyoffice-iframe"
            />
          </div>
        </div>
      )}

      {/* ── UPLOAD PROGRESS WIDGET ── */}
      {uploadState && (
        <div className="upload-widget">
          <div className="upload-widget-header">
            <span>{uploadState.uploading ? `Uploading ${uploadState.totalFiles} files...` : 'Upload Complete'}</span>
            <button onClick={() => setUploadState(null)} style={{ color: '#fff' }}><X size={16} /></button>
          </div>
          <div className="upload-item">
            <div className="upload-item-name">{uploadState.fileName}</div>
            <div className="upload-bar">
              <div
                className="upload-bar-fill"
                style={{
                  width: `${uploadState.progress}%`,
                  background: uploadState.error ? 'var(--danger)' : uploadState.completed ? 'var(--success)' : 'var(--primary-blue)',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
