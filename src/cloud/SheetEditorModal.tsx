import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Check,
  Loader2,
  FileSpreadsheet,
  Plus,
  Trash2,
  Calculator,
  Download,
  Table,
} from 'lucide-react';
import { DriveItem } from './data';
import { getDiskDownloadUrl, API_BASE } from '../lib/serverApi';

interface SheetEditorModalProps {
  item: DriveItem;
  onClose: () => void;
  onSaved?: () => void;
}

export default function SheetEditorModal({ item, onClose, onSaved }: SheetEditorModalProps) {
  const [gridData, setGridData] = useState<string[][]>([
    ['Product Name', 'Q1 Sales', 'Q2 Sales', 'Total Revenue'],
    ['Govind Drive Pro', '1250', '2400', '=SUM(B2:C2)'],
    ['Cloud Storage 100GB', '800', '1900', '=SUM(B3:C3)'],
    ['Enterprise Admin', '3100', '4200', '=SUM(B4:C4)'],
    ['Total', '=SUM(B2:B4)', '=SUM(C2:C4)', '=SUM(D2:D4)'],
  ]);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [formulaValue, setFormulaValue] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const downloadUrl = (item as any).url || ((item as any).relPath ? getDiskDownloadUrl((item as any).relPath) : '#');
  const relPath = (item as any).relPath || item.name;

  // Load CSV data if available
  useEffect(() => {
    setLoading(true);
    setError(null);
    if (!downloadUrl || downloadUrl === '#') {
      setLoading(false);
      return;
    }

    fetch(downloadUrl)
      .then((res) => res.text())
      .then((text) => {
        if (text.trim()) {
          const lines = text.split('\n').filter((l) => l.trim());
          const rows = lines.map((line) => line.split(',').map((c) => c.trim().replace(/^"|"$/g, '')));
          if (rows.length > 0) {
            setGridData(rows);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading CSV spreadsheet data:', err);
        setLoading(false);
      });
  }, [downloadUrl]);

  // Evaluate formulas like =SUM(B2:B4) or =SUM(B2:C2)
  const evaluateCell = (value: string, currentGrid: string[][]): string => {
    if (!value.startsWith('=')) return value;
    try {
      const formula = value.substring(1).trim().toUpperCase();

      // Formula: SUM(A1:B5)
      const matchSum = formula.match(/^SUM\(([A-Z])([0-9]+):([A-Z])([0-9]+)\)$/);
      if (matchSum) {
        const startCol = matchSum[1].charCodeAt(0) - 65;
        const startRow = parseInt(matchSum[2], 10) - 1;
        const endCol = matchSum[3].charCodeAt(0) - 65;
        const endRow = parseInt(matchSum[4], 10) - 1;

        let sum = 0;
        for (let r = startRow; r <= endRow; r++) {
          for (let c = startCol; c <= endCol; c++) {
            if (currentGrid[r] && currentGrid[r][c]) {
              const val = parseFloat(evaluateCell(currentGrid[r][c], currentGrid));
              if (!isNaN(val)) sum += val;
            }
          }
        }
        return sum.toLocaleString();
      }

      // Formula: AVERAGE(A1:B5)
      const matchAvg = formula.match(/^AVERAGE\(([A-Z])([0-9]+):([A-Z])([0-9]+)\)$/);
      if (matchAvg) {
        const startCol = matchAvg[1].charCodeAt(0) - 65;
        const startRow = parseInt(matchAvg[2], 10) - 1;
        const endCol = matchAvg[3].charCodeAt(0) - 65;
        const endRow = parseInt(matchAvg[4], 10) - 1;

        let sum = 0;
        let count = 0;
        for (let r = startRow; r <= endRow; r++) {
          for (let c = startCol; c <= endCol; c++) {
            if (currentGrid[r] && currentGrid[r][c]) {
              const val = parseFloat(evaluateCell(currentGrid[r][c], currentGrid));
              if (!isNaN(val)) {
                sum += val;
                count++;
              }
            }
          }
        }
        return count > 0 ? (sum / count).toFixed(2) : '0';
      }
    } catch (e) {
      return '#ERROR!';
    }
    return value;
  };

  const handleCellChange = (rIdx: number, cIdx: number, val: string) => {
    const next = gridData.map((row, r) =>
      row.map((cell, c) => (r === rIdx && c === cIdx ? val : cell))
    );
    setGridData(next);
  };

  const handleSelectCell = (rIdx: number, cIdx: number) => {
    setSelectedCell({ row: rIdx, col: cIdx });
    setFormulaValue(gridData[rIdx]?.[cIdx] || '');
  };

  const handleAddRow = () => {
    const cols = gridData[0]?.length || 4;
    setGridData([...gridData, Array(cols).fill('')]);
  };

  const handleAddCol = () => {
    setGridData(gridData.map((row) => [...row, '']));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSavedSuccess(false);

    try {
      // Serialize gridData to CSV format
      const csvString = gridData
        .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8' });
      const file = new File([blob], item.name.replace(/\.[^/.]+$/, '.csv'), { type: 'text/csv' });

      const formData = new FormData();
      formData.append('files', file);

      const dirPath = relPath.includes('/') ? relPath.substring(0, relPath.lastIndexOf('/')) : '';
      const res = await fetch(`${API_BASE}/upload?subpath=${encodeURIComponent(dirPath)}`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setSavedSuccess(true);
        onSaved?.();
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        setError('Failed to save spreadsheet to disk.');
      }
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message || 'Error saving spreadsheet.');
    } finally {
      setSaving(false);
    }
  };

  const colLetter = (idx: number) => String.fromCharCode(65 + idx);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950/90 backdrop-blur-md text-white select-none">
      {/* Top Header */}
      <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-white/10 bg-black/50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600/30 text-emerald-400 border border-emerald-500/30">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold truncate text-white" title={item.name}>
              {item.name}
            </h3>
            <p className="text-[11px] text-gray-400">Govind Sheets • Interactive Spreadsheet Grid</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {savedSuccess && (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-400">
              <Check className="h-3.5 w-3.5" /> Saved to Disk!
            </div>
          )}

          <button
            onClick={handleAddRow}
            className="flex items-center gap-1 rounded-xl bg-gray-800 border border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-200 hover:bg-gray-700 transition"
          >
            <Plus className="h-3.5 w-3.5" /> Add Row
          </button>

          <button
            onClick={handleAddCol}
            className="flex items-center gap-1 rounded-xl bg-gray-800 border border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-200 hover:bg-gray-700 transition"
          >
            <Plus className="h-3.5 w-3.5" /> Add Column
          </button>

          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-500 active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Spreadsheet'}
          </button>

          <button onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white transition">
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Formula Bar */}
      <div className="flex items-center gap-3 border-b border-white/10 bg-gray-900 px-6 py-2">
        <div className="flex items-center gap-1 text-emerald-400 font-bold text-xs">
          <Calculator className="h-4 w-4" />
          <span>fx</span>
        </div>
        <div className="text-xs font-mono font-semibold text-gray-400 w-12 text-center bg-black/40 py-1 rounded">
          {selectedCell ? `${colLetter(selectedCell.col)}${selectedCell.row + 1}` : 'A1'}
        </div>
        <input
          type="text"
          value={selectedCell ? gridData[selectedCell.row]?.[selectedCell.col] || '' : formulaValue}
          onChange={(e) => {
            if (selectedCell) {
              handleCellChange(selectedCell.row, selectedCell.col, e.target.value);
            }
            setFormulaValue(e.target.value);
          }}
          placeholder="Enter text, numbers, or formula e.g. =SUM(B2:B4)"
          className="flex-1 rounded-lg border border-white/10 bg-gray-950 px-3 py-1 text-xs font-mono text-white outline-none focus:border-emerald-500"
        />
      </div>

      {/* Main Grid View */}
      <div className="relative flex min-h-0 flex-1 overflow-auto p-4 lg:p-6 justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 text-emerald-400">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-xs font-semibold">Loading Spreadsheet Grid...</span>
          </div>
        ) : (
          <div className="h-full w-full max-w-6xl overflow-auto rounded-2xl bg-white text-gray-900 shadow-2xl border border-gray-300">
            <table className="w-full text-left text-xs border-collapse font-sans">
              {/* Column Header */}
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300 font-bold text-gray-700">
                  <th className="w-10 px-2 py-2 text-center border-r border-gray-300 bg-gray-200">#</th>
                  {gridData[0]?.map((_, cIdx) => (
                    <th key={cIdx} className="px-3 py-2 text-center border-r border-gray-300 bg-gray-100">
                      {colLetter(cIdx)}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Grid Cells */}
              <tbody>
                {gridData.map((row, rIdx) => (
                  <tr key={rIdx} className="border-b border-gray-200 hover:bg-emerald-50/30">
                    <td className="px-2 py-1.5 text-center font-bold text-gray-500 bg-gray-100 border-r border-gray-300 select-none">
                      {rIdx + 1}
                    </td>
                    {row.map((cellVal, cIdx) => {
                      const isSelected = selectedCell?.row === rIdx && selectedCell?.col === cIdx;
                      const displayVal = evaluateCell(cellVal, gridData);

                      return (
                        <td
                          key={cIdx}
                          onClick={() => handleSelectCell(rIdx, cIdx)}
                          className={`p-0 border-r border-gray-200 transition ${
                            isSelected ? 'ring-2 ring-emerald-600 z-10' : ''
                          }`}
                        >
                          <input
                            type="text"
                            value={displayVal}
                            onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                            onFocus={() => handleSelectCell(rIdx, cIdx)}
                            className={`w-full bg-transparent px-3 py-1.5 text-xs outline-none ${
                              rIdx === 0 ? 'font-bold text-gray-900' : 'text-gray-800'
                            } ${cellVal.startsWith('=') ? 'font-mono text-emerald-700 font-bold' : ''}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
