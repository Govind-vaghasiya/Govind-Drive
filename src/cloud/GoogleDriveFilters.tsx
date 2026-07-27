import { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  Folder,
  FileText,
  FileSpreadsheet,
  Presentation,
  Film,
  Image as ImageIcon,
  Music,
  Code,
  Archive,
  X,
  Check,
} from "lucide-react";

interface Props {
  kindFilter: string;
  onSelectKind: (kind: string) => void;
  dateFilter: string;
  onSelectDate: (date: string) => void;
  peopleFilter: string;
  onSelectPeople: (person: string) => void;
}

export default function GoogleDriveFilters({
  kindFilter,
  onSelectKind,
  dateFilter,
  onSelectDate,
  peopleFilter,
  onSelectPeople,
}: Props) {
  const [typeOpen, setTypeOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);

  const typeRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);
  const peopleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (typeRef.current && !typeRef.current.contains(e.target as Node)) setTypeOpen(false);
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) setDateOpen(false);
      if (peopleRef.current && !peopleRef.current.contains(e.target as Node)) setPeopleOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const typeOptions = [
    { id: "folder", label: "Folders", icon: Folder, iconColor: "text-amber-500 bg-amber-50" },
    { id: "doc", label: "Documents", icon: FileText, iconColor: "text-blue-600 bg-blue-50" },
    { id: "sheet", label: "Spreadsheets", icon: FileSpreadsheet, iconColor: "text-emerald-600 bg-emerald-50" },
    { id: "slides", label: "Presentations", icon: Presentation, iconColor: "text-amber-600 bg-amber-50" },
    { id: "video", label: "Videos", icon: Film, iconColor: "text-rose-500 bg-rose-50" },
    { id: "image", label: "Photos & images", icon: ImageIcon, iconColor: "text-purple-600 bg-purple-50" },
    { id: "pdf", label: "PDFs", icon: FileText, iconColor: "text-red-600 bg-red-50" },
    { id: "audio", label: "Audio", icon: Music, iconColor: "text-indigo-600 bg-indigo-50" },
    { id: "code", label: "Text & code", icon: Code, iconColor: "text-cyan-600 bg-cyan-50" },
    { id: "archive", label: "Archives", icon: Archive, iconColor: "text-gray-600 bg-gray-100" },
  ];

  const dateOptions = [
    { id: "any", label: "Any time" },
    { id: "today", label: "Today" },
    { id: "7days", label: "Last 7 days" },
    { id: "30days", label: "Last 30 days" },
    { id: "2026", label: "This year (2026)" },
  ];

  const peopleOptions = [
    { id: "anyone", label: "Anyone" },
    { id: "admin", label: "Govind (Admin)" },
    { id: "maya", label: "Maya Chen" },
    { id: "leo", label: "Leo Park" },
  ];

  const selectedTypeObj = typeOptions.find((t) => t.id === kindFilter);
  const selectedDateObj = dateOptions.find((d) => d.id === dateFilter);
  const selectedPersonObj = peopleOptions.find((p) => p.id === peopleFilter);

  return (
    <div className="flex items-center gap-2 select-none">
      {/* 1. TYPE FILTER DROPDOWN */}
      <div className="relative" ref={typeRef}>
        <button
          onClick={() => {
            setTypeOpen((v) => !v);
            setDateOpen(false);
            setPeopleOpen(false);
          }}
          className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all shadow-xs ${
            kindFilter !== "all"
              ? "border-blue-500 bg-blue-50 text-blue-700 font-bold"
              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          <span>{selectedTypeObj ? `Type: ${selectedTypeObj.label}` : "Type"}</span>
          {kindFilter !== "all" ? (
            <X
              className="h-3.5 w-3.5 hover:text-blue-900"
              onClick={(e) => {
                e.stopPropagation();
                onSelectKind("all");
              }}
            />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
          )}
        </button>

        {typeOpen && (
          <div className="absolute right-0 sm:left-0 top-full z-50 mt-1.5 w-60 overflow-hidden rounded-2xl border border-gray-200 bg-white py-1.5 shadow-2xl shadow-gray-900/20 animate-in fade-in zoom-in-95 duration-150">
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              <div className="p-1">
                <button
                  onClick={() => {
                    onSelectKind("all");
                    setTypeOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    kindFilter === "all" ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span>All file types</span>
                  {kindFilter === "all" && <Check className="h-4 w-4" />}
                </button>
              </div>

              <div className="p-1 space-y-0.5">
                {typeOptions.map(({ id, label, icon: Icon, iconColor }) => (
                  <button
                    key={id}
                    onClick={() => {
                      onSelectKind(id);
                      setTypeOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition ${
                      kindFilter === id ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${iconColor}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span>{label}</span>
                    </div>
                    {kindFilter === id && <Check className="h-4 w-4 text-blue-600" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. MODIFIED FILTER DROPDOWN */}
      <div className="relative" ref={dateRef}>
        <button
          onClick={() => {
            setDateOpen((v) => !v);
            setTypeOpen(false);
            setPeopleOpen(false);
          }}
          className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all shadow-xs ${
            dateFilter !== "any"
              ? "border-blue-500 bg-blue-50 text-blue-700 font-bold"
              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          <span>{dateFilter !== "any" ? `Modified: ${selectedDateObj?.label}` : "Modified"}</span>
          {dateFilter !== "any" ? (
            <X
              className="h-3.5 w-3.5 hover:text-blue-900"
              onClick={(e) => {
                e.stopPropagation();
                onSelectDate("any");
              }}
            />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
          )}
        </button>

        {dateOpen && (
          <div className="absolute right-0 sm:left-0 top-full z-50 mt-1.5 w-48 overflow-hidden rounded-2xl border border-gray-200 bg-white p-1.5 shadow-2xl shadow-gray-900/20 animate-in fade-in zoom-in-95 duration-150">
            {dateOptions.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => {
                  onSelectDate(id);
                  setDateOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs transition ${
                  dateFilter === id ? "bg-blue-50 text-blue-600 font-bold" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span>{label}</span>
                {dateFilter === id && <Check className="h-4 w-4 text-blue-600" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. PEOPLE FILTER DROPDOWN */}
      <div className="relative" ref={peopleRef}>
        <button
          onClick={() => {
            setPeopleOpen((v) => !v);
            setTypeOpen(false);
            setDateOpen(false);
          }}
          className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all shadow-xs ${
            peopleFilter !== "anyone"
              ? "border-blue-500 bg-blue-50 text-blue-700 font-bold"
              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          <span>{peopleFilter !== "anyone" ? `People: ${selectedPersonObj?.label}` : "People"}</span>
          {peopleFilter !== "anyone" ? (
            <X
              className="h-3.5 w-3.5 hover:text-blue-900"
              onClick={(e) => {
                e.stopPropagation();
                onSelectPeople("anyone");
              }}
            />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
          )}
        </button>

        {peopleOpen && (
          <div className="absolute right-0 sm:left-0 top-full z-50 mt-1.5 w-48 overflow-hidden rounded-2xl border border-gray-200 bg-white p-1.5 shadow-2xl shadow-gray-900/20 animate-in fade-in zoom-in-95 duration-150">
            {peopleOptions.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => {
                  onSelectPeople(id);
                  setPeopleOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs transition ${
                  peopleFilter === id ? "bg-blue-50 text-blue-600 font-bold" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span>{label}</span>
                {peopleFilter === id && <Check className="h-4 w-4 text-blue-600" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
