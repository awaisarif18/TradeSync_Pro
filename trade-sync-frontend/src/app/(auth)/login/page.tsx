"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import EquityCurve from "../../../components/charts/EquityCurve";
import TradeRow, { type Trade } from "../../../components/feed/TradeRow";
import { Avatar, Button, Card, CardBody, Input, Logo, Pill, StatusPill } from "../../../components/ui";
import { loginSuccess } from "../../../redux/slices/authSlice";
import { authService } from "../../../services/api";

type AuthUser = {
  id: string;
  email: string;
  fullName?: string;
  role: "MASTER" | "SLAVE" | "ADMIN" | null;
  licenseKey?: string | null;
  subscribedToId?: string | null;
};

type LoginFieldErrors = {
  email?: string;
  password?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const railTrades: Trade[] = [
  { time: "14:22:08", side: "BUY", sym: "XAUUSD", who: "Sasha Ng", qty: "0.50", px: "2,418.40", pnl: 0.42 },
  { time: "14:21:55", side: "SELL", sym: "EURUSD", who: "Sasha Ng", qty: "1.00", px: "1.0843", pnl: 0.18 },
  { time: "14:21:31", side: "BUY", sym: "BTCUSDT", who: "M. Aurelio", qty: "0.12", px: "109,820", pnl: 0.94 },
];

function authErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    if (typeof response?.data?.message === "string") return response.data.message;
  }

  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function validateLoginForm(formData: { email: string; password: string }): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  const email = formData.email.trim();

  if (!email) {
    errors.email = "Email is required";
  } else if (!EMAIL_RE.test(email)) {
    errors.email = "Enter a valid email address";
  }

  if (!formData.password) {
    errors.password = "Password is required";
  } else if (formData.password.length < 5) {
    errors.password = "Password must be at least 5 characters";
  }

  return errors;
}

export default function LoginPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const [activeRole, setActiveRole] = useState<"copier" | "provider">("copier");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [touched, setTouched] = useState<Record<keyof LoginFieldErrors, boolean>>({
    email: false,
    password: false,
  });
  const [formData, setFormData] = useState({ email: "", password: "" });
  const validationErrors = validateLoginForm(formData);
  const isFormValid = Object.keys(validationErrors).length === 0;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched({ email: true, password: true });
    setFieldErrors(validationErrors);

    if (!isFormValid) {
      return;
    }

    setIsLoading(true);
    setFieldErrors({});

    try {
      const user = (await authService.login(formData.email.trim(), formData.password)) as AuthUser;
      dispatch(loginSuccess(user));
      toast.success(`Welcome back${user.fullName ? `, ${user.fullName}` : ""}`);
      router.push("/dashboard");
    } catch (error: unknown) {
      console.error("Login Failed:", error);
      const message = authErrorMessage(error, "Invalid credentials");
      setFieldErrors({ password: message });
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-left">
        <Logo size="md" asLink />
        <div className="auth-form">
          <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.025em", margin: "0 0 8px" }}>
            Welcome back.
          </h1>
          <p style={{ fontSize: 15, color: "var(--color-text-2)", margin: "0 0 28px" }}>
            Sign in to your TradeSync account to mirror trades or publish your strategy.
          </p>

          {/* TODO: Decorative only. Login is role-agnostic; the real role comes from /auth/login. */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 4,
              background: "var(--color-surface)",
              padding: 4,
              borderRadius: 12,
              border: "1px solid var(--color-line)",
              marginBottom: 24,
            }}
          >
            {[
              { value: "copier" as const, label: "Copier", description: "Mirror providers", color: "var(--color-violet)" },
              { value: "provider" as const, label: "Provider", description: "Publish strategies", color: "var(--color-mint)" },
            ].map((option) => {
              const active = activeRole === option.value;
              return (
                <span
                  key={option.value}
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveRole(option.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") setActiveRole(option.value);
                  }}
                  style={{
                    background: active ? "var(--color-surface-2)" : "transparent",
                    padding: "12px 14px",
                    cursor: "pointer",
                    borderRadius: 8,
                    color: active ? "var(--color-text)" : "var(--color-text-2)",
                    textAlign: "left",
                    borderLeft: active ? `2px solid ${option.color}` : "2px solid transparent",
                    transition: "background .12s",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: active ? option.color : "var(--color-text)" }}>
                    {option.label}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-3)", marginTop: 2 }}>
                    {option.description}
                  </div>
                </span>
              );
            })}
          </div>

          <Button
            variant="ghost"
            fullWidth
            disabled
            title="Coming soon"
            leftIcon={<span style={{ fontWeight: 700 }}>G</span>}
          >
            Continue with Google
          </Button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0 16px", color: "var(--color-text-3)", fontSize: 12 }}>
            <div style={{ flex: 1, height: 1, background: "var(--color-line)" }} />
            or with email
            <div style={{ flex: 1, height: 1, background: "var(--color-line)" }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Input
              label="Email"
              type="email"
              placeholder="you@firm.com"
              value={formData.email}
              onBlur={() => setTouched((current) => ({ ...current, email: true }))}
              onChange={(event) => {
                setFormData({ ...formData, email: event.target.value });
                setFieldErrors((current) => ({ ...current, email: undefined }));
              }}
              error={fieldErrors.email ?? (touched.email ? validationErrors.email : undefined)}
              required
            />
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: "var(--color-text-2)" }}>Password</span>
                <Link href="#" style={{ fontSize: 12, color: "var(--color-mint)", textDecoration: "none" }}>
                  Forgot?
                </Link>
              </div>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.password}
                onBlur={() => setTouched((current) => ({ ...current, password: true }))}
                onChange={(event) => {
                  setFormData({ ...formData, password: event.target.value });
                  setFieldErrors((current) => ({ ...current, password: undefined }));
                }}
                rightIcon={
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={() => setShowPassword((value) => !value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") setShowPassword((value) => !value);
                    }}
                    style={{ display: "inline-flex", cursor: "pointer" }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </span>
                }
                error={fieldErrors.password ?? (touched.password ? validationErrors.password : undefined)}
                required
              />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--color-text-2)", cursor: "pointer" }}>
              <input type="checkbox" defaultChecked style={{ accentColor: "var(--color-mint)" }} />
              Keep me signed in on this device
            </label>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={isLoading}
              disabled={!isFormValid || isLoading}
              rightIcon={<ArrowRight size={16} />}
            >
              Sign in
            </Button>
          </form>

          <p style={{ fontSize: 13, color: "var(--color-text-2)", textAlign: "center", marginTop: 24 }}>
            Don&apos;t have an account?{" "}
            <Link href="/register" style={{ color: "var(--color-mint)", textDecoration: "none" }}>
              Create one
            </Link>
          </p>
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-3)", textAlign: "center" }}>
          Protected by <span className="font-mono-tnum">2</span>FA · SOC <span className="font-mono-tnum">2</span> Type II · Your MT5 credentials never leave your device
        </div>
      </div>

      <div className="auth-rail">
        <div className="auth-glow" />
        <div style={{ position: "relative" }}>
          <div style={{ marginBottom: 28 }}>
            <StatusPill status="live" label="1,284 traders online" mono />
          </div>
          <div style={{ marginBottom: 16 }}>
            <Card>
              <CardBody>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--color-text-3)", textTransform: "uppercase", letterSpacing: 0.6 }}>
                      Today&apos;s PnL
                    </div>
                    <div className="font-mono-tnum" style={{ fontSize: 28, fontWeight: 600, color: "var(--color-mint)", marginTop: 2 }}>
                      +$2,184.50
                    </div>
                  </div>
                  <Pill variant="outline-mint">
                    <span className="font-mono-tnum">+4.74%</span>
                  </Pill>
                </div>
                <div style={{ marginTop: 12 }}>
                  <EquityCurve height={120} />
                </div>
              </CardBody>
            </Card>
          </div>
          <Card>
            <CardBody>
              <div style={{ fontSize: 11, color: "var(--color-text-3)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 }}>
                Just executed
              </div>
              {railTrades.map((trade) => (
                <TradeRow key={`${trade.time}-${trade.sym}`} trade={trade} columns="compact" />
              ))}
            </CardBody>
          </Card>
        </div>
        <blockquote style={{ position: "relative", margin: 0, fontSize: 17, lineHeight: 1.5, color: "var(--color-text)", maxWidth: 380, fontWeight: 400 }}>
          &quot;Connected my MT5 in three minutes. Mirror lag is genuinely sub-second on Sasha&apos;s gold trades, better than two paid services I&apos;ve used.&quot;
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar name="Daniel R." size={32} color="#7cc4ff" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Daniel R.</div>
              <div style={{ fontSize: 11, color: "var(--color-text-3)" }}>
                Copying since Jan <span className="font-mono-tnum">2026</span> · <span className="font-mono-tnum">+38.2%</span> YTD
              </div>
            </div>
          </div>
        </blockquote>
      </div>

      <style>{`
        .auth-shell {
          min-height: calc(100vh - 64px);
          display: grid;
          grid-template-columns: 1fr 1fr;
          margin: -32px -16px;
        }

        .auth-left {
          display: flex;
          flex-direction: column;
          padding: 40px 56px;
        }

        .auth-form {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          max-width: 460px;
          margin: 0 auto;
          width: 100%;
        }

        .auth-rail {
          background: var(--color-surface);
          border-left: 1px solid var(--color-line);
          padding: 40px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
        }

        .auth-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(900px 500px at 80% -10%, rgba(0,195,137,0.10), transparent 60%);
          pointer-events: none;
        }

        @media (max-width: 1023px) {
          .auth-shell {
            display: block;
          }

          .auth-rail {
            display: none;
          }
        }

        @media (max-width: 639px) {
          .auth-left {
            padding: 28px 20px;
          }
        }
      `}</style>
    </div>
  );
}
