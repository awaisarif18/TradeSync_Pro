"use client";

import { useEffect, useMemo, useState } from "react";
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
}

export function useIncomingSignals() {
  const [trades, setTrades] = useState<IncomingTrade[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");

  useEffect(() => {
    // 1. Connect to the NestJS Socket
    const socket = io("http://localhost:3000");

    socket.on("connect", () => {
      console.log("Web Dashboard Connected to Socket");
      setIsConnected(true);
      setConnectionState("connected");
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
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const todayCount = useMemo(() => trades.length, [trades.length]);
  const sessionPnl = useMemo(
    () =>
      trades.reduce((total, trade) => {
        if (trade.event === "CLOSE" && typeof trade.pnl === "number") {
          return total + trade.pnl;
        }

        return total;
      }, 0),
    [trades],
  );
  const mirroredTrades = useMemo(
    () => trades.filter((trade) => trade.event === "OPEN").length,
    [trades],
  );

  return {
    trades,
    isConnected,
    connectionState,
    todayCount,
    sessionPnl,
    mirroredTrades,
  };
}
