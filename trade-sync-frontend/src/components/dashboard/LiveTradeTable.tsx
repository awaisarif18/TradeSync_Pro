"use client";
import { ArrowUpCircle, ArrowDownCircle, Clock } from "lucide-react";
import { useIncomingSignals } from "../../hooks/useIncomingSignals";

/**
 * @deprecated Phase 5 replaced the rendered dashboard feed with IncomingSignalsTable.
 * Keep this wrapper available for older callers while sharing the same socket hook.
 */
export default function LiveTradeTable() {
  const { trades } = useIncomingSignals();

  if (trades.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 bg-slate-900/50 rounded-lg border border-slate-800 border-dashed">
        <Clock className="mx-auto mb-3 opacity-50" size={32} />
        <p>Waiting for live market signals...</p>
        <p className="text-xs mt-2 opacity-60">
          Place a trade on the Provider MT5 terminal to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
      <table className="w-full text-left text-sm text-slate-400">
        <thead className="bg-slate-950 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-6 py-3">Type</th>
            <th className="px-6 py-3">Symbol</th>
            <th className="px-6 py-3">Action</th>
            <th className="px-6 py-3">Volume</th>
            <th className="px-6 py-3 text-right">Master Ticket</th>
            <th className="px-6 py-3 text-right">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {trades.map((trade, i) => (
            <tr
              key={i}
              className="hover:bg-slate-800/50 transition duration-150 animate-in fade-in slide-in-from-top-2"
            >
              <td className="px-6 py-4">
                {trade.event === "OPEN" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-mint-soft)] px-2 py-1 text-xs font-medium text-[var(--color-mint)]">
                    OPEN
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-700 px-2 py-1 text-xs font-medium text-slate-400">
                    CLOSE
                  </span>
                )}
              </td>
              <td className="px-6 py-4 font-medium text-white">
                {trade.symbol}
              </td>
              <td className="px-6 py-4">
                <div
                  className={`flex items-center gap-2 ${trade.action === "BUY" ? "text-emerald-400" : "text-red-400"}`}
                >
                  {trade.action === "BUY" ? (
                    <ArrowUpCircle size={16} />
                  ) : (
                    <ArrowDownCircle size={16} />
                  )}
                  <span className="font-bold">{trade.action}</span>
                </div>
              </td>
              <td className="px-6 py-4 font-mono text-white">{trade.volume}</td>
              <td className="px-6 py-4 text-right font-mono text-xs">
                {trade.master_ticket}
              </td>
              <td className="px-6 py-4 text-right text-xs opacity-60">
                {trade.time}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
