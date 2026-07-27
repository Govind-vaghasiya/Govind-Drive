import { useState, useEffect } from "react";
import { Play, Image as ImageIcon, Film, FileText, Music, FileSpreadsheet, Presentation, Archive } from "lucide-react";
import type { FileKind } from "./data";
import { getDiskDownloadUrl } from "../lib/serverApi";

interface Props {
  kind: FileKind;
  name: string;
  size?: number;
  relPath?: string;
  url?: string;
}

export default function FileThumb({ kind, name, relPath, url }: Props) {
  const [imgError, setImgError] = useState(false);
  const [textSnippet, setTextSnippet] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  if (kind === "folder") return null;

  const mediaUrl = url || (relPath ? getDiskDownloadUrl(relPath) : null);
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const isText = ["txt", "md", "json", "js", "ts", "css", "html", "py", "sh", "log"].includes(ext);

  // Fetch text snippet for text/code file thumbnails
  useEffect(() => {
    if (isText && mediaUrl && mediaUrl !== "#") {
      fetch(mediaUrl)
        .then((r) => r.text())
        .then((t) => {
          setTextSnippet(t.substring(0, 150));
        })
        .catch(() => { });
    }
  }, [isText, mediaUrl]);

  // 1. REAL PHOTO / IMAGE THUMBNAIL (Uncropped Fit)
  if (kind === "image") {
    if (mediaUrl && !imgError) {
      return (
        <div className="relative h-full w-full overflow-hidden rounded-xl bg-slate-100/80 shadow-inner flex items-center justify-center p-1.5">
          <img
            src={mediaUrl}
            alt={name}
            onError={() => setImgError(true)}
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      );
    }
    return (
      <div className="relative flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 text-white shadow-inner">
        <ImageIcon className="h-8 w-8 opacity-80" />
      </div>
    );
  }

  // 2. REAL VIDEO THUMBNAIL (Fill Box Edge to Edge)
  if (kind === "video") {
    if (mediaUrl && !imgError) {
      return (
        <div className="relative h-full w-full overflow-hidden rounded-xl bg-black shadow-inner flex items-center justify-center">
          <video
            src={`${mediaUrl}#t=0.5`}
            preload="metadata"
            muted
            onError={() => setImgError(true)}
            className="h-full w-full object-cover opacity-90 transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/30 backdrop-blur-md shadow-lg transition transform group-hover:scale-110">
              <Play className="h-4 w-4 fill-white text-white ml-0.5" />
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="relative flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 via-rose-500 to-red-500 text-white shadow-inner">
        <Film className="h-8 w-8 opacity-80" />
      </div>
    );
  }

  // 3. REAL TEXT / CODE SNIPPET THUMBNAIL
  if (isText && textSnippet) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-gray-950 p-3 text-[9px] font-mono text-gray-300 leading-tight">
        <div className="opacity-75 whitespace-pre-wrap break-all select-none pointer-events-none">
          {textSnippet}
        </div>
      </div>
    );
  }

  // 4. PDF THUMBNAIL (Seamless Full-Bleed Page Preview)
  if (kind === "pdf") {
    const inlinePdfUrl = relPath ? getDiskDownloadUrl(relPath, true) : (url || null);
    return (
      <div className="relative h-full w-full overflow-hidden bg-white flex items-center justify-center">
        {inlinePdfUrl ? (
          <object
            data={`${inlinePdfUrl}#page=1&view=FitH&toolbar=0&navpanes=0`}
            type="application/pdf"
            className="h-[125%] w-[125%] max-w-none max-h-none object-cover pointer-events-none overflow-hidden scale-110 -mt-2 transition-transform duration-300 group-hover:scale-115"
          >
            <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-red-500 to-rose-600 text-white">
              <FileText className="h-9 w-9 opacity-90" />
            </div>
          </object>
        ) : (
          <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-red-500 to-rose-600 text-white">
            <FileText className="h-9 w-9 opacity-90" />
          </div>
        )}
      </div>
    );
  }

  // 5. WORD DOCUMENT THUMBNAIL
  if (kind === "doc") {
    return (
      <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 via-indigo-600 to-blue-700 text-white">
        <FileText className="h-9 w-9 opacity-90" />
      </div>
    );
  }

  // 6. SPREADSHEET THUMBNAIL
  if (kind === "sheet") {
    return (
      <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500 via-teal-600 to-green-600 text-white">
        <FileSpreadsheet className="h-9 w-9 opacity-90" />
      </div>
    );
  }

  // 7. PRESENTATION THUMBNAIL
  if (kind === "slides") {
    return (
      <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white">
        <Presentation className="h-9 w-9 opacity-90" />
      </div>
    );
  }

  // 8. AUDIO THUMBNAIL
  if (kind === "audio") {
    return (
      <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 text-white">
        <Music className="h-9 w-9 opacity-90" />
      </div>
    );
  }

  // 9. ARCHIVE / OTHER FALLBACK
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-600 to-gray-800 text-white">
      <Archive className="h-9 w-9 opacity-80" />
    </div>
  );
}
