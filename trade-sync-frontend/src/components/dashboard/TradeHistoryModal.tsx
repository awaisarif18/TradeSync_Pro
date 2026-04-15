"use client";

import { X } from "lucide-react";
import { TradeHistoryEntry } from "../../services/api";

interface TradeHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: TradeHistoryEntry[];
  loading: boolean;
  masterName: string;
}

export default function TradeHistoryModal({
  isOpen,
  onClose,
  history,
  loading,
  masterName,
}: TradeHistoryModalProps) {
  if (!isOpen) return null;

  const getPnLClass = (value: number | null) => {
    if (value === null) return "text-slate-400";
    return value >= 0 ? "text-emerald-400" : "text-red-400";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-4xl rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h3 className="text-white font-semibold">
            {masterName} Trade History
          </h3>
          <button
            type="button"
            onClick={onClose}
            title="Close trade history modal"
            aria-label="Close trade history modal"
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-auto p-4">
          {loading ? (
            <p className="text-slate-400 text-sm">Loading history...</p>
          ) : history.length === 0 ? (
            <p className="text-slate-400 text-sm">
              No trade history available.
            </p>
          ) : (
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="py-2">Symbol</th>
                  <th className="py-2">Action</th>
                  <th className="py-2">Volume</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">PnL</th>
                  <th className="py-2">Opened</th>
                  <th className="py-2">Closed</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-slate-900 text-slate-200"
                  >
                    <td className="py-2">{entry.symbol}</td>
                    <td className="py-2">{entry.action}</td>
                    <td className="py-2">{entry.volume}</td>
                    <td className="py-2">{entry.status}</td>
                    <td className={`py-2 ${getPnLClass(entry.pnl)}`}>
                      {entry.pnl === null ? "-" : entry.pnl.toFixed(2)}
                    </td>
                    <td className="py-2">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2">
                      {entry.closedAt
                        ? new Date(entry.closedAt).toLocaleString()
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
