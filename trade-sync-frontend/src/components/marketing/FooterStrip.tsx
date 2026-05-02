import Link from "next/link";
import type { CSSProperties } from "react";
import Logo from "../ui/Logo";

const microHeading: CSSProperties = {
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  color: "var(--color-text-3)",
  marginBottom: 16,
};

const footerLinkStyle: CSSProperties = {
  display: "block",
  marginBottom: 10,
  color: "var(--color-text-2)",
  fontSize: 14,
  textDecoration: "none",
  transition: "color 0.15s",
};

export default function FooterStrip() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        background: "var(--color-surface)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="footer-strip-inner mx-auto max-w-[1240px] px-8 py-16">
        <div className="footer-strip-columns">
          <div>
            <Logo size="md" asLink />
            <p
              style={{
                marginTop: 16,
                fontSize: 14,
                lineHeight: 1.55,
                color: "var(--color-text-2)",
                maxWidth: 280,
              }}
            >
              Mirror the world&apos;s best traders, in milliseconds.
            </p>
          </div>

          <div>
            <div style={{ ...microHeading, fontWeight: 600 }}>Product</div>
            <nav style={{ display: "flex", flexDirection: "column" }}>
              <Link href="/traders" className="footer-strip-hover" style={footerLinkStyle}>
                Discover
              </Link>
              <Link href="/dashboard" className="footer-strip-hover" style={footerLinkStyle}>
                Dashboard
              </Link>
              <Link href="/#how" className="footer-strip-hover" style={footerLinkStyle}>
                How it works
              </Link>
              <Link href="/register" className="footer-strip-hover" style={footerLinkStyle}>
                Get started
              </Link>
            </nav>
          </div>

          <div>
            <div style={{ ...microHeading, fontWeight: 600 }}>Company</div>
            <nav style={{ display: "flex", flexDirection: "column" }}>
              <Link href="#" className="footer-strip-hover" style={footerLinkStyle}>
                About
              </Link>
              <Link href="/#contact" className="footer-strip-hover" style={footerLinkStyle}>
                Contact
              </Link>
              <Link href="/#docs" className="footer-strip-hover" style={footerLinkStyle}>
                Documentation
              </Link>
            </nav>
          </div>
        </div>

        <div
          style={{
            marginTop: 48,
            paddingTop: 32,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
          className="footer-strip-bottom"
        >
          <div
            className="footer-strip-legal-rows"
            style={{
              fontSize: 11,
              color: "var(--color-text-3)",
              lineHeight: 1.5,
            }}
          >
            <span style={{ letterSpacing: "0.02em" }}>
              © {year} TradeSync Pro. All rights reserved.
            </span>
            <span>
              Trading involves risk. Past performance does not guarantee future results.
            </span>
          </div>
        </div>
      </div>

      <style>{`
        .footer-strip-hover:hover {
          color: var(--color-text) !important;
        }

        .footer-strip-columns {
          display: grid;
          gap: 48px;
          grid-template-columns: 1fr;
        }

        .footer-strip-legal-rows {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        @media (min-width: 768px) {
          .footer-strip-columns {
            grid-template-columns: 1.5fr 1fr 1fr;
          }

          .footer-strip-legal-rows {
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-start;
            gap: 24px;
          }
        }
      `}</style>
    </footer>
  );
}
