"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { TradeHistoryEntry } from "../../services/api";
import { Button, Card, CardBody, CardFooter, CardHeader, Pill } from "../ui";

interface TradeHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: TradeHistoryEntry[];
  loading: boolean;
  masterName: string;
  licenseKey?: string;
}

type HistoryWindow = "ALL" | "7D" | "30D" | "90D";

const FILTERS: Array<{ label: string; value: HistoryWindow; days?: number }> = [
  { label: "All time", value: "ALL" },
  { label: "7d", value: "7D", days: 7 },
  { label: "30d", value: "30D", days: 30 },
  { label: "90d", value: "90D", days: 90 },
];

function withinDays(entry: TradeHistoryEntry, days?: number): boolean {
  if (!days) return true;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return new Date(entry.createdAt).getTime() >= cutoff;
}

function formatPnl(value: number | null): string {
  if (value === null) return "-";
  return `${value >= 0 ? "+" : "-"}$${Math.abs(value).toFixed(2)}`;
}

export default function TradeHistoryModal({
  isOpen,
  onClose,
  history,
  loading,
  masterName,
  licenseKey,
}: TradeHistoryModalProps) {
  const [activeFilter, setActiveFilter] = useState<HistoryWindow>("ALL");
  const activeFilterConfig = FILTERS.find((filter) => filter.value === activeFilter);
  const filteredHistory = useMemo(
    () => history.filter((entry) => withinDays(entry, activeFilterConfig?.days)),
    [activeFilterConfig?.days, history],
  );
  const closedTrades = filteredHistory.filter((entry) => entry.status === "CLOSED");
  const totalPnL = filteredHistory.reduce((sum, entry) => sum + (entry.pnl ?? 0), 0);
  const wins = closedTrades.filter((entry) => (entry.pnl ?? 0) > 0).length;
  const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div style={{ width: "100%", maxWidth: 1040 }}>
        <Card style={{ borderRadius: 18 }}>
          <CardHeader>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div>
                <h3 style={{ color: "var(--color-text)", fontSize: 18, fontWeight: 600, margin: 0 }}>
                  {masterName} Trade History
                </h3>
                <div className="font-mono-tnum" style={{ color: "var(--color-text-3)", fontSize: 12, marginTop: 4 }}>
                  License {licenseKey ?? "not public"}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                title="Close trade history modal"
                leftIcon={<X size={16} />}
              >
                Close
              </Button>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
              {FILTERS.map((filter) => (
                <span
                  key={filter.value}
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveFilter(filter.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") setActiveFilter(filter.value);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <Pill variant={activeFilter === filter.value ? "outline-mint" : "default"}>
                    {filter.label}
                  </Pill>
                </span>
              ))}
            </div>
          </CardHeader>

          <CardBody>
            <div style={{ maxHeight: "60vh", overflow: "auto" }}>
              {loading ? (
                <p style={{ color: "var(--color-text-2)", fontSize: 14 }}>Loading history...</p>
              ) : filteredHistory.length === 0 ? (
                <p style={{ color: "var(--color-text-2)", fontSize: 14 }}>No trade history available.</p>
              ) : (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 90px 90px 90px 110px 150px",
                      gap: 12,
                      fontSize: 11,
                      color: "var(--color-text-3)",
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
                      paddingBottom: 8,
                      borderBottom: "1px solid var(--color-line)",
                    }}
                  >
                    <div>Symbol</div>
                    <div>Action</div>
                    <div>Volume</div>
                    <div>Status</div>
                    <div style={{ textAlign: "right" }}>P&L</div>
                    <div style={{ textAlign: "right" }}>Opened</div>
                  </div>
                  {filteredHistory.map((entry, index) => (
                    <div
                      key={entry.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 90px 90px 90px 110px 150px",
                        gap: 12,
                        alignItems: "center",
                        padding: "12px 0",
                        borderBottom:
                          index < filteredHistory.length - 1 ? "1px solid var(--color-line)" : "none",
                        fontSize: 13,
                        color: "var(--color-text)",
                      }}
                    >
                      <div>{entry.symbol}</div>
                      <div>
                        <Pill variant={entry.action === "BUY" ? "mint" : "danger"}>{entry.action}</Pill>
                      </div>
                      <div className="font-mono-tnum">{entry.volume.toFixed(2)}</div>
                      <div>
                        <Pill variant={entry.status === "OPEN" ? "mint" : "default"}>{entry.status}</Pill>
                      </div>
                      <div
                        className="font-mono-tnum"
                        style={{
                          textAlign: "right",
                          color: (entry.pnl ?? 0) >= 0 ? "var(--color-mint)" : "var(--color-danger)",
                        }}
                      >
                        {formatPnl(entry.pnl)}
                      </div>
                      <div className="font-mono-tnum" style={{ textAlign: "right", color: "var(--color-text-2)" }}>
                        {new Date(entry.createdAt).toLocaleDateString("en-GB")}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </CardBody>

          <CardFooter>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", color: "var(--color-text-2)", fontSize: 13 }}>
              <span>Total trades <span className="font-mono-tnum">{filteredHistory.length}</span></span>
              <span>·</span>
              <span>
                Total P&L{" "}
                <span
                  className="font-mono-tnum"
                  style={{ color: totalPnL >= 0 ? "var(--color-mint)" : "var(--color-danger)" }}
                >
                  {formatPnl(totalPnL)}
                </span>
              </span>
              <span>·</span>
              <span>
                Win rate <span className="font-mono-tnum">{winRate.toFixed(1)}%</span>
              </span>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
