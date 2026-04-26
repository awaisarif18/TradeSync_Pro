import Link from "next/link";
import {
  ArrowRight,
  Globe,
  ShieldCheck,
  Zap,
  type LucideIcon,
} from "lucide-react";

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

      <section className="w-full max-w-6xl rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.35)]">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-blue-400">
              Marketplace
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">
              Ready to find your strategy?
            </h2>
          </div>
          <Link
            href="/traders"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Browse Traders <ArrowRight size={18} />
          </Link>
        </div>
      </section>
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
