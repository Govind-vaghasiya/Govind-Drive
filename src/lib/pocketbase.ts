import PocketBase from 'pocketbase';

export const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090';
export const pb = new PocketBase(POCKETBASE_URL);

// Auto-cancellation of pending requests disabled to allow multiple fast UI calls
pb.autoCancellation(false);

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'user';
  created?: string;
  folderId?: string;        // Unique disk storage folder key (email_XXXX) — set once on creation
  passwordHash?: string;    // SHA-256 hash of password for localStorage fallback auth
  sessionCreatedAt?: number; // Unix ms — used to enforce 30-day session expiry
}

export interface DriveFolder {
  id: string;
  name: string;
  parentFolder?: string; // folder ID or undefined for root
  owner: string; // user ID
  created?: string;
  updated?: string;
}

export interface DriveFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  file?: string; // PocketBase filename or object URL
  blobUrl?: string; // Local preview URL
  folder?: string; // folder ID
  owner: string; // user ID
  isStarred: boolean;
  isTrashed: boolean;
  sharedWith?: string[]; // user IDs
  created?: string;
  updated?: string;
}

export interface ShareLink {
  id: string;
  itemId: string;
  itemType: 'file' | 'folder';
  token: string;
  password?: string;
  expiresAt?: string;
  allowUpload?: boolean;
  createdBy: string;
  created?: string;
}

// ----------------------------------------------------
// PASSWORD HASHING (Web Crypto API — no extra deps)
// ----------------------------------------------------

/**
 * SHA-256 hash a password with a fixed app-level salt.
 * Used for the localStorage fallback auth so passwords are
 * never stored or compared as plain text.
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  // App-level salt prevents rainbow table attacks on the stored hashes
  const data = encoder.encode(`govind_drive_v1::${password}`);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ----------------------------------------------------
// STORAGE & API HELPER METHODS
// ----------------------------------------------------

/**
 * Get File Download / View URL
 */
export function getFileUrl(file: DriveFile): string {
  if (file.blobUrl) {
    return file.blobUrl;
  }
  if (file.file && !file.file.startsWith('blob:')) {
    return `${POCKETBASE_URL}/api/files/files/${file.id}/${file.file}`;
  }
  return '#';
}

/**
 * Helper to upload a real binary file to PocketBase server storage
 */
export async function uploadFileToPocketBase(
  file: File,
  folderId?: string | null,
  ownerId?: string
): Promise<DriveFile> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', file.name);
  formData.append('size', file.size.toString());
  formData.append('mimeType', file.type || 'application/octet-stream');
  if (folderId) formData.append('folder', folderId);
  if (ownerId) formData.append('owner', ownerId);

  try {
    const record = await pb.collection('files').create(formData);
    return {
      id: record.id,
      name: record.name,
      size: record.size,
      mimeType: record.mimeType,
      file: record.file,
      folder: record.folder,
      owner: record.owner,
      isStarred: false,
      isTrashed: false,
      created: record.created,
    };
  } catch (err) {
    console.warn('PocketBase not connected, using browser local storage:', err);
    // Create local object URL for instant preview & download
    const blobUrl = URL.createObjectURL(file);
    return {
      id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      blobUrl,
      folder: folderId || undefined,
      owner: ownerId || 'local_user',
      isStarred: false,
      isTrashed: false,
      created: new Date().toISOString(),
    };
  }
}

/**
 * Helper to check if PocketBase backend is reachable
 */
export async function isBackendConnected(): Promise<boolean> {
  try {
    const health = await fetch(`${POCKETBASE_URL}/api/health`, { method: 'GET' });
    return health.ok;
  } catch {
    return false;
  }
}
