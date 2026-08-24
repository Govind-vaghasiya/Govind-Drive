/**
 * nc.ts — Nextcloud WebDAV, OCS, and OnlyOffice Integration
 */

export const NC_HOST = 'http://10.147.17.1:7580';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface NCUser {
  username: string;     // Canonical Nextcloud UID (e.g. "govindvaghasia", "casaos")
  loginName: string;    // Username or email entered at login
  displayName: string;  // Full display name (e.g. "Govind Vaghasiya")
  email: string;
  isAdmin: boolean;
  storageUsed: number;  // in bytes
  storageTotal: number; // in bytes (0 = unlimited)
}

export interface FileItem {
  id: string;
  fileId?: string;      // Nextcloud numeric file ID (used for OnlyOffice & direct links)
  name: string;
  relPath: string;      // relative to user root (e.g. "Documents/Report.docx")
  isDir: boolean;
  mimeType: string;
  size: number;         // in bytes
  sizeStr: string;
  modified: Date;
  modifiedStr: string;
  kind: FileKind;
}

export type FileKind =
  | 'folder'
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'doc'
  | 'sheet'
  | 'slides'
  | 'archive'
  | 'code'
  | 'other';

// ---------------------------------------------------------------------------
// Session persistence (30-day expiry)
// ---------------------------------------------------------------------------
const SESSION_KEY = 'gd_session_v2';
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

interface Session {
  canonicalUsername: string;
  loginName: string;
  password: string;
  user: NCUser;
  expiresAt: number;
}

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (Date.now() > s.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

function saveSession(s: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('gd_session');
  localStorage.removeItem('govind_drive_user');
  localStorage.removeItem('govind_nc_session');
}

// ---------------------------------------------------------------------------
// Internal HTTP helpers
// ---------------------------------------------------------------------------
function b64(u: string, p: string): string {
  return btoa(`${u}:${p}`);
}

function authHeaders(loginName: string, p: string): HeadersInit {
  return {
    Authorization: `Basic ${b64(loginName, p)}`,
    'OCS-APIRequest': 'true',
    'X-Requested-With': 'XMLHttpRequest',
  };
}

function davUrl(canonicalUsername: string, relPath = ''): string {
  const userEnc = encodeURIComponent(canonicalUsername);
  if (!relPath) return `/remote.php/dav/files/${userEnc}/`;
  
  const pathEnc = relPath
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');
    
  return `/remote.php/dav/files/${userEnc}/${pathEnc}`;
}

// ---------------------------------------------------------------------------
// PROPFIND XML parsing
// ---------------------------------------------------------------------------
function parsePropfind(xml: string, canonicalUsername: string, targetRelPath = ''): FileItem[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const ns = 'DAV:';
  const responses = Array.from(doc.getElementsByTagNameNS(ns, 'response'));
  
  const userPrefix = `/remote.php/dav/files/${canonicalUsername}/`;
  const userPrefixEnc = `/remote.php/dav/files/${encodeURIComponent(canonicalUsername)}/`;
  const normalizedTarget = targetRelPath.replace(/^\/+|\/+$/g, '');

  const items: FileItem[] = [];

  for (const resp of responses) {
    const hrefEl = resp.getElementsByTagNameNS(ns, 'href')[0];
    if (!hrefEl || !hrefEl.textContent) continue;

    const rawHref = hrefEl.textContent;
    let rel = decodeURIComponent(rawHref)
      .replace(userPrefix, '')
      .replace(userPrefixEnc, '')
      .replace(/^\/+|\/+$/g, '');

    // Skip the queried folder itself
    if (!rel || rel === normalizedTarget) {
      continue;
    }

    const props =
      resp.querySelector('propstat > prop') ??
      resp.getElementsByTagNameNS(ns, 'prop')[0];

    if (!props) continue;

    const isDir = !!props.getElementsByTagNameNS(ns, 'collection')[0];
    const rawName = props.getElementsByTagNameNS(ns, 'displayname')[0]?.textContent;
    const name = rawName || rel.split('/').pop() || rel;
    const mime = props.getElementsByTagNameNS(ns, 'getcontenttype')[0]?.textContent ?? '';
    const sizeStr = props.getElementsByTagNameNS(ns, 'getcontentlength')[0]?.textContent ?? '0';
    const size = parseInt(sizeStr, 10) || 0;
    const lastMod = props.getElementsByTagNameNS(ns, 'getlastmodified')[0]?.textContent ?? '';
    const etag = props.getElementsByTagNameNS(ns, 'getetag')[0]?.textContent?.replace(/"/g, '') ?? '';
    
    // Robust fileid extraction
    const fileIdEl =
      props.getElementsByTagNameNS('http://owncloud.org/ns', 'fileid')[0] ||
      props.querySelector('fileid') ||
      props.getElementsByTagName('oc:fileid')[0];
    const fileId = fileIdEl?.textContent ?? '';

    // Skip broken/unreachable system external mounts (Nextcloud returns fileid -1)
    if (fileId === '-1') {
      continue;
    }

    const modified = lastMod ? new Date(lastMod) : new Date();
    const kind = isDir ? 'folder' : mimeToKind(mime, name);

    items.push({
      id: etag || rel,
      fileId: fileId || undefined,
      name,
      relPath: rel,
      isDir,
      mimeType: mime,
      size,
      sizeStr: formatSize(size, isDir),
      modified,
      modifiedStr: formatDate(modified),
      kind,
    });
  }

  return items;
}

function formatSize(bytes: number, isDir: boolean): string {
  if (isDir) return '—';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 4);
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(1))} ${units[i]}`;
}

function formatDate(d: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) {
    return `Today, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: diffDays > 365 ? 'numeric' : undefined,
  });
}

function mimeToKind(mime: string, name: string): FileKind {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (['xlsx', 'xls', 'ods', 'csv'].includes(ext) || mime.includes('spreadsheet') || mime.includes('excel')) return 'sheet';
  if (['pptx', 'ppt', 'odp'].includes(ext) || mime.includes('presentation')) return 'slides';
  if (['docx', 'doc', 'odt', 'rtf', 'txt', 'md'].includes(ext) || mime.includes('word') || mime === 'text/plain') return 'doc';
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) return 'archive';
  if (['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'go', 'rs', 'c', 'cpp', 'h', 'json', 'yaml', 'yml', 'sh'].includes(ext)) return 'code';
  return 'other';
}

// ---------------------------------------------------------------------------
// Public Auth API
// ---------------------------------------------------------------------------
export type LoginResult =
  | { ok: true; user: NCUser }
  | { ok: false; error: string };

export async function ncLogin(usernameInput: string, passwordInput: string): Promise<LoginResult> {
  const loginName = usernameInput.trim();
  const password = passwordInput;

  let canonicalUid = loginName;
  let displayName = loginName;
  let email = '';
  let isAdmin = false;
  let storageUsed = 0;
  let storageTotal = 0;

  try {
    const ocsRes = await fetch('/ocs/v2.php/cloud/user', {
      headers: {
        ...authHeaders(loginName, password),
        'OCS-APIRequest': 'true',
        Accept: 'application/json',
      },
    });

    if (ocsRes.status === 401) {
      return { ok: false, error: 'Incorrect username or password.' };
    }

    if (ocsRes.ok) {
      const json = await ocsRes.json();
      const d = json?.ocs?.data;
      if (d) {
        canonicalUid = d.id || loginName;
        displayName = d.displayname || canonicalUid;
        email = d.email || '';
        isAdmin = Array.isArray(d.groups) && d.groups.includes('admin');
        storageUsed = d.quota?.used ?? 0;
        storageTotal = d.quota?.total && d.quota.total > 0 ? d.quota.total : 0;
      }
    }
  } catch (err: any) {
    console.error('[nc] Login connection error:', err);
    return { ok: false, error: 'Cannot connect to Nextcloud server. Please ensure the server is online.' };
  }

  const user: NCUser = {
    username: canonicalUid,
    loginName,
    displayName,
    email,
    isAdmin,
    storageUsed,
    storageTotal,
  };

  const session: Session = {
    canonicalUsername: canonicalUid,
    loginName,
    password,
    user,
    expiresAt: Date.now() + THIRTY_DAYS,
  };

  saveSession(session);
  return { ok: true, user };
}

export function getCurrentUser(): NCUser | null {
  return loadSession()?.user ?? null;
}

export function getSessionData(): Session | null {
  return loadSession();
}

export function ncLogout(): void {
  clearSession();
}

// ---------------------------------------------------------------------------
// File Operations
// ---------------------------------------------------------------------------

export async function listFiles(relPath = ''): Promise<FileItem[]> {
  const session = loadSession();
  if (!session) return [];

  const url = davUrl(session.canonicalUsername, relPath);
  try {
    const res = await fetch(url, {
      method: 'PROPFIND',
      headers: {
        ...authHeaders(session.loginName, session.password),
        Depth: '1',
      },
      body: '<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns"><d:prop><d:getlastmodified/><d:getcontentlength/><d:getcontenttype/><d:resourcetype/><d:getetag/><d:displayname/><oc:fileid/></d:prop></d:propfind>',
    });

    if (!res.ok && res.status !== 207) {
      console.error(`[nc] listFiles status ${res.status} for ${url}`);
      return [];
    }

    const xml = await res.text();
    return parsePropfind(xml, session.canonicalUsername, relPath);
  } catch (err) {
    console.error('[nc] listFiles error:', err);
    return [];
  }
}

export async function createFolder(relPath: string): Promise<{ ok: boolean; error?: string }> {
  const session = loadSession();
  if (!session) return { ok: false, error: 'Not logged in' };

  const url = davUrl(session.canonicalUsername, relPath);

  try {
    const res = await fetch(url, {
      method: 'MKCOL',
      headers: authHeaders(session.loginName, session.password),
    });

    if (res.ok || res.status === 201 || res.status === 405) {
      return { ok: true };
    }

    const body = await res.text().catch(() => '');
    console.error(`[nc] createFolder error ${res.status}:`, body);
    return { ok: false, error: `Folder creation failed (HTTP ${res.status})` };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error creating folder' };
  }
}

export function uploadFile(
  file: File | Blob,
  destRelPath: string,
  onProgress?: (pct: number) => void
): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const session = loadSession();
    if (!session) {
      resolve({ ok: false, error: 'Not logged in' });
      return;
    }

    const url = davUrl(session.canonicalUsername, destRelPath);

    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.setRequestHeader('Authorization', `Basic ${b64(session.loginName, session.password)}`);
    xhr.setRequestHeader('OCS-APIRequest', 'true');
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress?.(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve({ ok: true });
      } else {
        console.error(`[nc] upload error ${xhr.status}:`, xhr.responseText);
        resolve({ ok: false, error: `Upload failed (HTTP ${xhr.status})` });
      }
    };

    xhr.onerror = () => {
      resolve({ ok: false, error: 'Network error during file upload' });
    };

    xhr.send(file);
  });
}

export async function uploadFiles(
  files: File[],
  destDir: string,
  onProgress?: (pct: number, fileName: string) => void
): Promise<{ ok: boolean; failed: string[] }> {
  const failed: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const dest = destDir ? `${destDir}/${file.name}` : file.name;
    onProgress?.(Math.round((i / files.length) * 100), file.name);

    const result = await uploadFile(file, dest, (pct) => {
      const overall = Math.round(((i + pct / 100) / files.length) * 100);
      onProgress?.(Math.min(overall, 99), file.name);
    });

    if (!result.ok) failed.push(file.name);
  }

  onProgress?.(100, files[files.length - 1]?.name ?? '');
  return { ok: failed.length === 0, failed };
}

export async function deleteItem(relPath: string): Promise<{ ok: boolean; error?: string }> {
  const session = loadSession();
  if (!session) return { ok: false, error: 'Not logged in' };

  const url = davUrl(session.canonicalUsername, relPath);

  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: authHeaders(session.loginName, session.password),
    });

    if (res.ok || res.status === 204 || res.status === 200 || res.status === 404) {
      return { ok: true };
    }
    const errBody = await res.text().catch(() => '');
    console.error(`[nc] deleteItem error (${res.status}):`, errBody);
    return { ok: false, error: `Delete failed (HTTP ${res.status})` };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error deleting item' };
  }
}

export async function moveItem(fromRelPath: string, toRelPath: string): Promise<{ ok: boolean; error?: string }> {
  const session = loadSession();
  if (!session) return { ok: false, error: 'Not logged in' };

  if (fromRelPath === toRelPath) {
    return { ok: true };
  }

  // Prevent moving a folder into its own subfolder
  if (toRelPath.startsWith(fromRelPath + '/')) {
    return { ok: false, error: 'Cannot move a folder into itself' };
  }

  const fromUrl = davUrl(session.canonicalUsername, fromRelPath);
  const destDavPath = davUrl(session.canonicalUsername, toRelPath);

  try {
    const res = await fetch(fromUrl, {
      method: 'MOVE',
      headers: {
        ...authHeaders(session.loginName, session.password),
        Destination: destDavPath,
        Overwrite: 'T',
      },
    });

    if (res.ok || res.status === 201 || res.status === 204) {
      return { ok: true };
    }
    const errText = await res.text().catch(() => '');
    console.error(`[nc] moveItem failed (${res.status}):`, errText);
    return { ok: false, error: `Move failed (HTTP ${res.status})` };
  } catch (err: any) {
    console.error('[nc] moveItem error:', err);
    return { ok: false, error: err.message || 'Network error moving item' };
  }
}

export async function copyItem(fromRelPath: string, toRelPath: string): Promise<{ ok: boolean; error?: string }> {
  const session = loadSession();
  if (!session) return { ok: false, error: 'Not logged in' };

  if (fromRelPath === toRelPath) {
    return { ok: false, error: 'Source and destination cannot be identical' };
  }

  const fromUrl = davUrl(session.canonicalUsername, fromRelPath);
  const destDavPath = davUrl(session.canonicalUsername, toRelPath);

  try {
    const res = await fetch(fromUrl, {
      method: 'COPY',
      headers: {
        ...authHeaders(session.loginName, session.password),
        Destination: destDavPath,
        Overwrite: 'T',
      },
    });

    if (res.ok || res.status === 201 || res.status === 204) {
      return { ok: true };
    }
    const errText = await res.text().catch(() => '');
    console.error(`[nc] copyItem failed (${res.status}):`, errText);
    return { ok: false, error: `Copy failed (HTTP ${res.status})` };
  } catch (err: any) {
    console.error('[nc] copyItem error:', err);
    return { ok: false, error: err.message || 'Network error copying item' };
  }
}

export async function renameItem(relPath: string, newName: string): Promise<{ ok: boolean; error?: string }> {
  const parts = relPath.split('/');
  parts[parts.length - 1] = newName;
  const newRelPath = parts.join('/');
  return moveItem(relPath, newRelPath);
}

export async function fetchBlob(relPath: string): Promise<string | null> {
  const session = loadSession();
  if (!session) return null;

  try {
    const res = await fetch(davUrl(session.canonicalUsername, relPath), {
      headers: authHeaders(session.loginName, session.password),
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export async function downloadFile(relPath: string, name: string): Promise<void> {
  const url = await fetchBlob(relPath);
  if (!url) return;
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function getStorageInfo(): Promise<{ used: number; total: number } | null> {
  const session = loadSession();
  if (!session) return null;

  try {
    const res = await fetch('/ocs/v2.php/cloud/user', {
      headers: {
        ...authHeaders(session.loginName, session.password),
        'OCS-APIRequest': 'true',
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const quota = json?.ocs?.data?.quota;
    return { used: quota?.used ?? 0, total: quota?.total ?? 0 };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Trashbin Operations (Native Nextcloud Recycle Bin)
// ---------------------------------------------------------------------------

export interface TrashItem {
  id: string;          // Trash item ID (e.g. "document.docx.d1787589290")
  name: string;        // Clean original name (e.g. "document.docx")
  size: number;
  sizeStr: string;
  deletedAt: Date;
  deletedAtStr: string;
  kind: FileKind;
  href: string;
}

export async function listTrash(): Promise<TrashItem[]> {
  const session = loadSession();
  if (!session) return [];

  const url = `/remote.php/dav/trashbin/${encodeURIComponent(session.canonicalUsername)}/trash/`;

  try {
    const res = await fetch(url, {
      method: 'PROPFIND',
      headers: {
        ...authHeaders(session.loginName, session.password),
        Depth: '1',
      },
      body: '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:getlastmodified/><d:getcontentlength/><d:getcontenttype/><d:resourcetype/></d:prop></d:propfind>',
    });

    if (!res.ok && res.status !== 207) {
      console.error(`[nc] listTrash error status: ${res.status}`);
      return [];
    }

    const xml = await res.text();
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const ns = 'DAV:';
    const responses = Array.from(doc.getElementsByTagNameNS(ns, 'response'));

    const items: TrashItem[] = [];
    const rootHref = `/remote.php/dav/trashbin/${session.canonicalUsername}/trash/`;
    const rootHrefEnc = `/remote.php/dav/trashbin/${encodeURIComponent(session.canonicalUsername)}/trash/`;

    for (const resp of responses) {
      const href = resp.getElementsByTagNameNS(ns, 'href')[0]?.textContent ?? '';
      if (!href || href === rootHref || href === rootHrefEnc || href.endsWith('/trash/')) {
        continue;
      }

      const rawId = decodeURIComponent(href.replace(rootHref, '').replace(rootHrefEnc, '').replace(/^\/+|\/+$/g, ''));
      if (!rawId) continue;

      // Extract original filename by stripping the .d<timestamp> suffix
      const cleanName = rawId.replace(/\.d\d+$/, '');
      const props = resp.querySelector('propstat > prop') ?? resp.getElementsByTagNameNS(ns, 'prop')[0];
      const mime = props?.getElementsByTagNameNS(ns, 'getcontenttype')[0]?.textContent ?? '';
      const sizeStr = props?.getElementsByTagNameNS(ns, 'getcontentlength')[0]?.textContent ?? '0';
      const size = parseInt(sizeStr, 10) || 0;
      const lastMod = props?.getElementsByTagNameNS(ns, 'getlastmodified')[0]?.textContent ?? '';
      const deletedAt = lastMod ? new Date(lastMod) : new Date();

      items.push({
        id: rawId,
        name: cleanName,
        size,
        sizeStr: formatSize(size, false),
        deletedAt,
        deletedAtStr: formatDate(deletedAt),
        kind: mimeToKind(mime, cleanName),
        href,
      });
    }

    // Sort newest deleted first
    items.sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());
    return items;
  } catch (err) {
    console.error('[nc] listTrash error:', err);
    return [];
  }
}

export async function restoreTrashItem(trashId: string): Promise<{ ok: boolean; error?: string }> {
  const session = loadSession();
  if (!session) return { ok: false, error: 'Not logged in' };

  const sourceUrl = `/remote.php/dav/trashbin/${encodeURIComponent(session.canonicalUsername)}/trash/${encodeURIComponent(trashId)}`;
  const destPath = `/remote.php/dav/trashbin/${encodeURIComponent(session.canonicalUsername)}/restore/${encodeURIComponent(trashId)}`;

  try {
    const res = await fetch(sourceUrl, {
      method: 'MOVE',
      headers: {
        ...authHeaders(session.loginName, session.password),
        Destination: destPath,
        Overwrite: 'T',
      },
    });

    if (res.ok || res.status === 201 || res.status === 204) {
      return { ok: true };
    }
    return { ok: false, error: `Restore failed (HTTP ${res.status})` };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error restoring item' };
  }
}

export async function deleteTrashItem(trashId: string): Promise<{ ok: boolean; error?: string }> {
  const session = loadSession();
  if (!session) return { ok: false, error: 'Not logged in' };

  const url = `/remote.php/dav/trashbin/${encodeURIComponent(session.canonicalUsername)}/trash/${encodeURIComponent(trashId)}`;

  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: authHeaders(session.loginName, session.password),
    });

    if (res.ok || res.status === 204 || res.status === 200) {
      return { ok: true };
    }
    return { ok: false, error: `Delete failed (HTTP ${res.status})` };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error permanently deleting item' };
  }
}

export async function emptyTrash(): Promise<{ ok: boolean; error?: string }> {
  const session = loadSession();
  if (!session) return { ok: false, error: 'Not logged in' };

  const url = `/remote.php/dav/trashbin/${encodeURIComponent(session.canonicalUsername)}/trash/`;

  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: authHeaders(session.loginName, session.password),
    });

    if (res.ok || res.status === 204 || res.status === 200) {
      return { ok: true };
    }
    return { ok: false, error: `Empty trash failed (HTTP ${res.status})` };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error emptying trash' };
  }
}

// ---------------------------------------------------------------------------
// OnlyOffice / Document Creation
// ---------------------------------------------------------------------------

/**
 * Creates a new document (.docx, .xlsx, .pptx, .md, .txt) with a valid template.
 */
export async function createOfficeDocument(
  filename: string,
  type: 'doc' | 'sheet' | 'slides' | 'text',
  folderPath = ''
): Promise<{ ok: boolean; relPath?: string; error?: string }> {
  let ext = '.docx';
  let mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  let content: Blob = new Blob([''], { type: mime });

  if (type === 'doc') {
    ext = '.docx';
    mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    try {
      const tmplRes = await fetch('/remote.php/dav/files/govindvaghasia/Valid%20Test%20Document.docx', {
        headers: authHeaders(loadSession()?.loginName || '', loadSession()?.password || ''),
      });
      if (tmplRes.ok) {
        content = await tmplRes.blob();
      }
    } catch { /* fallback */ }
  } else if (type === 'sheet') {
    ext = '.xlsx';
    mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  } else if (type === 'slides') {
    ext = '.pptx';
    mime = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  } else if (type === 'text') {
    ext = '.md';
    mime = 'text/markdown';
    content = new Blob([`# ${filename}\n\nCreated in Govind Drive.\n`], { type: mime });
  }

  const cleanName = filename.endsWith(ext) ? filename : `${filename}${ext}`;
  const destRelPath = folderPath ? `${folderPath}/${cleanName}` : cleanName;

  const res = await uploadFile(content, destRelPath);
  if (res.ok) {
    return { ok: true, relPath: destRelPath };
  }
  return { ok: false, error: res.error };
}

/**
 * Direct OnlyOffice URL for Nextcloud 34.
 */
export function getOnlyOfficeUrl(fileId?: string, relPath?: string): string {
  if (fileId) {
    return `${NC_HOST}/apps/files/files/${fileId}?openfile=true`;
  }
  if (relPath) {
    return `${NC_HOST}/apps/files/files?dir=/${encodeURIComponent(relPath.split('/').slice(0, -1).join('/'))}&openfile=true`;
  }
  return `${NC_HOST}/apps/files/`;
}

/**
 * Returns the avatar image URL for a Nextcloud user.
 */
export function getUserAvatarUrl(username: string, size = 128): string {
  return `/index.php/avatar/${encodeURIComponent(username)}/${size}`;
}

// ---------------------------------------------------------------------------
// Nextcloud Activity Feed (OCS Activity API)
// ---------------------------------------------------------------------------

export interface ActivityItem {
  id: number;
  app: string;
  type: string;
  user: string;
  subject: string;
  message?: string;
  file?: string;
  link?: string;
  datetime: Date;
  datetimeStr: string;
}

export async function listActivities(limit = 30): Promise<ActivityItem[]> {
  const session = loadSession();
  if (!session) return [];

  const url = `/ocs/v2.php/apps/activity/api/v2/activity/filter?format=json&limit=${limit}&since=0`;

  try {
    const res = await fetch(url, {
      headers: {
        ...authHeaders(session.loginName, session.password),
        'OCS-APIRequest': 'true',
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      console.warn(`[nc] listActivities status: ${res.status}`);
      return [];
    }

    const json = await res.json();
    const data = json?.ocs?.data;
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => {
      const dt = item.datetime ? new Date(item.datetime) : new Date();
      return {
        id: item.activity_id || Math.random(),
        app: item.app || 'files',
        type: item.type || 'file_changed',
        user: item.user || session.canonicalUsername,
        subject: item.subject_rich?.[0] || item.subject || 'Activity on drive',
        message: item.message || '',
        file: item.file || item.filename || undefined,
        link: item.link || undefined,
        datetime: dt,
        datetimeStr: formatDate(dt),
      };
    });
  } catch (err) {
    console.error('[nc] listActivities error:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Nextcloud Sharing (OCS File Sharing API)
// ---------------------------------------------------------------------------

export interface ShareItem {
  id: string;
  shareType: number; // 0=user, 1=group, 3=public link
  shareWith?: string;
  shareWithDisplayname?: string;
  path: string;
  token?: string;
  url?: string;
  hasPassword: boolean;
  expiration?: string;
  permissions: number;
}

export async function listSharesForPath(relPath: string): Promise<ShareItem[]> {
  const session = loadSession();
  if (!session) return [];

  const formattedPath = relPath.startsWith('/') ? relPath : `/${relPath}`;
  const url = `/ocs/v2.php/apps/files_sharing/api/v1/shares?format=json&path=${encodeURIComponent(formattedPath)}&reshares=true&subfiles=true`;

  try {
    const res = await fetch(url, {
      headers: {
        ...authHeaders(session.loginName, session.password),
        'OCS-APIRequest': 'true',
        Accept: 'application/json',
      },
    });

    if (!res.ok) return [];

    const json = await res.json();
    const data = json?.ocs?.data;
    if (!Array.isArray(data)) return [];

    return data.map((s: any) => ({
      id: String(s.id),
      shareType: Number(s.share_type),
      shareWith: s.share_with,
      shareWithDisplayname: s.share_with_displayname,
      path: s.path,
      token: s.token,
      url: s.url || (s.token ? `${NC_HOST}/s/${s.token}` : undefined),
      hasPassword: Boolean(s.has_password || (s.share_type === 3 && s.password)),
      expiration: s.expiration,
      permissions: Number(s.permissions),
    }));
  } catch (err) {
    console.error('[nc] listSharesForPath error:', err);
    return [];
  }
}

export async function createPublicShare(
  relPath: string,
  options: { password?: string; expireDate?: string; permissions?: number } = {}
): Promise<{ ok: boolean; share?: ShareItem; error?: string }> {
  const session = loadSession();
  if (!session) return { ok: false, error: 'Not logged in' };

  const formattedPath = relPath.startsWith('/') ? relPath : `/${relPath}`;
  const params = new URLSearchParams();
  params.append('path', formattedPath);
  params.append('shareType', '3'); // 3 = public link
  if (options.permissions) params.append('permissions', String(options.permissions));
  if (options.password) params.append('password', options.password);
  if (options.expireDate) params.append('expireDate', options.expireDate);

  try {
    const res = await fetch('/ocs/v2.php/apps/files_sharing/api/v1/shares?format=json', {
      method: 'POST',
      headers: {
        ...authHeaders(session.loginName, session.password),
        'OCS-APIRequest': 'true',
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: params.toString(),
    });

    const json = await res.json();
    const statusCode = json?.ocs?.meta?.statuscode;
    const data = json?.ocs?.data;

    if ((res.ok || statusCode === 200 || statusCode === 100) && data) {
      return {
        ok: true,
        share: {
          id: String(data.id),
          shareType: 3,
          path: data.path,
          token: data.token,
          url: data.url || (data.token ? `${NC_HOST}/s/${data.token}` : undefined),
          hasPassword: Boolean(data.has_password || options.password),
          expiration: data.expiration,
          permissions: Number(data.permissions),
        },
      };
    }

    const message = json?.ocs?.meta?.message || `Failed to create share link (HTTP ${res.status})`;
    return { ok: false, error: message };
  } catch (err: any) {
    console.error('[nc] createPublicShare error:', err);
    return { ok: false, error: err.message || 'Network error creating share link' };
  }
}

export async function createUserShare(
  relPath: string,
  shareWith: string,
  permissions = 31
): Promise<{ ok: boolean; share?: ShareItem; error?: string }> {
  const session = loadSession();
  if (!session) return { ok: false, error: 'Not logged in' };

  const formattedPath = relPath.startsWith('/') ? relPath : `/${relPath}`;
  const params = new URLSearchParams();
  params.append('path', formattedPath);
  params.append('shareType', '0'); // 0 = user
  params.append('shareWith', shareWith.trim());
  params.append('permissions', String(permissions));

  try {
    const res = await fetch('/ocs/v2.php/apps/files_sharing/api/v1/shares?format=json', {
      method: 'POST',
      headers: {
        ...authHeaders(session.loginName, session.password),
        'OCS-APIRequest': 'true',
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: params.toString(),
    });

    const json = await res.json();
    const statusCode = json?.ocs?.meta?.statuscode;
    const data = json?.ocs?.data;

    if ((res.ok || statusCode === 200 || statusCode === 100) && data) {
      return {
        ok: true,
        share: {
          id: String(data.id),
          shareType: 0,
          shareWith: data.share_with,
          shareWithDisplayname: data.share_with_displayname,
          path: data.path,
          hasPassword: false,
          permissions: Number(data.permissions),
        },
      };
    }

    const message = json?.ocs?.meta?.message || `Failed to share with user (HTTP ${res.status})`;
    return { ok: false, error: message };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error sharing with user' };
  }
}

export interface ShareeItem {
  value: {
    shareType: number;
    shareWith: string;
  };
  label: string;
}

export async function searchSharees(query = ''): Promise<ShareeItem[]> {
  const session = loadSession();
  if (!session) return [];

  const url = `/ocs/v1.php/apps/files_sharing/api/v1/sharees?format=json&search=${encodeURIComponent(query)}&itemType=file&perPage=50`;

  try {
    const res = await fetch(url, {
      headers: {
        ...authHeaders(session.loginName, session.password),
        'OCS-APIRequest': 'true',
        Accept: 'application/json',
      },
    });

    if (!res.ok) return [];
    const json = await res.json();
    const exact = json?.ocs?.data?.exact?.users || [];
    const users = json?.ocs?.data?.users || [];
    const groups = json?.ocs?.data?.groups || [];

    const all = [...exact, ...users, ...groups];
    return all.map((item: any) => ({
      value: {
        shareType: item.value?.shareType ?? 0,
        shareWith: item.value?.shareWith ?? item.label,
      },
      label: item.label,
    }));
  } catch (err) {
    console.error('[nc] searchSharees error:', err);
    return [];
  }
}

export async function deleteShare(shareId: string): Promise<{ ok: boolean; error?: string }> {
  const session = loadSession();
  if (!session) return { ok: false, error: 'Not logged in' };

  try {
    const res = await fetch(`/ocs/v2.php/apps/files_sharing/api/v1/shares/${encodeURIComponent(shareId)}?format=json`, {
      method: 'DELETE',
      headers: {
        ...authHeaders(session.loginName, session.password),
        'OCS-APIRequest': 'true',
        Accept: 'application/json',
      },
    });

    if (res.ok || res.status === 204) {
      return { ok: true };
    }
    return { ok: false, error: `Failed to remove share (HTTP ${res.status})` };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error deleting share' };
  }
}

export async function listSharedWithMe(): Promise<FileItem[]> {
  const session = loadSession();
  if (!session) return [];

  const url = '/ocs/v2.php/apps/files_sharing/api/v1/shares?format=json&shared_with_me=true';

  try {
    const res = await fetch(url, {
      headers: {
        ...authHeaders(session.loginName, session.password),
        'OCS-APIRequest': 'true',
        Accept: 'application/json',
      },
    });

    if (!res.ok) return [];

    const json = await res.json();
    const data = json?.ocs?.data;
    if (!Array.isArray(data)) return [];

    return data.map((s: any) => {
      const isDir = s.item_type === 'folder';
      const name = s.file_target ? s.file_target.replace(/^\/+/, '') : s.path.split('/').pop() || s.path;
      const size = Number(s.file_size) || 0;
      const mime = s.mimetype || (isDir ? '' : 'application/octet-stream');
      const stime = s.stime ? new Date(s.stime * 1000) : new Date();

      return {
        id: `share_${s.id}`,
        fileId: String(s.item_source || s.file_source || ''),
        name,
        relPath: s.file_target ? s.file_target.replace(/^\/+/, '') : name,
        isDir,
        mimeType: mime,
        size,
        sizeStr: formatSize(size, isDir),
        modified: stime,
        modifiedStr: formatDate(stime),
        kind: isDir ? 'folder' : mimeToKind(mime, name),
      };
    });
  } catch (err) {
    console.error('[nc] listSharedWithMe error:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// User Provisioning API (Phase 4.7)
// ---------------------------------------------------------------------------
export interface NCProvisionedUser {
  id: string;
  displayName: string;
  email: string;
  quota: string;
  enabled: boolean;
}

export async function listNCUsers(): Promise<NCProvisionedUser[]> {
  const session = loadSession();
  if (!session || !session.user.isAdmin) return [];

  try {
    const res = await fetch('/ocs/v1.php/cloud/users?format=json', {
      headers: {
        ...authHeaders(session.loginName, session.password),
        Accept: 'application/json',
      },
    });

    if (!res.ok) return [];
    const json = await res.json();
    const userIds = json?.ocs?.data?.users;
    if (!Array.isArray(userIds)) return [];

    return userIds.map((uid: string) => ({
      id: uid,
      displayName: uid,
      email: '',
      quota: 'Default',
      enabled: true,
    }));
  } catch (err) {
    console.error('[nc] listNCUsers error:', err);
    return [];
  }
}

export async function createNCUser(data: {
  userid: string;
  password?: string;
  displayName?: string;
  email?: string;
  quota?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const session = loadSession();
  if (!session || !session.user.isAdmin) return { ok: false, error: 'Unauthorized' };

  const params = new URLSearchParams();
  params.append('userid', data.userid);
  if (data.password) params.append('password', data.password);
  if (data.displayName) params.append('displayName', data.displayName);
  if (data.email) params.append('email', data.email);
  if (data.quota) params.append('quota', data.quota);

  try {
    const res = await fetch('/ocs/v1.php/cloud/users?format=json', {
      method: 'POST',
      headers: {
        ...authHeaders(session.loginName, session.password),
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: params.toString(),
    });

    const json = await res.json();
    const code = json?.ocs?.meta?.statuscode;
    if (res.ok || code === 100 || code === 200) {
      return { ok: true };
    }
    return { ok: false, error: json?.ocs?.meta?.message || `Failed to create user (HTTP ${res.status})` };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error creating user' };
  }
}

export async function deleteNCUser(userid: string): Promise<{ ok: boolean; error?: string }> {
  const session = loadSession();
  if (!session || !session.user.isAdmin) return { ok: false, error: 'Unauthorized' };

  try {
    const res = await fetch(`/ocs/v1.php/cloud/users/${encodeURIComponent(userid)}?format=json`, {
      method: 'DELETE',
      headers: {
        ...authHeaders(session.loginName, session.password),
        Accept: 'application/json',
      },
    });

    if (res.ok) return { ok: true };
    const json = await res.json().catch(() => null);
    return { ok: false, error: json?.ocs?.meta?.message || `Failed to delete user (HTTP ${res.status})` };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error deleting user' };
  }
}

