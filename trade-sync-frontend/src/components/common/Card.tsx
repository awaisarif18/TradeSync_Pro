import { LucideIcon } from "lucide-react";

interface CardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  color: "blue" | "emerald" | "purple" | "yellow" | "red";
}

export default function Card({ title, value, icon: Icon, color }: CardProps) {
  const colors = {
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    purple: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    yellow: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
    red: "text-red-500 bg-red-500/10 border-red-500/20",
  };

  return (
    <div
      className={`p-6 rounded-xl border ${colors[color].split(" ")[2]} bg-slate-900`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-400 text-sm font-medium">{title}</h3>
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon size={20} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
