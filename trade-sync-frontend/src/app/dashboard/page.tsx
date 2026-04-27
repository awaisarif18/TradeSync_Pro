"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/slices/store";
import ProviderDashboard from "../../components/dashboard/ProviderDashboard";
import CopierDashboard from "../../components/dashboard/CopierDashboard";

export default function DashboardPage() {
  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth,
  );
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    } else if (user?.role === "ADMIN") {
      // FIX: Redirect Admin to the Admin Panel immediately
      router.push("/admin");
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || !user) return null;
  if (user.role === "ADMIN") return null; // Prevent flash of content

  return (
    <div className="max-w-7xl mx-auto">
      {user.role === "MASTER" ? <ProviderDashboard /> : <CopierDashboard />}
    </div>
  );
}
