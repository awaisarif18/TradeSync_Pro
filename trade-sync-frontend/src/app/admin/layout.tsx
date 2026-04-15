import AdminSidebar from "./AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* The Sidebar Component you already have */}
      <AdminSidebar />

      {/* The Main Dashboard Content */}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
