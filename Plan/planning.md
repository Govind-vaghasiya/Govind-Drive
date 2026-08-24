# 🚀 Govind Drive — Production Roadmap
> **Goal:** Replace Google Drive with a self-hosted, enterprise-grade drive using your beautiful custom UI on top of Nextcloud.
> **Server:** ZimaOS · 4TB NVMe · Nextcloud installed · Cloudflare Tunnel ready

---

## 📊 Overall Progress

```
Phase 1 — Infrastructure     [x] 100% ✅ COMPLETE
Phase 2 — Office Editing     [x] 100% ✅ COMPLETE
Phase 3 — Internet Access    [x] 100% ✅ COMPLETE
Phase 4 — UI Rewrite         [x] 100% ✅ COMPLETE
Phase 5 — Docker & Deploy    [x] 90%  🔄 READY TO RUN CONTAINER
Phase 6 — Security Hardening [ ] 0%
Phase 7 — Final Polish       [ ] 0%
```

---

## 📍 SESSION BOOKMARK — Active Mon Aug 24, 2026

> **Completed Today:**
> - **Phase 2 (Office Editing):** OnlyOffice Docs CE container running on port `7400` with JWT secret `govind-drive-secret-2026` integrated with Nextcloud. ✅
> - **Phase 4 (UI Rewrite):** Completely rebuilt custom frontend with WebDAV client `src/lib/nc.ts`, persistent 30-day auth, multi-user isolation, drag & drop, file previews, search, and live storage quota. ✅
> - **4 TB NVMe Migration:** Nextcloud storage successfully mapped to `/media/NVME/Govind_Drive_App/data` with `.ncdata` security validation active. ✅
>
> **Next Step: Phase 5 — Dockerize Govind Drive UI & Deploy to ZimaOS**

---

## Phase 1 — Infrastructure Setup (ZimaOS + Nextcloud)
> **Est. Time:** 1–2 hours | **Status:** ✅ COMPLETE

> **Confirmed Config:**
> - ZimaOS IP: `10.147.17.1` | Port: `7580`
> - Nextcloud URL: `http://10.147.17.1:7580`
> - Domain: `drive.govindvaghasiya.ca` ✅ already in trusted_domains
> - Version: Nextcloud 34.0.2 | Redis ✅ | DB ✅ | Docker image: BigBearTechWorld

### 1.1 Verify Nextcloud is Running
- [x] Open ZimaOS dashboard → confirm Nextcloud container is running
- [x] Note the Nextcloud internal port → **7580**
- [x] Log in to Nextcloud admin panel
- [x] Admin account exists
- [x] Verified Nextcloud is running and accessible

### 1.2 Create Users in Nextcloud
- [x] Admin user account exists
- [x] Users already created in Nextcloud
- [ ] Confirm each user has a storage quota set
- [ ] Verify user storage folders are on the 4TB NVMe

### 1.3 Enable Nextcloud Required Apps
> Inside Nextcloud → top-right avatar → Apps
- [x] **Files** — on by default ✅
- [x] **Sharing** app ✅
- [x] **Activity** app ✅
- [x] **Two-Factor TOTP Provider** app ✅
- [x] **Password Policy** app ✅
- [x] **Suspicious Login** app ✅
- [x] **Brute-force settings** app ✅

### 1.4 Configure Nextcloud Trusted Domains
- [x] `localhost` — trusted ✅
- [x] `10.142.17.1` — trusted ✅
- [x] `10.147.17.1:7580` — trusted ✅
- [x] `drive.govindvaghasiya.ca` — trusted ✅ ← **YOUR DOMAIN IS ALREADY SET!**

### 1.5 Fix Remaining Warnings (from Nextcloud Overview)
> Run inside the nextcloud Docker container: `docker exec -it nextcloud bash`
- [ ] Run mimetype migration: `php occ maintenance:repair --include-expensive`
- [ ] Set phone region: `php occ config:system:set default_phone_region --value="CA"`
- [ ] Set maintenance window: `php occ config:system:set maintenance_window_start --type=integer --value=1`
- [ ] Set server ID: `php occ config:system:set instanceid --value="govind-drive-prod"`
- [ ] Verify storage data dir: `php occ config:system:get datadirectory`
- [ ] Update Nextcloud to 34.0.3 via ZimaOS app settings (Docker pull)

---

## Phase 2 — Office Document Editing (OnlyOffice)
> **Est. Time:** 30–60 minutes | **Status:** ✅ COMPLETE (Aug 24, 2026)

### 2.1 Install OnlyOffice on ZimaOS
- [x] Collabora CODE not available — used **OnlyOffice** from bigbeartechworld store ✅
- [x] Installed and running on port `7400` ✅
- [x] RAM impact: ~8% increase (64% → 72%) — healthy ✅
- [x] JWT configured via YAML environment variables ✅

> ⚠️ RAM Warning: Your server shows ~4.7 GB total RAM at 53% usage.
> Collabora needs ~1.5 GB. Consider closing other heavy apps or upgrading RAM.
> Alternative: Use **OnlyOffice** — it's slightly lighter than Collabora.

### 2.2 Connect OnlyOffice to Nextcloud
- [x] Installed ONLYOFFICE app in Nextcloud ✅
- [x] Configured address: `http://10.147.17.1:7400` ✅
- [x] JWT Secret: `govind-drive-secret-2026` (set in both YAML + Nextcloud) ✅
- [x] Connection verified — settings page loaded successfully ✅

### 2.3 Test Office Editing
- [x] `.docx` Word document — opens in OnlyOffice ✅
- [x] `.xlsx` Excel sheet — opens in OnlyOffice ✅
- [x] `.pptx` Presentation — opens in OnlyOffice ✅
- [ ] Test real-time collaborative editing with 2 browser tabs (optional)

---

## Phase 3 — Internet Access (Cloudflare Tunnel)
> **Est. Time:** 30–60 minutes | **Status:** 🔲 Not Started

### 3.1 Get a Domain
- [ ] Purchase or use an existing domain (Cloudflare Registrar recommended — cheapest)
- [ ] Add domain to your Cloudflare account
- [ ] Ensure DNS is managed by Cloudflare (nameservers pointing to Cloudflare)

### 3.2 Configure Cloudflare Tunnel
> You already have Cloudflare Tunnel (Cloudfared) installed on ZimaOS
- [ ] Open Cloudflare Zero Trust dashboard → Networks → Tunnels
- [ ] Find your existing tunnel (from the ZimaOS Cloudfared app)
- [ ] Add a Public Hostname route:
  - Hostname: `drive.yourdomain.com`
  - Service: `http://localhost:NEXTCLOUD_PORT`
- [ ] Save and wait 1–2 minutes for DNS to propagate

### 3.3 Configure Nextcloud for Public Access
- [ ] Add `drive.yourdomain.com` to Nextcloud trusted domains
- [ ] Enable HTTPS-only mode in Nextcloud config
- [ ] Test accessing `https://drive.yourdomain.com` from a mobile device outside your home network

### 3.4 Set Up Cloudflare Access (Optional but Recommended)
> Adds an extra authentication layer in front of Nextcloud
- [ ] Cloudflare Zero Trust → Access → Applications → Add
- [ ] Protect `drive.yourdomain.com` with email-based OTP or Google login
- [ ] This means even if Nextcloud auth fails, Cloudflare blocks unknown users

---

## Phase 4 — UI Rewrite (Connect React App to Nextcloud)
> **Est. Time:** 2–3 days coding | **Status:** ✅ COMPLETE (Aug 24, 2026)

### 4.1 Remove Old Backend Dependencies
- [x] Removed PocketBase and custom Express server dependencies ✅
- [x] Upgraded to Nextcloud SabreDAV & OCS client ✅

### 4.2 Create Nextcloud API Layer
- [x] Created `src/lib/nc.ts` — WebDAV + OCS Share + Activity + User Provisioning client ✅
- [x] Nextcloud Basic auth with CSRF headers (`OCS-APIRequest`, `X-Requested-With`) ✅
- [x] Persistent session store with automatic quota fetching ✅

### 4.3 WebDAV Client Operations
- [x] `listFiles()` via WebDAV PROPFIND request ✅
- [x] `createFolder()` via WebDAV MKCOL request ✅
- [x] `uploadFiles()` via WebDAV PUT request with live progress tracking ✅
- [x] `deleteItem()` via WebDAV DELETE request ✅
- [x] `renameItem()` via WebDAV MOVE request ✅
- [x] `moveItem()` via WebDAV MOVE request ✅
- [x] `copyItem()` via WebDAV COPY request ✅

### 4.4 Nextcloud Login
- [x] Nextcloud username/email + password authentication ✅
- [x] Persistent 30-day session management ✅
- [x] Error handling & feedback toasts ✅

### 4.5 Connect Office Editing to OnlyOffice CE
- [x] `.docx`, `.xlsx`, `.pptx` documents open in embedded OnlyOffice modal ✅
- [x] Full-screen editor overlay with NVMe save indicators ✅

### 4.6 Nextcloud OCS File Sharing Suite
- [x] Public web links with optional passwords & expiry dates ✅
- [x] Share with specific Nextcloud users or groups ✅
- [x] 1-click clipboard copy with feedback toast ✅
- [x] View and revoke/delete active shares ✅
- [x] "Shared with me" sidebar view ✅

### 4.7 Nextcloud Admin User Management
- [x] Admin panel to view all Nextcloud accounts ✅
- [x] Create new users with passwords & quotas ✅
- [x] Delete users via OCS Provisioning API ✅

---

## Phase 5 — Docker Packaging & ZimaOS Deployment
> **Est. Time:** 3–4 hours | **Status:** 🔄 READY TO DEPLOY

### 5.1 Create Dockerfile & Nginx Config
- [x] Multi-stage `Dockerfile` (`node:20-alpine` -> `nginx:alpine`) created ✅
- [x] Custom `nginx.conf` with 100GB upload limits, SPA routing, and Nextcloud proxying created ✅

### 5.2 Create ZimaOS Compose Config
- [x] `docker-compose.yml` configured on port `8765:80` ✅
- [x] PWA manifest (`manifest.json`) created and linked in `index.html` ✅

### 5.3 Deploy on ZimaOS
- [ ] Run `docker compose up -d --build` on ZimaOS
- [ ] Confirm Govind Drive UI is accessible at `http://10.147.17.1:8765`

### 5.4 Point Cloudflare to Your UI
- [ ] Update Cloudflare Tunnel route: `drive.govindvaghasiya.ca` → `http://localhost:8765`
- [ ] Test full flow: login → files from Nextcloud → edit in OnlyOffice

---

## Phase 6 — Security Hardening
> **Est. Time:** 2–3 hours | **Status:** 🔲 Not Started

### 6.1 Nextcloud Security
- [ ] Enable 2FA for all admin accounts
- [ ] Set strong password policy (min 12 chars, special chars required)
- [ ] Enable brute force protection (built into Nextcloud)
- [ ] Enable server-side encryption in Nextcloud
- [ ] Run Nextcloud Security Scan: `https://scan.nextcloud.com`

### 6.2 Cloudflare Security
- [ ] Enable Bot Fight Mode in Cloudflare
- [ ] Set SSL/TLS to Full (Strict) mode
- [ ] Enable HSTS (HTTP Strict Transport Security)
- [ ] Set up Rate Limiting rules for `/login` endpoint
- [ ] Enable DDoS protection (free on Cloudflare)

### 6.3 ZimaOS / Server Security
- [ ] Change default ZimaOS admin password if not done
- [ ] Disable any unused ZimaOS ports
- [ ] Enable automatic security updates on ZimaOS
- [ ] Set up Nextcloud backup to a second location

### 6.4 App-Level Security
- [ ] Remove all localStorage auth token storage
- [ ] Audit all API calls — confirm every request is authenticated
- [ ] Add session timeout (auto-logout after inactivity)

---

## Phase 7 — Final Polish & Nice-to-Haves
> **Est. Time:** 1–2 days | **Status:** 🔲 Not Started

### 7.1 Mobile Access
- [ ] Test web app on iPhone/Android browser
- [ ] Confirm upload works on mobile
- [ ] Install Nextcloud iOS/Android app for native mobile sync

### 7.2 Performance Optimization
- [ ] Enable Nextcloud Redis cache (faster file listings)
- [ ] Enable Nextcloud APCu memory cache
- [ ] Enable Vite production build with proper code splitting

### 7.3 Backup Strategy
- [ ] Set up automated Nextcloud backup (weekly snapshot)
- [ ] Test restore from backup
- [ ] Store backup on separate physical disk

### 7.4 Notifications & Activity
- [ ] Enable Nextcloud email notifications (SMTP setup)
- [ ] Configure `ActivityFeed.tsx` to use Nextcloud Activity API
- [ ] Test email notification when someone shares a file

### 7.5 Extra Features (Post-Launch)
- [ ] **Immich Integration** — you already have Immich! Link photo previews
- [ ] **Trash/Restore** — map to Nextcloud's built-in trash bin
- [ ] **Versioning** — Nextcloud keeps file version history automatically
- [ ] **PWA** — Progressive Web App manifest for mobile home screen

---

## 🧠 Key Decisions

| Decision | Choice | Reason |
|---|---|---|
| Backend | Nextcloud (not Express) | Enterprise security, built-in users, WebDAV |
| Office Editing | Collabora CODE | Native Nextcloud integration, free |
| Internet Access | Cloudflare Tunnel | Already installed, free HTTPS, DDoS protection |
| Auth | Nextcloud native | Replaces PocketBase — proper session management |
| Deployment | Docker on ZimaOS | Native ZimaOS app format |
| UI | Keep existing React app | Beautiful UI — just rewire the data layer |

---

## 📌 Current Blockers

- [ ] **RAM** — 4.7 GB total may be tight with Collabora. Monitor after Phase 2.
- [x] ~~**Domain** — Need a domain name~~ → `drive.govindvaghasiya.ca` ✅ DONE
- [x] ~~**Nextcloud port**~~ → Port `7580` confirmed ✅
- [ ] **Is Cloudflare Tunnel already active for the domain?** — Need to verify
- [ ] **Is domain already publicly accessible?** — Test from mobile data (not WiFi)

---

## ✅ Completed

- [x] ZimaOS server running with 4TB NVMe
- [x] Nextcloud 34.0.2 installed and running on port `7580`
- [x] Redis + Database containers running
- [x] Admin user account created
- [x] Other users already created
- [x] Trusted domains configured including `drive.govindvaghasiya.ca`
- [x] ZimaOS IP confirmed: `10.147.17.1`
- [x] All security apps enabled (2FA, Password Policy, Activity, Suspicious Login, Brute Force)
- [x] **Phase 1 COMPLETE** ✅
- [x] Cloudflare Tunnel working — accessible from iPhone on mobile data
- [x] Domain `drive.govindvaghasiya.ca` live and accessible publicly
- [x] **Phase 3 COMPLETE** ✅

---

> 📝 Update checkboxes as you complete each step.
> Change `[ ]` to `[x]` when done, and update the progress section at the top.
> Log any issues in the Blockers section above.
