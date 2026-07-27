# 🚀 Complete Beginner's Guide: Deploying Govind Drive on Ubuntu Server

This guide explains step-by-step how to move **Govind Drive** from your Mac to your **Ubuntu computer** and set it up as a 24/7 home cloud server.

No technical or developer knowledge is required! Simply copy and paste the commands below.

---

## 📋 Overview of What We Are Doing

1. **Packaging**: Zipping the project on your Mac.
2. **Transferring**: Sending the zip file to your Ubuntu computer.
3. **Installing**: Installing Node.js (the engine) and PM2 (the background manager) on Ubuntu.
4. **Configuring**: Creating the server disk folder where your files will be stored.
5. **Running 24/7**: Starting the app so it stays online continuously and autostarts when Ubuntu boots.

---

## Step 1: Package Govind Drive on Your Mac

1. Open **Terminal** on your Mac (press `Cmd + Space`, type `Terminal`, and press `Enter`).
2. Copy and paste this command, then press `Enter`:
   ```bash
   cd /Users/chromakey/Downloads && zip -r GovindDriveProject.zip GovindDriveProject -x "*/node_modules/*" "*/dist/*" "*.git*"
   ```
3. A file named `GovindDriveProject.zip` will appear in your Mac's `Downloads` folder.

---

## Step 2: Transfer to Your Ubuntu Computer

### Option A: Using a USB Flash Drive (Easiest)
1. Copy `GovindDriveProject.zip` from your Mac `Downloads` folder onto a USB flash drive.
2. Plug the USB flash drive into your Ubuntu computer and copy `GovindDriveProject.zip` to your Ubuntu Home directory.

### Option B: Transfer Over Your Home Network
If you know your Ubuntu IP address (e.g., `192.168.1.150`), open Mac Terminal and run:
```bash
scp /Users/chromakey/Downloads/GovindDriveProject.zip your_ubuntu_username@192.168.1.150:~/
```

---

## Step 3: Install Node.js & Tools on Ubuntu

1. Turn on your **Ubuntu computer** and open the **Terminal** app.
2. Copy and paste this first command to update Ubuntu:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```
   *(If it asks for your password, type it in and press Enter. Characters will not show while typing password, which is normal).*

3. Install Node.js (Version 20 LTS):
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs unzip build-essential
   ```

4. Install **PM2** and **Serve** (tools that keep your server running 24/7):
   ```bash
   sudo npm install -g pm2 serve
   ```

---

## Step 4: Unzip and Install Govind Drive

1. Go to your home folder and extract the zip:
   ```bash
   cd ~
   unzip GovindDriveProject.zip
   ```

2. Enter the project folder:
   ```bash
   cd GovindDriveProject
   ```

3. Install all project packages:
   ```bash
   npm install
   ```

---

## Step 5: Create Your Ubuntu Storage Folder

1. Create a dedicated folder on your Ubuntu computer where all uploaded files (photos, videos, documents) will be saved:
   ```bash
   mkdir -p ~/GovindServer
   ```

2. Configure Govind Drive to use this folder:
   ```bash
   echo "{\"storageRoot\": \"/home/$(whoami)/GovindServer\"}" > storage_config.json
   ```

---

## Step 6: Build and Launch 24/7 Background Server

1. Build the production website:
   ```bash
   npm run build
   ```

2. Start the **Backend Disk API Server** in the background:
   ```bash
   pm2 start server.js --name "govind-backend"
   ```

3. Start the **Web Application Interface** in the background:
   ```bash
   pm2 start "serve -s dist -l 5173" --name "govind-frontend"
   ```

4. Enable auto-start so Govind Drive turns on automatically whenever your Ubuntu computer turns on or restarts:
   ```bash
   pm2 startup
   pm2 save
   ```
   *(If `pm2 startup` prints a line starting with `sudo env PATH...`, copy and paste that exact line into Terminal and press Enter).*

---

## Step 7: How to Open Govind Drive from Any Device

1. On your Ubuntu computer, find its IP address by running:
   ```bash
   hostname -I
   ```
   *(Look for a number like `192.168.1.150`)*

2. Pick up your iPhone, Mac, Windows laptop, or tablet connected to your home Wi-Fi.
3. Open any web browser (Chrome, Safari, Firefox) and type:
   ```text
   http://192.168.1.150:5173
   ```
   *(Replace `192.168.1.150` with your actual Ubuntu IP address).*

🎉 **Congratulations!** Your private home cloud drive is now live and running 24/7 on your Ubuntu computer.

---

## 🛠️ Cheat Sheet: Helpful PM2 Commands

Whenever you want to check on your server on Ubuntu:

- **Check if server is running**: `pm2 status`
- **View live server logs**: `pm2 logs`
- **Restart the server**: `pm2 restart all`
- **Stop the server**: `pm2 stop all`
