import Link from "next/link";
import {
  ArrowRight,
  Globe,
  ShieldCheck,
  Zap,
  type LucideIcon,
} from "lucide-react";
import TopTradersSection from "../components/landing/TopTradersSection";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center space-y-16 pt-12">
      <div className="text-center space-y-6 max-w-3xl">
        <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
          Institutional Grade{" "}
          <span className="text-blue-500">Copy Trading</span>
        </h1>
        <p className="text-lg text-slate-400">
          Bridge MetaTrader 5 terminals across brokers with sub-millisecond
          latency.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/register"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold flex items-center gap-2 transition"
          >
            Get Started <ArrowRight size={20} />
          </Link>
          <Link
            href="/login"
            className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 rounded-lg font-semibold transition"
          >
            Login
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 w-full max-w-6xl">
        <FeatureCard
          icon={Zap}
          title="Ultra Low Latency"
          desc="Direct socket connection ensures trades copy instantly."
        />
        <FeatureCard
          icon={ShieldCheck}
          title="Risk Guard"
          desc="Prevent loops with Magic Number filtering."
        />
        <FeatureCard
          icon={Globe}
          title="Multi-Broker Bridge"
          desc="Copy from Vantage to XM or any MT5 broker."
        />
      </div>

      <TopTradersSection />
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl hover:border-blue-500/50 transition duration-300">
      <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4 text-blue-500">
        <Icon size={24} />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}
