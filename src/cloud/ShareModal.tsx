import { useState } from 'react';
import { Share2, X, Copy, Check, Lock, Calendar, UploadCloud, Link as LinkIcon } from 'lucide-react';
import { DriveItem } from './data';

interface ShareModalProps {
  item: DriveItem;
  onClose: () => void;
}

export default function ShareModal({ item, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [expiry, setExpiry] = useState('7');
  const [password, setPassword] = useState('');
  const [pinCopied, setPinCopied] = useState(false);
  const [allowUpload, setAllowUpload] = useState(false);

  // PIN is intentionally NOT in the URL — recipient must receive it via a separate channel
  // (text message, Signal, email, etc.) to prevent URL-based credential leakage.
  const linkToken = `govind_share_${item.id.replace(/[^a-zA-Z0-9]/g, '')}_${Math.random().toString(36).substring(2, 7)}`;
  const expParam = expiry !== 'never' ? `&exp=${expiry}d` : '';
  const shareUrl = `${window.location.origin}/#share?token=${linkToken}&item=${encodeURIComponent(item.name)}${expParam}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPin = () => {
    navigator.clipboard.writeText(password);
    setPinCopied(true);
    setTimeout(() => setPinCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Share "{item.name}"</h3>
              <p className="text-xs text-gray-500">Create secret download or upload links for friends</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Share Link Preview Box */}
        <div className="mt-5 rounded-2xl bg-gray-50 p-3.5 border border-gray-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <LinkIcon className="h-3.5 w-3.5 text-blue-600" /> Public Secret Link
            </span>
            <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {item.kind === 'folder' && allowUpload ? 'Download + Upload' : 'Download Only'}
            </span>
          </div>

          <div className="mt-2.5 flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="w-full truncate rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-mono text-gray-700 outline-none"
            />
            <button
              onClick={handleCopy}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-white shadow-sm transition ${
                copied ? 'bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Link Customization Options */}
        <div className="mt-5 space-y-4">
          {/* Expiration */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-gray-400" /> Link Expiration
            </label>
            <select
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-800 outline-none focus:bg-white focus:border-blue-500"
            >
              <option value="1">Expires in 24 hours</option>
              <option value="7">Expires in 7 days</option>
              <option value="30">Expires in 30 days</option>
              <option value="never">Never expires</option>
            </select>
          </div>

          {/* Password Protection */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-gray-400" /> Link PIN (Optional)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave empty for no PIN"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-800 outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          {/* PIN callout — shown when a PIN is set. PIN is NEVER put in the URL. */}
          {password && (
            <div className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-200 p-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-amber-800">🔒 Share this PIN separately</p>
                <p className="text-[10px] text-amber-700 mt-0.5">
                  Send via text/Signal — <strong>not</strong> in the same message as the link
                </p>
                <p className="mt-1 font-mono text-sm font-bold text-amber-900 tracking-widest">{password}</p>
              </div>
              <button
                onClick={handleCopyPin}
                className={`ml-3 shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition ${
                  pinCopied ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                }`}
              >
                {pinCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {pinCopied ? 'Copied!' : 'Copy PIN'}
              </button>
            </div>
          )}

          {/* Allow Upload (Folder only) */}
          {item.kind === 'folder' && (
            <div className="flex items-center justify-between rounded-xl bg-blue-50/60 p-3">
              <div className="flex items-center gap-2.5">
                <UploadCloud className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-xs font-semibold text-gray-900">Allow Friends to Upload</p>
                  <p className="text-[10px] text-gray-500">Friends can drop files directly into this folder</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={allowUpload}
                onChange={(e) => setAllowUpload(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
          )}
        </div>


        {/* Action buttons */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-gray-100 px-5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
