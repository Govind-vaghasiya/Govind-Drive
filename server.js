import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Restrict CORS to the known frontend origin only
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, same-origin) or from the allowed origin
    if (!origin || origin === ALLOWED_ORIGIN) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  methods: ['GET', 'POST'],
}));

// HTTP security headers (X-Frame-Options, X-XSS-Protection, HSTS, etc.)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-site' },
  contentSecurityPolicy: false, // Managed separately on the React side
}));

// Rate limiter — max 30 write operations per minute per IP
// Prevents brute-force attacks on the config and upload endpoints
const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});

app.use(express.json());

// Configuration file to store host storage directory path
const CONFIG_FILE = path.join(__dirname, 'storage_config.json');

function getStorageRoot() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      if (data.storageRoot && fs.existsSync(data.storageRoot)) {
        return data.storageRoot;
      }
    } catch (e) {
      console.error('Error reading config file:', e);
    }
  }
  // Default to user's GovindServer folder as seen in Finder
  const defaultDir = '/Users/chromakey/Desktop/GovindServer';
  if (!fs.existsSync(defaultDir)) {
    fs.mkdirSync(defaultDir, { recursive: true });
  }
  return defaultDir;
}

function setStorageRoot(newPath) {
  if (!fs.existsSync(newPath)) {
    fs.mkdirSync(newPath, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ storageRoot: newPath }, null, 2));
  return newPath;
}

/**
 * Return the list of admin userIds from storage_config.json.
 * Defaults to ['admin_govind_home'] if not configured.
 */
function getAdminUsers() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      if (Array.isArray(data.adminUsers)) return data.adminUsers;
    } catch {}
  }
  return ['admin_govind_home'];
}

/** Returns true if the given userId is in the admin list */
function isAdminUser(userId) {
  return getAdminUsers().includes(String(userId || ''));
}

function getUserStorageRoot(req) {
  const root = getStorageRoot();
  // Prefer query param (more reliable through CORS/multipart) then header
  const rawUser = req.query.userId || req.headers['x-user-id'] || (req.body && req.body.userId) || 'admin_govind_home';
  const cleanFolder = String(rawUser).toLowerCase().replace(/[^a-z0-9_@.-]/g, '_').replace(/[@.]/g, '_');
  const userDir = path.join(root, cleanFolder);

  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
    console.log(`📁 Created user folder: ${userDir}`);
  }

  return userDir;
}

// Multer storage engine saving directly to real disk location per user
const storageEngine = multer.diskStorage({
  destination: (req, file, cb) => {
    const subpath = req.query.subpath ? String(req.query.subpath) : '';
    const root = getUserStorageRoot(req);
    
    // Support nested folder paths in originalname (e.g., "09/IMG_1311.JPG")
    const relFile = file.originalname;
    const relDir = path.dirname(relFile);

    const targetDir = relDir && relDir !== '.'
      ? path.join(root, subpath, relDir)
      : path.join(root, subpath);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    cb(null, path.basename(file.originalname));
  },
});

// Main upload multer — handles small files (≤ CHUNK_SIZE), 60 MB hard cap
const upload = multer({ storage: storageEngine, limits: { fileSize: 60 * 1024 * 1024 } });

// --- Chunked upload support ---
// Each chunk is saved as .chunks/<uploadId>/chunk_000000 inside the user's storage root
const chunkStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Sanitize uploadId — strip anything that could escape the .chunks directory
    const rawId = String(req.query.uploadId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
    const root = getUserStorageRoot(req);
    const chunkDir = path.join(root, '.chunks', rawId);
    // Directory traversal guard
    if (!chunkDir.startsWith(root)) return cb(new Error('Access denied'), '');
    fs.mkdirSync(chunkDir, { recursive: true });
    cb(null, chunkDir);
  },
  filename: (req, file, cb) => {
    const idx = String(req.query.chunkIndex || '0').padStart(6, '0');
    cb(null, `chunk_${idx}`);
  },
});

const uploadOneChunk = multer({
  storage: chunkStorage,
  limits: { fileSize: 60 * 1024 * 1024 }, // 60 MB hard cap per chunk
});

// ----------------------------------------------------
// API ROUTES — DIRECT DISK FILE SYSTEM SYNC
// ----------------------------------------------------

// 1. Get current storage root path
app.get('/api/config', (req, res) => {
  res.json({ storageRoot: getStorageRoot() });
});

// 2. Set new storage root path — ADMIN ONLY
app.post('/api/config', writeLimiter, (req, res) => {
  const requestingUser = req.query.userId || req.headers['x-user-id'];
  if (!isAdminUser(requestingUser)) {
    return res.status(403).json({ error: 'Admin access required to change storage configuration' });
  }
  const { storageRoot } = req.body;
  if (!storageRoot) {
    return res.status(400).json({ error: 'storageRoot path required' });
  }
  try {
    const updated = setStorageRoot(storageRoot);
    res.json({ success: true, storageRoot: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2b. Explicit user directory initialization on user creation — ADMIN ONLY
app.post('/api/create-user-folder', writeLimiter, (req, res) => {
  const requestingUser = req.query.userId || req.headers['x-user-id'] || req.body?.requestingUserId;
  if (!isAdminUser(requestingUser)) {
    return res.status(403).json({ error: 'Admin access required to create user folders' });
  }
  const { userEmail, folderKey } = req.body;
  if (!userEmail) return res.status(400).json({ error: 'userEmail required' });
  const root = getStorageRoot();
  const cleanFolder = folderKey
    ? String(folderKey).toLowerCase().replace(/[^a-z0-9_-]/g, '_')
    : String(userEmail).toLowerCase().replace(/[^a-z0-9_@.-]/g, '_').replace(/[@.]/g, '_');
  const userDir = path.join(root, cleanFolder);
  // Traversal guard — folder must stay inside storage root
  if (!userDir.startsWith(root)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
    console.log(`📁 Created user folder: ${userDir}`);
  }
  res.json({ success: true, folderName: cleanFolder, path: userDir });
});

// 3. List items directly from real directory on disk per user
app.get('/api/files', async (req, res) => {
  try {
    const subpath = req.query.subpath ? String(req.query.subpath) : '';
    const root = getUserStorageRoot(req);
    const targetDir = path.normalize(path.join(root, subpath));

    // Security check to prevent directory traversal
    if (!targetDir.startsWith(root)) {
      return res.status(403).json({ error: 'Access denied outside storage root' });
    }

    if (!fs.existsSync(targetDir)) {
      return res.json({ items: [] });
    }

    const entries = await fs.promises.readdir(targetDir, { withFileTypes: true });
    const items = await Promise.all(
      entries
        .filter((entry) => !entry.name.startsWith('.')) // hide hidden files
        .map(async (entry) => {
          const itemPath = path.join(targetDir, entry.name);
          let stat;
          try {
            stat = await fs.promises.stat(itemPath);
          } catch {
            return null;
          }

          const isDir = entry.isDirectory();
          let kind = isDir ? 'folder' : 'doc';
          if (!isDir) {
            const ext = path.extname(entry.name).toLowerCase();
            if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'].includes(ext)) kind = 'image';
            else if (['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) kind = 'video';
            else if (['.mp3', '.wav', '.flac'].includes(ext)) kind = 'audio';
            else if (ext === '.pdf') kind = 'pdf';
            else if (['.xlsx', '.csv', '.xls'].includes(ext)) kind = 'sheet';
            else if (['.pptx', '.ppt'].includes(ext)) kind = 'slides';
            else if (['.zip', '.tar', '.gz', '.rar', '.dmg'].includes(ext)) kind = 'archive';
          }

          let childCount = 0;
          if (isDir) {
            try {
              const children = await fs.promises.readdir(itemPath);
              childCount = children.filter((c) => !c.startsWith('.')).length;
            } catch {}
          }

          const sizeFormatted = isDir
            ? '—'
            : stat.size > 1024 * 1024
            ? `${(stat.size / (1024 * 1024)).toFixed(1)} MB`
            : `${Math.round(stat.size / 1024)} KB`;

          return {
            id: Buffer.from(path.relative(root, itemPath)).toString('base64'),
            name: entry.name,
            kind,
            size: sizeFormatted,
            sizeBytes: stat.size,
            modified: new Date(stat.mtime).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
            modifiedRaw: stat.mtimeMs,
            childCount,
            relPath: path.relative(root, itemPath),
            isDir,
          };
        })
    );

    res.json({ items: items.filter(Boolean), storageRoot: root, subpath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Create real physical directory on disk per user
app.post('/api/mkdir', async (req, res) => {
  try {
    const { subpath, name } = req.body;
    const root = getUserStorageRoot(req);
    const targetDir = path.join(root, subpath || '', name);
    await fs.promises.mkdir(targetDir, { recursive: true });
    res.json({ success: true, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Upload real file directly to disk directory (preserving folder tree structure)
app.post('/api/upload', upload.array('files'), (req, res) => {
  if (req.body.paths && Array.isArray(req.files)) {
    const paths = Array.isArray(req.body.paths) ? req.body.paths : [req.body.paths];
    const root = getUserStorageRoot(req);
    const subpath = req.query.subpath ? String(req.query.subpath) : '';

    req.files.forEach((file, idx) => {
      const relPath = paths[idx];
      if (relPath && relPath.includes('/')) {
        const destPath = path.join(root, subpath, relPath);
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        if (file.path !== destPath && fs.existsSync(file.path)) {
          try {
            fs.renameSync(file.path, destPath);
          } catch (e) {
            console.error('File relocation error:', e);
          }
        }
      }
    });
  }

  res.json({ success: true, files: req.files ? req.files.map((f) => f.originalname) : [] });
});

// 5b. Receive one chunk of a large file
// Query params: uploadId, chunkIndex, subpath, userId
// Body: multipart with field name 'chunk'
app.post('/api/upload-chunk', uploadOneChunk.single('chunk'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No chunk received' });
  }
  res.json({
    success: true,
    chunkIndex: req.query.chunkIndex,
    uploadId: req.query.uploadId,
    size: req.file.size,
  });
});

// 5c. Finalize chunked upload — assemble all parts into the final file
// Body JSON: { uploadId, fileName, totalChunks, relPath, subpath }
app.post('/api/upload-finalize', async (req, res) => {
  try {
    const { uploadId, fileName, totalChunks, subpath, relPath } = req.body;
    if (!uploadId || !fileName || !totalChunks) {
      return res.status(400).json({ error: 'uploadId, fileName and totalChunks are required' });
    }

    const root = getUserStorageRoot(req);
    // Sanitize uploadId before using it as a path component
    const safeUploadId = String(uploadId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const chunkDir = path.join(root, '.chunks', safeUploadId);

    // Directory traversal guard on chunk directory
    if (!chunkDir.startsWith(root)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(chunkDir)) {
      return res.status(400).json({ error: 'Chunk directory not found — upload may have expired' });
    }

    // Determine final destination path (preserves nested folder structure)
    // Use basename() on fileName to prevent path injection via the filename itself
    const safeFileName = path.basename(relPath || fileName);
    const fileRelPath = safeFileName;
    const relDir = path.dirname(fileRelPath);
    const targetDir =
      relDir && relDir !== '.'
        ? path.join(root, subpath || '', relDir)
        : path.join(root, subpath || '');

    await fs.promises.mkdir(targetDir, { recursive: true });
    const finalPath = path.join(targetDir, path.basename(fileRelPath));

    // Directory traversal guard on final output path
    if (!finalPath.startsWith(root)) {
      return res.status(403).json({ error: 'Access denied outside storage root' });
    }

    // Stream all chunks sequentially into the final file
    const writeStream = fs.createWriteStream(finalPath);
    const count = parseInt(String(totalChunks), 10);

    for (let i = 0; i < count; i++) {
      const chunkPath = path.join(chunkDir, `chunk_${String(i).padStart(6, '0')}`);
      if (!fs.existsSync(chunkPath)) {
        writeStream.destroy();
        return res.status(400).json({ error: `Missing chunk ${i}` });
      }
      await new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(chunkPath);
        readStream.pipe(writeStream, { end: false });
        readStream.on('end', resolve);
        readStream.on('error', reject);
      });
    }

    // Close the write stream
    await new Promise((resolve, reject) => {
      writeStream.end();
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    // Clean up temp chunk directory
    await fs.promises.rm(chunkDir, { recursive: true, force: true });

    console.log(`✅ Assembled chunked upload: ${fileName} (${count} chunks) → ${finalPath}`);
    res.json({ success: true, fileName });
  } catch (err) {
    console.error('Finalize error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 6. Rename or Move real file or folder on disk per user
app.post('/api/rename', async (req, res) => {
  try {
    const { relPath, newName, targetDir } = req.body;
    const root = getUserStorageRoot(req);
    const oldFullPath = path.join(root, relPath);
    
    let newFullPath;
    if (targetDir !== undefined) {
      newFullPath = path.join(root, targetDir, path.basename(oldFullPath));
    } else {
      newFullPath = path.join(path.dirname(oldFullPath), newName);
    }

    await fs.promises.rename(oldFullPath, newFullPath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Delete real file or folder on disk per user
app.post('/api/delete', async (req, res) => {
  try {
    const { relPath } = req.body;
    const root = getUserStorageRoot(req);
    const fullPath = path.join(root, relPath);
    await fs.promises.rm(fullPath, { recursive: true, force: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Stream/Download real file per user
app.get('/api/download', (req, res) => {
  const relPath = req.query.path ? String(req.query.path) : '';
  const root = getUserStorageRoot(req);
  const fullPath = path.join(root, relPath);
  if (!fs.existsSync(fullPath)) {
    return res.status(404).send('File not found');
  }
  
  if (req.query.inline === 'true') {
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(fullPath);
  } else {
    res.download(fullPath);
  }
});

// Bind to localhost only — port 3001 must NEVER be exposed to the internet.
// Cloudflare Tunnel should point to port 5173 (Vite/serve), not port 3001.
const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 Govind Drive Real File System Server running at http://127.0.0.1:${PORT} (localhost only)`);
  console.log(`📁 Active Host Storage Root: ${getStorageRoot()}`);
  console.log(`🛡️  Admin users: ${getAdminUsers().join(', ')}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`ℹ️ Govind Drive Server port ${PORT} is already active.`);
  } else {
    console.error('Server error:', err);
  }
});

