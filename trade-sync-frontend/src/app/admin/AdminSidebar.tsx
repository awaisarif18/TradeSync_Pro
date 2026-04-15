import Link from "next/link";
import { Users, Server, Settings, ShieldAlert } from "lucide-react";

export default function AdminSidebar() {
  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 min-h-[calc(100vh-4rem)] p-4 hidden md:block">
      <div className="mb-8 px-2">
        <h2 className="text-xs uppercase text-slate-500 font-semibold tracking-wider">
          Management
        </h2>
      </div>
      <nav className="space-y-1">
        <NavItem href="/admin" icon={Users} label="Users & Licenses" active />
        <NavItem href="/admin/nodes" icon={Server} label="Active Nodes" />
        <NavItem href="/admin/audit" icon={ShieldAlert} label="Audit Logs" />
        <NavItem href="/admin/settings" icon={Settings} label="System Config" />
      </nav>
    </div>
  );
}

function NavItem({ href, icon: Icon, label, active }: any) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
        active
          ? "bg-slate-800 text-white"
          : "text-slate-400 hover:text-white hover:bg-slate-800"
      }`}
    >
      <Icon size={18} />
      {label}
    </Link>
  );
}
