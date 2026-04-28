"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import RiskFilter from "../../components/marketplace/RiskFilter";
import TraderCard, {
  type TraderCardData,
} from "../../components/marketplace/TraderCard";
import TraderCardSkeleton from "../../components/marketplace/TraderCardSkeleton";
import { Button, Card, CardBody, EmptyState, SectionEyebrow } from "../../components/ui";
import { mapMasterProfileToTraderCardData } from "../../lib/mapMasterToTraderCard";
import { MasterProfile, marketplaceService } from "../../services/api";

type RiskFilterValue = "ALL" | "LOW" | "MEDIUM" | "HIGH";

interface ActiveMaster {
  id: string;
  fullName?: string;
  email?: string;
  createdAt?: string;
}

function toTraderCardData(
  master: ActiveMaster,
  profile: MasterProfile | null,
  liveIds: string[],
): TraderCardData {
  return mapMasterProfileToTraderCardData(master, profile, liveIds);
}

export default function TradersPage() {
  const router = useRouter();
  const [providers, setProviders] = useState<TraderCardData[]>([]);
  const [activeFilter, setActiveFilter] = useState<RiskFilterValue>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadMasters = async () => {
      setLoading(true);
      setError(false);

      try {
        const [masters, live] = await Promise.all([
          marketplaceService.getActiveMasters() as Promise<ActiveMaster[]>,
          marketplaceService.getLiveMasters(),
        ]);

        const providerRows = await Promise.all(
          masters.map(async (master) => {
            try {
              const profile = await marketplaceService.getMasterProfile(master.id);
              return toTraderCardData(master, profile, live.liveIds);
            } catch (profileError) {
              console.error(`Failed to load provider profile ${master.id}`, profileError);
              return toTraderCardData(master, null, live.liveIds);
            }
          }),
        );

        setProviders(providerRows);
      } catch (error) {
        console.error("Failed to load providers", error);
        setProviders([]);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadMasters();
  }, []);

  const counts = useMemo(
    () => ({
      all: providers.length,
      low: providers.filter((provider) => provider.riskLevel === "LOW").length,
      medium: providers.filter((provider) => provider.riskLevel === "MEDIUM").length,
      high: providers.filter((provider) => provider.riskLevel === "HIGH").length,
    }),
    [providers],
  );

  const filteredProviders = useMemo(() => {
    if (activeFilter === "ALL") return providers;
    return providers.filter((provider) => provider.riskLevel === activeFilter);
  }, [activeFilter, providers]);

  return (
    <div style={{ padding: "32px 0 80px" }}>
      <section style={{ maxWidth: 1240, margin: "0 auto", padding: "0 32px 32px" }}>
        <Card>
          <CardBody>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 24,
                alignItems: "flex-start",
              }}
            >
              <div>
                <SectionEyebrow color="mint">Marketplace</SectionEyebrow>
                <h1
                  style={{
                    fontSize: 36,
                    fontWeight: 600,
                    letterSpacing: "-0.025em",
                    margin: "10px 0 12px",
                  }}
                >
                  Browse Providers
                </h1>
                <p
                  style={{
                    fontSize: 15,
                    color: "var(--color-text-2)",
                    lineHeight: 1.5,
                    margin: 0,
                    maxWidth: 540,
                  }}
                >
                  Compare active provider profiles, risk levels, live status, and performance
                  before choosing your strategy.
                </p>
              </div>
              <RiskFilter value={activeFilter} counts={counts} onChange={setActiveFilter} />
            </div>
          </CardBody>
        </Card>
      </section>

      <section style={{ maxWidth: 1240, margin: "0 auto", padding: "0 32px 80px" }}>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {Array.from({ length: 6 }).map((_, index) => (
              <TraderCardSkeleton key={index} />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            title="Couldn't load providers"
            description="The marketplace data could not be loaded. Check the backend and try again."
            action={
              <Button variant="ghost-mint" onClick={() => window.location.reload()}>
                Retry
              </Button>
            }
          />
        ) : filteredProviders.length === 0 ? (
          <EmptyState
            title="No providers match your filter"
            description="Try another risk level or clear the filter."
            action={
              <Button variant="ghost-mint" onClick={() => setActiveFilter("ALL")}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {filteredProviders.map((provider) => (
              <TraderCard
                key={provider.id}
                trader={provider}
                mode="marketplace"
                onAction={() => router.push(`/traders/${provider.id}`)}
                actionLabel="View profile"
              />
            ))}
          </div>
        )}
      </section>
      <style>{`
        @media (max-width: 1023px) {
          section div[style*="repeat(3"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }

        @media (max-width: 639px) {
          section div[style*="repeat(3"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
