import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Check,
  User,
  Mail,
  Shield,
  Save,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Move,
  Crop,
} from 'lucide-react';
import { UserProfile } from '../lib/pocketbase';

interface Props {
  user: UserProfile;
  onClose: () => void;
  onUpdateUser: (updatedUser: UserProfile) => void;
}

export default function UserProfileModal({ user, onClose, onUpdateUser }: Props) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [avatarUrl, setAvatarUrl] = useState(user.avatar || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Image Cropper & Adjuster State
  const [croppingImage, setCroppingImage] = useState<string | null>(null);
  const [imgMeta, setImgMeta] = useState<{ w: number; h: number; baseScale: number } | null>(null);
  const [zoom, setZoom] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          const src = reader.result.toString();
          const img = new Image();
          img.src = src;
          img.onload = () => {
            const viewportSize = 192; // 48 * 4 = 192px viewport
            const baseScale = viewportSize / Math.min(img.naturalWidth, img.naturalHeight);
            setImgMeta({
              w: img.naturalWidth,
              h: img.naturalHeight,
              baseScale,
            });
            setCroppingImage(src);
            setZoom(100);
            setRotation(0);
            setOffset({ x: 0, y: 0 });
          };
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleApplyCrop = () => {
    if (!croppingImage || !imgMeta) return;

    const canvas = document.createElement('canvas');
    const size = 300;
    const viewportSize = 192;
    const canvasFactor = size / viewportSize; // 1.5625

    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = croppingImage;
    img.onload = () => {
      ctx.clearRect(0, 0, size, size);

      // Create circular clipping path
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      ctx.save();

      // Translate to center + scaled offset
      ctx.translate(size / 2 + offset.x * canvasFactor, size / 2 + offset.y * canvasFactor);
      ctx.rotate((rotation * Math.PI) / 180);

      // Render exact dimensions as seen in DOM preview
      const drawWidth = imgMeta.w * imgMeta.baseScale * (zoom / 100) * canvasFactor;
      const drawHeight = imgMeta.h * imgMeta.baseScale * (zoom / 100) * canvasFactor;

      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();

      const croppedBase64 = canvas.toDataURL('image/png');
      setAvatarUrl(croppedBase64);
      setCroppingImage(null);
    };
  };

  const handleSave = () => {
    const updated: UserProfile = {
      ...user,
      name,
      email,
      avatar: avatarUrl,
    };
    onUpdateUser(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  // Compute CSS DOM preview dimensions
  const previewW = imgMeta ? imgMeta.w * imgMeta.baseScale * (zoom / 100) : 192;
  const previewH = imgMeta ? imgMeta.h * imgMeta.baseScale * (zoom / 100) : 192;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-3 sm:p-4 select-none">
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-5 sm:p-6 shadow-2xl transition-all border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">User Profile Settings</h3>
              <p className="text-xs text-gray-500">Update your display name, email & profile avatar</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body: Image Cropper vs Normal Settings */}
        {croppingImage ? (
          <div className="mt-5 flex flex-col items-center animate-in fade-in-50">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 mb-3 uppercase tracking-wider">
              <Crop className="h-4 w-4" /> Position & Crop Profile Picture
            </div>

            {/* Interactive Crop Viewport (Exact Pixel Match with Canvas Export) */}
            <div
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className={`relative h-48 w-48 overflow-hidden rounded-full border-4 border-blue-600 shadow-2xl cursor-grab ${
                isDragging ? 'cursor-grabbing ring-4 ring-blue-300' : ''
              } bg-gray-900 flex items-center justify-center`}
            >
              <img
                src={croppingImage}
                alt="Crop preview"
                style={{
                  width: `${previewW}px`,
                  height: `${previewH}px`,
                  transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                }}
                className="max-h-none max-w-none transition-transform duration-75 pointer-events-none"
              />
              <div className="absolute inset-0 border-2 border-dashed border-white/40 rounded-full pointer-events-none" />
            </div>

            <p className="mt-2 text-[11px] text-gray-400 font-semibold flex items-center gap-1">
              <Move className="h-3 w-3" /> Click & drag to move image
            </p>

            {/* Adjust Controls */}
            <div className="mt-4 w-full space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
              {/* Zoom Slider */}
              <div className="flex items-center gap-3">
                <ZoomOut className="h-4 w-4 text-gray-500 cursor-pointer" onClick={() => setZoom((z) => Math.max(1, z - 10))} />
                <input
                  type="range"
                  min="1"
                  max="300"
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 accent-blue-600 cursor-pointer"
                />
                <ZoomIn className="h-4 w-4 text-gray-500 cursor-pointer" onClick={() => setZoom((z) => Math.min(300, z + 10))} />
                <span className="w-12 text-right text-xs font-mono font-bold text-gray-700">{zoom}%</span>
              </div>

              {/* Rotate Control */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                >
                  <RotateCw className="h-3.5 w-3.5 text-blue-600" /> Rotate 90°
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => setCroppingImage(null)}
                    className="rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApplyCrop}
                    className="flex items-center gap-1 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition"
                  >
                    <Check className="h-3.5 w-3.5" /> Apply Crop
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Profile Avatar Selection Section */}
            <div className="mt-6 flex flex-col items-center justify-center">
              <div className="relative group">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-2xl font-bold text-white shadow-xl ring-4 ring-blue-50">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
                  ) : (
                    name.substring(0, 2).toUpperCase()
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg ring-2 ring-white hover:bg-blue-700 transition active:scale-95"
                  title="Upload & Crop profile picture"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              <p className="mt-2 text-xs font-semibold text-gray-500">Click camera to upload & adjust photo</p>
            </div>

            {/* Profile Details Form */}
            <div className="mt-6 space-y-4">
              {/* Name Field */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-gray-400" /> Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your display name"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-800 outline-none focus:bg-white focus:border-blue-500 font-medium"
                />
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-gray-400" /> Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-800 outline-none focus:bg-white focus:border-blue-500 font-medium"
                />
              </div>

              {/* Role Badge */}
              <div className="flex items-center justify-between rounded-2xl bg-blue-50/60 p-3.5 border border-blue-100/60">
                <div className="flex items-center gap-2.5">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-xs font-bold text-gray-900">Account Role</p>
                    <p className="text-[10px] text-gray-500">System permissions level</p>
                  </div>
                </div>
                <span className="rounded-full bg-blue-600 px-3 py-1 text-[11px] font-bold text-white uppercase tracking-wider">
                  {user.role}
                </span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="mt-6 flex items-center justify-between">
              {savedSuccess ? (
                <div className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                  <Check className="h-4 w-4" /> Profile Updated!
                </div>
              ) : <span />}

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition active:scale-95"
                >
                  <Save className="h-3.5 w-3.5" /> Save Changes
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
