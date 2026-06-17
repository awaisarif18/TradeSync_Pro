"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ArrowRight, Eye, EyeOff, KeyRound, Sparkles } from "lucide-react";
import OtpInput from "@/components/auth/OtpInput";
import { Button, Input } from "@/components/ui";
import { generatePassword } from "@/lib/generatePassword";
import { authService } from "@/services/api";

type Step = "email" | "code" | "password" | "done";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_SECONDS = 30;

function authErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } })
      .response;
    if (typeof response?.data?.message === "string") {
      return response.data.message;
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const submitEmail = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!EMAIL_RE.test(email.trim())) {
      setError("Enter a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.requestPasswordReset(email.trim());
      toast.success(result.message);
      setStep("code");
      setCountdown(RESEND_SECONDS);
    } catch (err: unknown) {
      console.error("Reset request failed:", err);
      toast.error(authErrorMessage(err, "Could not start reset"));
    } finally {
      setIsLoading(false);
    }
  };

  const submitCode = async (value: string) => {
    if (value.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setIsLoading(true);
    try {
      const result = await authService.verifyResetOtp(email.trim(), value);
      setResetToken(result.resetToken);
      setStep("password");
    } catch (err: unknown) {
      console.error("Reset verify failed:", err);
      toast.error(authErrorMessage(err, "Incorrect or expired code"));
      setCode("");
    } finally {
      setIsLoading(false);
    }
  };

  const resend = async () => {
    if (countdown > 0) return;
    try {
      await authService.resendOtp(email.trim(), "PASSWORD_RESET");
      toast.success("A new code is on the way");
      setCountdown(RESEND_SECONDS);
    } catch (err: unknown) {
      console.error("Resend failed:", err);
      toast.error(authErrorMessage(err, "Could not resend code"));
    }
  };

  const fillGenerated = () => {
    const generated = generatePassword(14);
    setPassword(generated);
    setConfirm(generated);
    setShowPassword(true);
    setError(null);
  };

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < 5) {
      setError("Password must be at least 5 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.confirmPasswordReset(
        resetToken,
        password,
      );
      toast.success(result.message);
      setStep("done");
      setTimeout(() => router.push("/login"), 2200);
    } catch (err: unknown) {
      console.error("Reset confirm failed:", err);
      toast.error(authErrorMessage(err, "Could not update password"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="reset-shell">
      <div className="reset-card">
        {step !== "done" ? (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "var(--color-mint-soft)",
              border: "1px solid rgba(0,195,137,0.3)",
              margin: "0 0 20px",
            }}
          >
            <KeyRound size={26} color="var(--color-mint)" />
          </div>
        ) : null}

        {step === "email" ? (
          <>
            <h1 className="reset-title">Reset your password</h1>
            <p className="reset-sub">
              Enter the email tied to your account. We&apos;ll send a 6-digit
              code to reset your password.
            </p>
            <form onSubmit={submitEmail} className="reset-form">
              <Input
                label="Email"
                type="email"
                placeholder="you@firm.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                error={error ?? undefined}
                required
              />
              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={isLoading}
                disabled={isLoading}
                rightIcon={<ArrowRight size={16} />}
              >
                Send reset code
              </Button>
            </form>
          </>
        ) : null}

        {step === "code" ? (
          <>
            <h1 className="reset-title">Enter the code</h1>
            <p className="reset-sub">
              We sent a 6-digit code to{" "}
              <span style={{ color: "var(--color-text)" }}>{email}</span>.
            </p>
            <OtpInput
              value={code}
              onChange={setCode}
              onComplete={submitCode}
              disabled={isLoading}
            />
            <Button
              type="button"
              variant="primary"
              fullWidth
              loading={isLoading}
              disabled={code.length !== 6 || isLoading}
              rightIcon={<ArrowRight size={16} />}
              onClick={() => submitCode(code)}
              style={{ marginTop: 24 }}
            >
              Verify code
            </Button>
            <div className="reset-resend">
              Didn&apos;t get it?{" "}
              {countdown > 0 ? (
                <span
                  className="font-mono-tnum"
                  style={{ color: "var(--color-text-3)" }}
                >
                  Resend in {countdown}s
                </span>
              ) : (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={resend}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") resend();
                  }}
                  style={{
                    color: "var(--color-mint)",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Resend code
                </span>
              )}
            </div>
          </>
        ) : null}

        {step === "password" ? (
          <>
            <h1 className="reset-title">Set a new password</h1>
            <p className="reset-sub">
              Choose a strong password, or generate one automatically.
            </p>
            <form onSubmit={submitPassword} className="reset-form">
              <Input
                label="New password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 5 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                rightIcon={
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={() => setShowPassword((v) => !v)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        setShowPassword((v) => !v);
                    }}
                    style={{ display: "inline-flex", cursor: "pointer" }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </span>
                }
                required
              />
              <Input
                label="Confirm password"
                type={showPassword ? "text" : "password"}
                placeholder="Re-enter password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  setError(null);
                }}
                error={error ?? undefined}
                required
              />
              <button
                type="button"
                onClick={fillGenerated}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  alignSelf: "flex-start",
                  background: "transparent",
                  border: "none",
                  color: "var(--color-mint)",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <Sparkles size={15} />
                Generate strong password
              </button>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={isLoading}
                disabled={isLoading}
                rightIcon={<ArrowRight size={16} />}
              >
                Update password
              </Button>
            </form>
          </>
        ) : null}

        {step === "done" ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <svg
              width="72"
              height="72"
              viewBox="0 0 72 72"
              style={{
                margin: "8px auto 24px",
                display: "block",
                animation: "a-tick-pop .4s ease-out both",
              }}
            >
              <circle
                cx="36"
                cy="36"
                r="34"
                fill="var(--color-mint-soft)"
                stroke="var(--color-mint)"
                strokeWidth="2"
              />
              <path
                d="M22 37 L32 47 L51 27"
                fill="none"
                stroke="var(--color-mint)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="48"
                style={{ animation: "a-tick .5s ease-out .2s both" }}
              />
            </svg>
            <h1 className="reset-title">Password updated</h1>
            <p className="reset-sub">
              You can sign in with your new password now. Redirecting you to
              login...
            </p>
            <Button
              type="button"
              variant="primary"
              fullWidth
              rightIcon={<ArrowRight size={16} />}
              onClick={() => router.push("/login")}
              style={{ marginTop: 8 }}
            >
              Go to sign in
            </Button>
          </div>
        ) : null}

        {step !== "done" ? (
          <p
            style={{
              fontSize: 13,
              color: "var(--color-text-2)",
              textAlign: "center",
              marginTop: 20,
            }}
          >
            Remembered it?{" "}
            <Link
              href="/login"
              style={{ color: "var(--color-mint)", textDecoration: "none" }}
            >
              Back to sign in
            </Link>
          </p>
        ) : null}
      </div>

      <style>{`
        .reset-shell {
          min-height: calc(100vh - 64px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
        }

        .reset-card {
          width: 100%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
        }

        .reset-title {
          font-size: 28px;
          font-weight: 600;
          letter-spacing: -0.025em;
          margin: 0 0 8px;
        }

        .reset-sub {
          font-size: 15px;
          color: var(--color-text-2);
          margin: 0 0 28px;
          line-height: 1.55;
        }

        .reset-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .reset-resend {
          font-size: 13px;
          color: var(--color-text-2);
          text-align: center;
          margin-top: 22px;
        }
      `}</style>
    </div>
  );
}
