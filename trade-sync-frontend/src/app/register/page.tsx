"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
import EquityCurve from "../../components/charts/EquityCurve";
import TraderCard, { type TraderCardData } from "../../components/marketplace/TraderCard";
import { Button, Card, CardBody, Input, Logo, Pill, SectionEyebrow } from "../../components/ui";
import { authService } from "../../services/api";

type RegisterRole = "MASTER" | "SLAVE";

const providerPreview: TraderCardData = {
  id: "future-provider",
  fullName: "Your Strategy",
  handle: "your_edge",
  primaryAsset: "Forex · Gold",
  riskLevel: "MEDIUM",
  roi30d: 31.4,
  winRate: 69,
  subscriberCount: 982,
  isLive: true,
  tradingPlatform: "MT5",
  typicalHoldTime: "Hours",
  strategyDescription: "Discretionary",
  bio: "Package your trading style into a provider profile copiers can trust.",
};

function authErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    if (typeof response?.data?.message === "string") return response.data.message;
  }

  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<RegisterRole>("SLAVE");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const isProvider = role === "MASTER";
  const roleColor = isProvider ? "var(--color-mint)" : "var(--color-violet)";
  const roleSoft = isProvider ? "var(--color-mint-soft)" : "var(--color-violet-soft)";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setFieldError("");

    try {
      await authService.register({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        role,
      });

      toast.success("Account created. Sign in to continue");
      router.push("/login");
    } catch (error: unknown) {
      console.error("Registration Error:", error);
      const message = authErrorMessage(error, "Registration failed");
      setFieldError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-shell">
      <div className="register-left">
        <Logo size="md" asLink />
        <div className="register-form">
          <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.025em", margin: "0 0 8px" }}>
            Create your account.
          </h1>
          <p style={{ fontSize: 15, color: "var(--color-text-2)", margin: "0 0 24px" }}>
            Join the network, mirror verified strategies or publish your own.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 4,
              background: "var(--color-surface)",
              padding: 4,
              borderRadius: 12,
              border: "1px solid var(--color-line)",
              marginBottom: 18,
            }}
          >
            {[
              { value: "MASTER" as const, label: "I'm a Provider", description: "Publish strategies", color: "var(--color-mint)", ink: "#02110b" },
              { value: "SLAVE" as const, label: "I'm a Copier", description: "Mirror providers", color: "var(--color-violet)", ink: "#ffffff" },
            ].map((option) => {
              const active = role === option.value;
              return (
                <span
                  key={option.value}
                  role="button"
                  tabIndex={0}
                  onClick={() => setRole(option.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") setRole(option.value);
                  }}
                  style={{
                    background: active ? option.color : "transparent",
                    padding: "12px 14px",
                    cursor: "pointer",
                    borderRadius: 8,
                    color: active ? option.ink : "var(--color-text-2)",
                    textAlign: "left",
                    transition: "background .12s, color .12s",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{option.label}</div>
                  <div style={{ fontSize: 11, opacity: active ? 0.7 : 1, color: active ? option.ink : "var(--color-text-3)", marginTop: 2 }}>
                    {option.description}
                  </div>
                </span>
              );
            })}
          </div>

          <div style={{ marginBottom: 22 }}>
            <Card
              style={{
                background: roleSoft,
                borderTopColor: roleColor,
                borderRightColor: roleColor,
                borderBottomColor: roleColor,
                borderLeftColor: roleColor,
              }}
            >
              <CardBody>
                <SectionEyebrow color={isProvider ? "mint" : "violet"}>
                  {isProvider ? "Provider account" : "Copier account"}
                </SectionEyebrow>
                <p style={{ margin: "8px 0 0", color: "var(--color-text-2)", fontSize: 13, lineHeight: 1.55 }}>
                  {isProvider
                    ? "You'll broadcast your trades. After registration, an admin will issue your license key; it is required to activate broadcasting from your desktop terminal."
                    : "You'll mirror trades from verified providers. After registration, browse the marketplace, pick a provider, and run our desktop client to start copying. Your MT5 credentials stay on your machine."}
                </p>
              </CardBody>
            </Card>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Input
              label="Full Name"
              placeholder={role === "MASTER" ? "John Doe" : "Jane Smith"}
              value={formData.fullName}
              onChange={(event) => setFormData({ ...formData, fullName: event.target.value })}
              error={fieldError}
              required
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@firm.com"
              value={formData.email}
              onChange={(event) => setFormData({ ...formData, email: event.target.value })}
              error={fieldError}
              required
            />
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={formData.password}
              onChange={(event) => setFormData({ ...formData, password: event.target.value })}
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
              error={fieldError}
              required
            />
            <Button type="submit" variant="primary" fullWidth loading={isLoading} rightIcon={<ArrowRight size={16} />}>
              {role === "MASTER" ? "Create Provider account" : "Create Copier account"}
            </Button>
          </form>

          <p style={{ fontSize: 13, color: "var(--color-text-2)", textAlign: "center", marginTop: 24 }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--color-mint)", textDecoration: "none" }}>
              Sign in
            </Link>
          </p>
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-3)", textAlign: "center" }}>
          By creating an account you agree to our Terms and Privacy Policy.
        </div>
      </div>

      <div className="register-rail">
        <div className="register-glow" style={{ background: isProvider ? "radial-gradient(900px 500px at 80% -10%, rgba(0,195,137,0.10), transparent 60%)" : "radial-gradient(900px 500px at 80% -10%, rgba(124,92,255,0.12), transparent 60%)" }} />
        <div style={{ position: "relative" }}>
          <SectionEyebrow color={isProvider ? "mint" : "violet"}>
            {isProvider ? "Provider perspective" : "Copier perspective"}
          </SectionEyebrow>
          <h2 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.025em", margin: "10px 0 22px", maxWidth: 420 }}>
            {isProvider ? "Publish once. Earn while you trade." : "Find your edge. Mirror it automatically."}
          </h2>
          <div style={{ display: "grid", gap: 14, marginBottom: 24 }}>
            {(isProvider
              ? ["Turn live execution into a public provider profile.", "Let copiers compare your risk, style, and track record.", "Keep trading from MT5 while TradeSync handles fanout."]
              : ["Browse verified providers by risk, style, and live status.", "Mirror trades to your MT5 account with your own sizing.", "Stay in control with local execution from the desktop client."]
            ).map((benefit) => (
              <div key={benefit} style={{ display: "flex", alignItems: "flex-start", gap: 10, color: "var(--color-text-2)", fontSize: 14, lineHeight: 1.45 }}>
                <CheckCircle2 size={18} color={roleColor} />
                {benefit}
              </div>
            ))}
          </div>

          {isProvider ? (
            <div>
              <div style={{ marginBottom: -10, position: "relative", zIndex: 1, display: "flex", justifyContent: "flex-end" }}>
                <Pill variant="mint">your future profile</Pill>
              </div>
              <TraderCard trader={providerPreview} mode="preview" />
            </div>
          ) : (
            <Card>
              <CardBody>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div>
                    <Pill variant="violet">your future dashboard</Pill>
                    <div style={{ fontSize: 13, color: "var(--color-text-3)", marginTop: 12 }}>Copying Sasha Ng</div>
                  </div>
                  <div className="font-mono-tnum" style={{ color: "var(--color-violet)", fontSize: 20, fontWeight: 600 }}>
                    +18.4%
                  </div>
                </div>
                <EquityCurve height={160} accent="var(--color-violet)" />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 16 }}>
                  {[
                    ["Trades", "142"],
                    ["Win rate", "71%"],
                    ["Copiers", "1,842"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div style={{ fontSize: 10, color: "var(--color-text-3)", textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</div>
                      <div className="font-mono-tnum" style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>{value}</div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      <style>{`
        .register-shell {
          min-height: calc(100vh - 64px);
          display: grid;
          grid-template-columns: 1fr 1fr;
          margin: -32px -16px;
        }

        .register-left {
          display: flex;
          flex-direction: column;
          padding: 40px 56px;
        }

        .register-form {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          max-width: 460px;
          margin: 0 auto;
          width: 100%;
        }

        .register-rail {
          background: var(--color-surface);
          border-left: 1px solid var(--color-line);
          padding: 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .register-glow {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        @media (max-width: 1023px) {
          .register-shell {
            display: block;
          }

          .register-rail {
            display: none;
          }
        }

        @media (max-width: 639px) {
          .register-left {
            padding: 28px 20px;
          }
        }
      `}</style>
    </div>
  );
}
