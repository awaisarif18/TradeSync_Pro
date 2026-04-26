"use client";

import { useEffect, useMemo, useState } from "react";
import MasterProfileCard from "../../components/dashboard/MasterProfileCard";
import {
  MasterProfile,
  marketplaceService,
  profileService,
} from "../../services/api";

type RiskFilter = "ALL" | "LOW" | "MEDIUM" | "HIGH";

interface ActiveMaster {
  id: string;
}

const riskFilters: { label: string; value: RiskFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "Low Risk", value: "LOW" },
  { label: "Medium Risk", value: "MEDIUM" },
  { label: "High Risk", value: "HIGH" },
];

export default function TradersPage() {
  const [profiles, setProfiles] = useState<MasterProfile[]>([]);
  const [activeFilter, setActiveFilter] = useState<RiskFilter>("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMasters = async () => {
      try {
        const masters = (await marketplaceService.getActiveMasters()) as ActiveMaster[];
        const profileRows = await Promise.all(
          masters.map((master) => profileService.getMasterProfile(master.id)),
        );
        setProfiles(profileRows);
      } catch (error) {
        console.error("Failed to load master traders", error);
        setProfiles([]);
      } finally {
        setLoading(false);
      }
    };

    loadMasters();
  }, []);

  const filteredProfiles = useMemo(() => {
    if (activeFilter === "ALL") {
      return profiles;
    }

    return profiles.filter(
      (profile) => (profile.riskLevel ?? "MEDIUM") === activeFilter,
    );
  }, [activeFilter, profiles]);

  return (
    <div className="space-y-8 py-10">
      <section className="rounded-4xl border border-slate-800 bg-linear-to-b from-slate-950/95 to-slate-900/70 p-8 shadow-[0_30px_120px_rgba(2,6,23,0.45)] md:p-10">
        <p className="text-xs uppercase tracking-[0.28em] text-emerald-400/80">
          Marketplace
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
              Browse Master Traders
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-400 md:text-base">
              Compare active master profiles, risk levels, live status, and
              performance before choosing your strategy.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {riskFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setActiveFilter(filter.value)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  activeFilter === filter.value
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                    : "border-slate-700 bg-slate-900/70 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <MasterProfileCard
              key={index}
              profile={null}
              history={[]}
              loading
              isSubscribed={false}
              subscriptionLocked={false}
              showActions={false}
              showChart={false}
            />
          ))
        ) : filteredProfiles.length === 0 ? (
          <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-950/80 p-8 text-center text-sm text-slate-400">
            No master traders available yet.
          </div>
        ) : (
          filteredProfiles.map((profile) => (
            <MasterProfileCard
              key={profile.id}
              profile={profile}
              history={[]}
              loading={false}
              isSubscribed={false}
              subscriptionLocked={false}
              showActions={false}
              showChart={false}
            />
          ))
        )}
      </section>
    </div>
  );
}
