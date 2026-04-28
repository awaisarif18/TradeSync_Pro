"use client";

import { useEffect, useState } from "react";
import { mapMasterProfileToTraderCardData } from "../../lib/mapMasterToTraderCard";
import {
  marketplaceService,
  profileService,
  type TopMaster,
} from "../../services/api";
import HowItWorks from "./HowItWorks";
import { StatusPill } from "../ui";
import ProviderShowcase, { type TraderCardData } from "./ProviderShowcase";

type ActiveMasterRow = { id: string; fullName?: string; email?: string };

export default function VerifiedProviderShowcaseBlock() {
  const [providers, setProviders] = useState<TraderCardData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [liveCount, setLiveCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [top, masters, live] = await Promise.all([
          profileService.getTopMasters(),
          marketplaceService.getActiveMasters() as Promise<ActiveMasterRow[]>,
          marketplaceService.getLiveMasters(),
        ]);

        setTotalCount(Array.isArray(masters) ? masters.length : 0);
        setLiveCount(live.liveIds?.length ?? 0);

        const rows: TraderCardData[] = top.map((m: TopMaster) =>
          mapMasterProfileToTraderCardData(
            { id: m.id, fullName: m.fullName, email: m.email },
            m,
            live.liveIds ?? [],
          ),
        );
        setProviders(rows);
      } catch (error) {
        console.error("Failed to load verified provider showcase", error);
        setProviders([]);
        setTotalCount(0);
        setLiveCount(0);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  if (loading) {
    return (
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "20px 32px 0" }}>
        <span style={{ fontSize: 13, color: "var(--color-text-3)" }}>Loading marketplace…</span>
      </div>
    );
  }

  return (
    <>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "20px 32px 0" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 13,
            color: "var(--color-text-3)",
            flexWrap: "wrap",
          }}
        >
          <StatusPill
            status="live"
            label={`${liveCount.toLocaleString()} traders online`}
            mono
          />
          <span>·</span>
          <span>
            <span className="font-mono-tnum">{totalCount.toLocaleString()}</span> verified providers
          </span>
        </div>
      </div>
      <HowItWorks />
      <ProviderShowcase providers={providers} totalProviderCount={totalCount} />
    </>
  );
}
