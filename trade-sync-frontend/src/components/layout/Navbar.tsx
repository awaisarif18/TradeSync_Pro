"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogIn, Shield, Menu } from "lucide-react";
import { useState } from "react";
// Connect to Redux to check if user is logged in
import { useSelector } from "react-redux";
import { RootState } from "../../redux/slices/store";

export default function Navbar() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth,
  );

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Traders", href: "/traders" },
    { name: "Login", href: "/login", icon: LogIn, hidden: isAuthenticated },
    { name: "Register", href: "/register", hidden: isAuthenticated },
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      hidden: !isAuthenticated,
    },
    {
      name: "Admin",
      href: "/admin",
      icon: Shield,
      hidden: user?.role !== "ADMIN",
    },
  ];

  return (
    <nav className="bg-slate-950 border-b border-slate-800 text-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
                style={{ background: "var(--color-mint)", color: "#02110b" }}
              >
                TSP
              </div>
              <span className="font-bold text-xl tracking-tight text-white">
                TradeSync Pro
              </span>
            </Link>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            {navLinks.map(
              (link) =>
                !link.hidden && (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === link.href
                        ? "bg-slate-800 text-white"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {link.icon && <link.icon size={16} />}
                      {link.name}
                    </div>
                  </Link>
                ),
            )}
          </div>
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="text-slate-400 hover:text-white"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
