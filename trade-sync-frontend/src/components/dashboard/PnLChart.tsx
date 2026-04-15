"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { TradeHistoryEntry } from "../../services/api";

interface PnLChartProps {
  history: TradeHistoryEntry[];
}

interface Point {
  index: number;
  cumulativePnL: number;
}

export default function PnLChart({ history }: PnLChartProps) {
  const chartData: Point[] = [];
  let runningPnL = 0;

  history
    .filter((entry) => entry.status === "CLOSED")
    .slice(0, 30)
    .slice()
    .reverse()
    .forEach((entry, idx) => {
      runningPnL += Number(entry.pnl || 0);
      chartData.push({
        index: idx + 1,
        cumulativePnL: Number(runningPnL.toFixed(2)),
      });
    });

  if (chartData.length === 0) {
    return (
      <div className="h-52 w-full rounded-lg border border-slate-800 bg-slate-950/60 flex items-center justify-center text-slate-400 text-sm">
        No data available for chart.
      </div>
    );
  }

  return (
    <div className="h-52 w-full rounded-lg border border-slate-800 bg-slate-950/60 p-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="index" tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "8px",
              color: "#e2e8f0",
            }}
          />
          <Line
            type="monotone"
            dataKey="cumulativePnL"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
