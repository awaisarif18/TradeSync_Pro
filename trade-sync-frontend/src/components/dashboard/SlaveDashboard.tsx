"use client";

import { useEffect, useState } from "react";
import { Radio, ShieldAlert, Users, Zap } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import Card from "../common/Card";
import LiveTradeTable from "./LiveTradeTable";
import MasterProfileCard from "./MasterProfileCard";
import TradeHistoryModal from "./TradeHistoryModal";
import {
  MasterProfile,
  TradeHistoryEntry,
  marketplaceService,
  profileService,
} from "../../services/api";
import { RootState } from "../../redux/slices/store";
import { loginSuccess } from "../../redux/slices/authSlice";

interface MasterUser {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
}

export default function SlaveDashboard() {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  const [masters, setMasters] = useState<MasterUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profilesByMaster, setProfilesByMaster] = useState<
    Record<string, MasterProfile>
  >({});
  const [historyByMaster, setHistoryByMaster] = useState<
    Record<string, TradeHistoryEntry[]>
  >({});
  const [profileError, setProfileError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedMasterName, setSelectedMasterName] = useState("Master");
  const [selectedMasterHistory, setSelectedMasterHistory] = useState<
    TradeHistoryEntry[]
  >([]);
  const [currentSubscription, setCurrentSubscription] = useState<string | null>(
    user?.subscribedToId || null,
  );

  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const data = await marketplaceService.getActiveMasters();
        setMasters(data);

        const profileEntries = await Promise.all(
          data.map(async (master: MasterUser) => {
            const profile = await profileService.getMasterProfile(master.id);
            return [master.id, profile] as const;
          }),
        );

        const historyEntries = await Promise.all(
          data.map(async (master: MasterUser) => {
            const history = await profileService.getMasterHistory(master.id);
            return [master.id, history] as const;
          }),
        );

        setProfilesByMaster(Object.fromEntries(profileEntries));
        setHistoryByMaster(Object.fromEntries(historyEntries));
      } catch (error) {
        console.error("Failed to fetch masters", error);
        setProfileError("Failed to load marketplace insights.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMasters();
  }, []);

  const handleSubscribe = async (masterId: string | null) => {
    if (!user) return;

    try {
      const response = await marketplaceService.updateSubscription(
        user.id,
        masterId,
      );

      setCurrentSubscription(response.subscribedToId);
      dispatch(
        loginSuccess({
          ...user,
          subscribedToId: response.subscribedToId,
        }),
      );
      setInfoMessage(response.message);
      toast.success(response.message || "Subscription updated");
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      const message = err.response?.data?.message || "Failed to update subscription";
      setInfoMessage(message);
      toast.error(message);
      console.error("Failed to update subscription", error);
    }
  };

  const handleViewHistory = (masterId: string, masterName: string) => {
    setSelectedMasterName(masterName);
    setSelectedMasterHistory(historyByMaster[masterId] || []);
    setIsHistoryModalOpen(true);
  };

  const activeMaster = masters.find(
    (master) => master.id === currentSubscription,
  );
  const activeMasterName = activeMaster ? activeMaster.fullName : "None";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Slave Terminal</h2>
          <p className="mt-1 text-sm text-slate-400">
            Compare masters, inspect their identity, and subscribe with
            confidence.
          </p>
        </div>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-mono text-emerald-300">
          STATUS: LISTENING
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card
          title="Active Master"
          value={activeMasterName}
          icon={Radio}
          color="blue"
        />
        <Card title="Latency" value={"< 20ms"} icon={Zap} color="yellow" />
        <Card
          title="Risk Multiplier"
          value="Managed by App"
          icon={ShieldAlert}
          color="red"
        />
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex items-center gap-2">
          <Users className="text-emerald-400" size={24} />
          <h3 className="text-xl font-semibold text-white">
            Master Marketplace
          </h3>
        </div>

        {infoMessage && (
          <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-300">
            {infoMessage}
          </div>
        )}

        {profileError && (
          <div className="mt-4 rounded-xl border border-red-900/70 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {profileError}
          </div>
        )}

        {isLoading ? (
          <div className="mt-6 text-sm text-slate-400">
            Loading available Masters...
          </div>
        ) : masters.length === 0 ? (
          <div className="mt-6 text-sm text-slate-500">
            No active Masters available.
          </div>
        ) : (
          <div className="mt-6 grid gap-5 xl:grid-cols-2 2xl:grid-cols-3">
            {masters.map((master) => {
              const isSubscribed = currentSubscription === master.id;
              const profile = profilesByMaster[master.id] || null;
              const history = historyByMaster[master.id] || [];

              return (
                <MasterProfileCard
                  key={master.id}
                  profile={profile}
                  history={history}
                  loading={!profile}
                  isSubscribed={isSubscribed}
                  subscriptionLocked={
                    currentSubscription !== null && !isSubscribed
                  }
                  onSubscribe={handleSubscribe}
                  onViewHistory={() =>
                    handleViewHistory(master.id, master.fullName)
                  }
                />
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-4 text-lg font-medium text-white">
          Incoming Signals
        </h3>
        <LiveTradeTable />
      </div>

      <TradeHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        history={selectedMasterHistory}
        loading={false}
        masterName={selectedMasterName}
      />
    </div>
  );
}
