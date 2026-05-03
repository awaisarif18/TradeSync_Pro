"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";

export interface IncomingTrade {
  event: string;
  symbol: string;
  action: string;
  volume: number;
  master_ticket: number;
  pnl?: number | null;
  signalId?: number;
  trace_id?: string;
  time: string;
  /** Unix ms from gateway emit; optional — used for client latency estimate */
  server_ts?: number;
}

export function useIncomingSignals(userEmail?: string | null) {
  const [trades, setTrades] = useState<IncomingTrade[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const latencyWindowRef = useRef<number[]>([]);
  const [avgLatency, setAvgLatency] = useState<number | null>(null);
  /** Increments on every `trade_execution` (UI “signals today” / Pablo stats); not capped by buffer length */
  const [sessionSignalTotal, setSessionSignalTotal] = useState(0);

  useEffect(() => {
    // 1. Connect to the NestJS Socket
    const socket = io("http://localhost:3000");

    socket.on("connect", () => {
      console.log("Web Dashboard Connected to Socket");
      setIsConnected(true);
      setConnectionState("connected");
      if (userEmail) {
        socket.emit("register_node", {
          role: "SLAVE",
          identifier: userEmail,
        });
      }
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      setConnectionState("disconnected");
    });

    // 2. Listen for Trades (Just like the Python Slave!)
    socket.on("trade_execution", (data) => {
      const newTrade = {
        ...data,
        time: new Date().toLocaleTimeString(),
      };
      // Add new trade to top of list, keep max 10
      setTrades((prev) => [newTrade, ...prev].slice(0, 10));
      setSessionSignalTotal((n) => n + 1);

      const signal = data as { server_ts?: unknown };
      if (signal.server_ts && typeof signal.server_ts === "number") {
        const latency = Date.now() - signal.server_ts;
        if (latency >= 0 && latency < 60_000) {
          latencyWindowRef.current = [
            ...latencyWindowRef.current.slice(-9),
            latency,
          ];
          const avg = Math.round(
            latencyWindowRef.current.reduce((a, b) => a + b, 0) /
              latencyWindowRef.current.length,
          );
          setAvgLatency(avg);
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [userEmail]);

  const todayCount = sessionSignalTotal;
  const sessionPnl = useMemo(
    () =>
      trades.reduce((total, trade) => {
        const ev = String(trade.event ?? "").toUpperCase();
        if (ev === "CLOSE" && typeof trade.pnl === "number") {
          return total + trade.pnl;
        }

        return total;
      }, 0),
    [trades],
  );
  const mirroredTrades = useMemo(
    () =>
      trades.filter(
        (trade) => String(trade.event ?? "").toUpperCase() === "OPEN",
      ).length,
    [trades],
  );

  return {
    trades,
    isConnected,
    connectionState,
    todayCount,
    sessionPnl,
    mirroredTrades,
    avgLatency,
  };
}
