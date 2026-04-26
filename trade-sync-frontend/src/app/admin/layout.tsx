import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="border-b border-slate-800 bg-slate-950/95 px-6 py-4">
        <div className="flex items-center gap-6 text-sm font-medium">
          <Link
            href="/admin"
            className="text-emerald-400 transition-colors hover:text-emerald-300"
          >
            Users
          </Link>
          <span className="text-slate-600">Nodes</span>
          <span className="text-slate-600">Audit</span>
          <span className="text-slate-600">Settings</span>
        </div>
      </nav>

      <div className="w-full overflow-auto">{children}</div>
    </div>
  );
}
