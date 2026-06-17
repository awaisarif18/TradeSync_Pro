"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import type { DocsNavGroup } from "@/lib/docs";

type SidebarProps = {
  nav: DocsNavGroup[];
};

export default function Sidebar({ nav }: SidebarProps) {
  const pathname = usePathname();
  const currentSlug = pathname.replace(/^\/docs\/?/, "");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const activeSection = useMemo(() => {
    for (const group of nav) {
      if (group.items.some((item) => item.slug === currentSlug)) {
        return group.section;
      }
    }
    return nav[0]?.section ?? "";
  }, [nav, currentSlug]);

  const toggleSection = (section: string) => {
    setCollapsed((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <>
      <button
        type="button"
        className="docs-mobile-toggle"
        onClick={() => setMobileOpen((open) => !open)}
        aria-label={mobileOpen ? "Close docs menu" : "Open docs menu"}
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        <span>Browse docs</span>
      </button>

      <aside className={`docs-sidebar${mobileOpen ? " open" : ""}`}>
        <div className="docs-sidebar-inner">
          <nav className="docs-sidebar-nav">
            {nav.map((group) => {
              const isOpen =
                collapsed[group.section] !== true ||
                group.section === activeSection;

              return (
                <div key={group.section} className="docs-sidebar-group">
                  <button
                    type="button"
                    className="docs-sidebar-section"
                    onClick={() => toggleSection(group.section)}
                    aria-expanded={isOpen}
                  >
                    <span>{group.section}</span>
                    <ChevronDown
                      size={14}
                      style={{
                        transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
                        transition: "transform 0.15s",
                      }}
                    />
                  </button>
                  {isOpen ? (
                    <ul className="docs-sidebar-list">
                      {group.items.map((item) => {
                        const active = item.slug === currentSlug;
                        return (
                          <li key={item.slug}>
                            <Link
                              href={`/docs/${item.slug}`}
                              className={
                                active
                                  ? "docs-sidebar-link active"
                                  : "docs-sidebar-link"
                              }
                              onClick={() => setMobileOpen(false)}
                            >
                              {item.title}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </nav>
        </div>
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          className="docs-sidebar-backdrop"
          aria-label="Close docs menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
    </>
  );
}
