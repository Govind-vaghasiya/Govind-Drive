const hostName = typeof window !== 'undefined' && window.location?.hostname ? window.location.hostname : 'localhost';
export const API_BASE = `http://${hostName}:3001/api`;

// Fallback: read from localStorage only when no explicit userId is passed
function getCurrentUserId(): string {
  try {
    const saved = localStorage.getItem('govind_drive_user') || localStorage.getItem('aurora_drive_user');
    if (saved) {
      const u = JSON.parse(saved);
      return u.email || u.id || 'admin_govind_home';
    }
  } catch {}
  return 'admin_govind_home';
}

function getAuthHeaders(userId?: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-user-id': userId || getCurrentUserId(),
  };
}

export interface DiskItem {
  id: string;
  name: string;
  kind: 'folder' | 'pdf' | 'doc' | 'sheet' | 'slides' | 'image' | 'video' | 'audio' | 'archive';
  size: string;
  sizeBytes: number;
  modified: string;
  modifiedRaw: number;
  childCount?: number;
  relPath: string;
  isDir: boolean;
}

export async function fetchDiskConfig(): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/config`, { headers: { 'x-user-id': getCurrentUserId() } });
    const data = await res.json();
    return data.storageRoot || '';
  } catch {
    return '';
  }
}

export async function updateDiskConfig(newPath: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/config`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ storageRoot: newPath }),
    });
    const data = await res.json();
    return data.success;
  } catch {
    return false;
  }
}

export async function createUserDiskFolder(
  userEmail: string,
  folderKey?: string,
  requestingUserId?: string
): Promise<{ success: boolean; folderName: string }> {
  try {
    const uid = requestingUserId || getCurrentUserId();
    const res = await fetch(`${API_BASE}/create-user-folder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': uid },
      body: JSON.stringify({ userEmail, folderKey, requestingUserId: uid }),
    });
    const data = await res.json();
    return { success: data.success, folderName: data.folderName || '' };
  } catch {
    return { success: false, folderName: '' };
  }
}

// userId is now REQUIRED — must be passed explicitly to avoid localStorage race conditions
export async function fetchDiskItems(subpath: string = '', userId?: string): Promise<{ items: DiskItem[]; storageRoot: string }> {
  try {
    const uid = userId || getCurrentUserId();
    const res = await fetch(`${API_BASE}/files?subpath=${encodeURIComponent(subpath)}&userId=${encodeURIComponent(uid)}`, {
      headers: { 'x-user-id': uid },
    });
    const data = await res.json();
    return { items: data.items || [], storageRoot: data.storageRoot || '' };
  } catch {
    return { items: [], storageRoot: '' };
  }
}

export async function createDiskFolder(subpath: string, folderName: string, userId?: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/mkdir`, {
      method: 'POST',
      headers: getAuthHeaders(userId),
      body: JSON.stringify({ subpath, name: folderName }),
    });
    const data = await res.json();
    return data.success;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Chunked upload — keeps every HTTP request under 60 MB so it passes through
// Cloudflare's 100 MB request-body limit even for multi-GB files.
// ---------------------------------------------------------------------------

/** Maximum bytes per chunk: 55 MB leaves headroom under Cloudflare's 100 MB cap */
const CHUNK_SIZE = 55 * 1024 * 1024;

function generateUploadId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Upload a single small file (≤ CHUNK_SIZE) via the existing /api/upload route.
 * Uses XHR so we can track per-byte progress.
 */
function uploadSingleFile(
  file: File,
  relPath: string,
  subpath: string,
  uid: string,
  onBytesUploaded: (bytes: number) => void
): Promise<boolean> {
  return new Promise((resolve) => {
    const formData = new FormData();
    formData.append('files', file, relPath);
    formData.append('paths', relPath);

    const xhr = new XMLHttpRequest();
    xhr.open(
      'POST',
      `${API_BASE}/upload?subpath=${encodeURIComponent(subpath)}&userId=${encodeURIComponent(uid)}`,
      true
    );
    xhr.setRequestHeader('x-user-id', uid);

    let lastLoaded = 0;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const delta = e.loaded - lastLoaded;
        lastLoaded = e.loaded;
        onBytesUploaded(delta);
      }
    };

    xhr.onload = () => {
      // Count any bytes not reported by the final progress event
      if (lastLoaded < file.size) onBytesUploaded(file.size - lastLoaded);
      resolve(xhr.status >= 200 && xhr.status < 300);
    };
    xhr.onerror = () => resolve(false);
    xhr.send(formData);
  });
}

/**
 * Upload a single chunk (Blob slice) of a large file to /api/upload-chunk.
 * Uses XHR for per-byte progress tracking.
 */
function uploadChunk(
  chunk: Blob,
  chunkIndex: number,
  uploadId: string,
  subpath: string,
  uid: string,
  onBytesUploaded: (bytes: number) => void
): Promise<boolean> {
  return new Promise((resolve) => {
    const formData = new FormData();
    formData.append('chunk', chunk, 'chunk');

    const xhr = new XMLHttpRequest();
    xhr.open(
      'POST',
      `${API_BASE}/upload-chunk` +
        `?uploadId=${encodeURIComponent(uploadId)}` +
        `&chunkIndex=${chunkIndex}` +
        `&subpath=${encodeURIComponent(subpath)}` +
        `&userId=${encodeURIComponent(uid)}`,
      true
    );
    xhr.setRequestHeader('x-user-id', uid);

    let lastLoaded = 0;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const delta = e.loaded - lastLoaded;
        lastLoaded = e.loaded;
        onBytesUploaded(delta);
      }
    };

    xhr.onload = () => {
      if (lastLoaded < chunk.size) onBytesUploaded(chunk.size - lastLoaded);
      resolve(xhr.status >= 200 && xhr.status < 300);
    };
    xhr.onerror = () => resolve(false);
    xhr.send(formData);
  });
}

/**
 * Tell the server to assemble all uploaded chunks into the final file.
 * The server streams them in order, then deletes the temp chunk directory.
 */
async function finalizeChunkedUpload(
  uploadId: string,
  fileName: string,
  totalChunks: number,
  relPath: string,
  subpath: string,
  uid: string
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/upload-finalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': uid },
      body: JSON.stringify({ uploadId, fileName, totalChunks, relPath, subpath }),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

/**
 * Public upload function used throughout the app.
 *
 * - Files ≤ 55 MB  → single /api/upload request (unchanged behaviour)
 * - Files >  55 MB → split into 55 MB chunks, uploaded sequentially via
 *                    /api/upload-chunk, then assembled by /api/upload-finalize
 *
 * Progress is reported as an aggregate percentage across ALL files, so the
 * existing UploadProgressWidget in App.tsx works without any changes.
 */
export function uploadDiskFiles(
  files: FileList | File[],
  subpath: string = '',
  onProgress?: (progressPct: number, currentFileName: string) => void,
  userId?: string
): Promise<boolean> {
  return new Promise(async (resolve) => {
    const uid = userId || getCurrentUserId();
    const fileArray = Array.from(files);

    // Total bytes across every file — used for accurate aggregate progress
    const totalBytes = fileArray.reduce((sum, f) => sum + f.size, 0) || 1;
    let bytesUploaded = 0;

    const reportProgress = (currentFileName: string, newBytes: number) => {
      bytesUploaded += newBytes;
      // Cap at 99 until everything is confirmed done (100 is set at the end)
      const pct = Math.min(99, Math.round((bytesUploaded / totalBytes) * 100));
      onProgress?.(pct, currentFileName);
    };

    for (const file of fileArray) {
      const relPath =
        (file as any).relPath ||
        (file as any).webkitRelativePath ||
        file.name;

      // Immediately report the new filename so the widget updates
      onProgress?.(
        Math.min(99, Math.round((bytesUploaded / totalBytes) * 100)),
        file.name
      );

      if (file.size <= CHUNK_SIZE) {
        // ── Small file: single request ───────────────────────────────────
        const ok = await uploadSingleFile(
          file,
          relPath,
          subpath,
          uid,
          (bytes) => reportProgress(file.name, bytes)
        );
        if (!ok) { resolve(false); return; }
      } else {
        // ── Large file: chunked upload ───────────────────────────────────
        const uploadId = generateUploadId();
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);

          const ok = await uploadChunk(
            chunk,
            i,
            uploadId,
            subpath,
            uid,
            (bytes) => reportProgress(file.name, bytes)
          );
          if (!ok) { resolve(false); return; }
        }

        // Ask the server to assemble all chunks into the final file
        const ok = await finalizeChunkedUpload(
          uploadId,
          file.name,
          totalChunks,
          relPath,
          subpath,
          uid
        );
        if (!ok) { resolve(false); return; }
      }
    }

    onProgress?.(100, fileArray[fileArray.length - 1]?.name ?? 'files');
    resolve(true);
  });
}

export async function renameDiskItem(relPath: string, newName: string, userId?: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/rename`, {
      method: 'POST',
      headers: getAuthHeaders(userId),
      body: JSON.stringify({ relPath, newName }),
    });
    const data = await res.json();
    return data.success;
  } catch {
    return false;
  }
}

export async function moveDiskItem(relPath: string, targetDir: string, userId?: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/rename`, {
      method: 'POST',
      headers: getAuthHeaders(userId),
      body: JSON.stringify({ relPath, targetDir }),
    });
    const data = await res.json();
    return data.success;
  } catch {
    return false;
  }
}

export async function deleteDiskItem(relPath: string, userId?: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/delete`, {
      method: 'POST',
      headers: getAuthHeaders(userId),
      body: JSON.stringify({ relPath }),
    });
    const data = await res.json();
    return data.success;
  } catch {
    return false;
  }
}

export function getDiskDownloadUrl(relPath: string, inline: boolean = false, userId?: string): string {
  const uid = userId || getCurrentUserId();
  return `${API_BASE}/download?path=${encodeURIComponent(relPath)}&userId=${encodeURIComponent(uid)}${inline ? '&inline=true' : ''}`;
}
