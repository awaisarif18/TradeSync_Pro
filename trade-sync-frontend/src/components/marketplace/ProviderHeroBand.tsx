import { BadgeCheck, ShieldCheck } from "lucide-react";
import { Avatar, Pill, StatusPill } from "../ui";
import type { MasterProfile } from "../../services/api";

type ProviderHeroBandProps = {
  profile: MasterProfile;
  handle: string;
  primaryAsset: string;
  riskLabel: string;
  riskVariant: "outline-mint" | "outline-warn" | "outline-danger";
};

function metaValue(value: string | null | undefined, fallback = "Not set") {
  return value && value.trim() ? value : fallback;
}

export default function ProviderHeroBand({
  profile,
  handle,
  primaryAsset,
  riskLabel,
  riskVariant,
}: ProviderHeroBandProps) {
  return (
    <div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
          <Avatar name={profile.fullName} size={64} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1
                style={{
                  fontSize: 40,
                  fontWeight: 600,
                  letterSpacing: "-0.025em",
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                {profile.fullName}
              </h1>
              <span style={{ color: "var(--color-mint)", display: "flex" }}>
                <BadgeCheck size={22} strokeWidth={2.6} />
              </span>
            </div>
            <div style={{ fontSize: 13, color: "var(--color-text-3)", marginTop: 6 }}>
              @{handle} · {primaryAsset} · Joined{" "}
              <span className="font-mono-tnum" style={{ color: "var(--color-text-2)" }}>
                {new Date(profile.createdAt).toLocaleDateString("en-GB")}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <StatusPill status={profile.isLive ? "live" : "idle"} label={profile.isLive ? "Live now" : "Idle"} />
          <Pill variant={riskVariant}>{riskLabel}</Pill>
          <Pill variant="outline-mint" icon={<ShieldCheck size={13} />}>
            Verified by TradeSync
          </Pill>
        </div>

        <p
          style={{
            fontSize: 17,
            color: "var(--color-text)",
            lineHeight: 1.55,
            maxWidth: 640,
            margin: "0 0 24px",
          }}
        >
          {profile.bio || "This provider hasn't set up their public bio yet."}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
            paddingTop: 20,
            borderTop: "1px solid var(--color-line)",
          }}
        >
          {[
            ["Platform", metaValue(profile.tradingPlatform)],
            ["Typical hold", metaValue(profile.typicalHoldTime)],
            ["Strategy", metaValue(profile.strategyDescription)],
            ["License", "Not public"],
          ].map(([label, value]) => (
            <div key={label}>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--color-text-3)",
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  marginBottom: 4,
                }}
              >
                {label}
              </div>
              <div
                className={label === "License" ? "font-mono-tnum" : undefined}
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: label === "License" ? "var(--color-text-3)" : "var(--color-text)",
                }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>
    </div>
  );
}
