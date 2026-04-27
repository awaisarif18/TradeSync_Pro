"use client";

/**
 * @deprecated Phase 6 UI overhaul moved the provider profile form into
 * src/components/dashboard/ProviderDashboard.tsx. Kept for older imports.
 */
import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import {
  MasterProfile,
  UpdateMasterProfileDto,
  profileService,
} from "../../services/api";

interface MasterProfileSetupProps {
  masterId: string;
  existingProfile: MasterProfile | null;
  onSaved: (updated: MasterProfile) => void;
}

function createInitialFormData(
  existingProfile: MasterProfile | null,
): UpdateMasterProfileDto {
  return {
    bio: existingProfile?.bio ?? "",
    tradingPlatform: existingProfile?.tradingPlatform ?? "",
    instruments: existingProfile?.instruments ?? "",
    strategyDescription: existingProfile?.strategyDescription ?? "",
    riskLevel: existingProfile?.riskLevel ?? "MEDIUM",
    typicalHoldTime: existingProfile?.typicalHoldTime ?? "",
  };
}

export default function MasterProfileSetup({
  masterId,
  existingProfile,
  onSaved,
}: MasterProfileSetupProps) {
  const [formData, setFormData] = useState<UpdateMasterProfileDto>(
    createInitialFormData(existingProfile),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setFormData(createInitialFormData(existingProfile));
  }, [existingProfile]);

  useEffect(() => {
    if (!saved) {
      return;
    }

    const timeoutId = window.setTimeout(() => setSaved(false), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [saved]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await profileService.updateMasterProfile(
        masterId,
        formData,
      );

      const updatedProfile: MasterProfile = existingProfile
        ? {
            ...existingProfile,
            bio: response.bio,
            tradingPlatform: response.tradingPlatform,
            instruments: response.instruments,
            strategyDescription: response.strategyDescription,
            riskLevel: response.riskLevel,
            typicalHoldTime: response.typicalHoldTime,
          }
        : {
            id: response.id,
            fullName: response.fullName,
            createdAt: response.createdAt,
            totalTrades: 0,
            closedTrades: 0,
            winRate: 0,
            avgVolume: 0,
            totalPnL: 0,
            bio: response.bio,
            tradingPlatform: response.tradingPlatform,
            instruments: response.instruments,
            strategyDescription: response.strategyDescription,
            riskLevel: response.riskLevel,
            typicalHoldTime: response.typicalHoldTime,
            subscriberCount: 0,
            isLive: false,
          };

      setSaved(true);
      onSaved(updatedProfile);
    } catch (error) {
      console.error("Failed to save master profile", error);
    } finally {
      setSaving(false);
    }
  };

  const riskLevel = formData.riskLevel ?? "MEDIUM";

  const riskButtonClass = (level: string) => {
    const base =
      "rounded-full px-4 py-2 text-xs font-semibold border transition-colors";

    if (riskLevel === level) {
      if (level === "LOW")
        return `${base} bg-emerald-500/15 text-emerald-300 border-emerald-500/50`;
      if (level === "HIGH")
        return `${base} bg-red-500/15 text-red-300 border-red-500/50`;
      return `${base} bg-yellow-500/15 text-yellow-200 border-yellow-500/50`;
    }

    return `${base} bg-slate-950/80 text-slate-400 border-slate-800 hover:border-slate-600`;
  };

  return (
    <form
      onSubmit={handleSave}
      className="space-y-6 rounded-2xl border border-slate-800 bg-slate-950/80 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.35)]"
    >
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
          Master Identity
        </p>
        <h3 className="mt-2 text-xl font-semibold text-white">Profile Setup</h3>
        <p className="mt-1 text-sm text-slate-400">
          Tell slaves who you are, how you trade, and what they can expect.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-200">
          About Your Trading
        </label>
        <textarea
          value={formData.bio ?? ""}
          onChange={(event) =>
            setFormData((current) => ({ ...current, bio: event.target.value }))
          }
          placeholder="Describe your trading experience, approach, and what makes your signals worth following..."
          maxLength={300}
          rows={5}
          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-emerald-500"
        />
        <div className="text-right text-xs text-slate-500">
          {(formData.bio ?? "").length} / 300
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200">
            Broker / Platform
          </label>
          <input
            type="text"
            value={formData.tradingPlatform ?? ""}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                tradingPlatform: event.target.value,
              }))
            }
            placeholder="e.g. Vantage International, XM, IC Markets"
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-emerald-500"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200">
            Typical Trade Duration
          </label>
          <select
            aria-label="Typical Trade Duration"
            value={formData.typicalHoldTime ?? ""}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                typicalHoldTime: event.target.value,
              }))
            }
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-emerald-500"
          >
            <option value="">Select duration</option>
            <option value="Seconds">Seconds</option>
            <option value="Minutes">Minutes</option>
            <option value="Hours">Hours</option>
            <option value="Days">Days</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-200">
          Instruments You Trade
        </label>
        <input
          type="text"
          value={formData.instruments ?? ""}
          onChange={(event) =>
            setFormData((current) => ({
              ...current,
              instruments: event.target.value,
            }))
          }
          placeholder="e.g. XAUUSD, EURUSD, US30, BTCUSD"
          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-emerald-500"
        />
        <p className="text-xs text-slate-500">
          Comma-separated. This helps slaves set up their symbol mapping.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-200">
          Trading Strategy
        </label>
        <input
          type="text"
          value={formData.strategyDescription ?? ""}
          onChange={(event) =>
            setFormData((current) => ({
              ...current,
              strategyDescription: event.target.value,
            }))
          }
          placeholder="e.g. Gold scalping on H1, news-based entries"
          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-emerald-500"
        />
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-200">Risk Level</label>
        <div className="flex flex-wrap gap-3">
          {(["LOW", "MEDIUM", "HIGH"] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() =>
                setFormData((current) => ({ ...current, riskLevel: level }))
              }
              className={riskButtonClass(level)}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 pt-2">
        <div className="text-xs text-slate-500">
          Saved profile updates will appear on the dashboard and in the public
          marketplace.
        </div>
        <button
          type="submit"
          disabled={saving}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-colors ${
            saved
              ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
              : "border border-emerald-500/30 bg-emerald-500 text-slate-950 hover:bg-emerald-400"
          } ${saving ? "cursor-not-allowed opacity-80" : ""}`}
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <CheckCircle2 size={16} />
              Saved
            </>
          ) : (
            "Save Profile"
          )}
        </button>
      </div>
    </form>
  );
}
