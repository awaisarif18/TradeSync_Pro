"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { ArrowRight, MailCheck } from "lucide-react";
import OtpInput from "@/components/auth/OtpInput";
import { Button } from "@/components/ui";
import { loginSuccess } from "@/redux/slices/authSlice";
import { authService } from "@/services/api";

type AuthUser = {
  id: string;
  email: string;
  fullName?: string;
  role: "MASTER" | "SLAVE" | "ADMIN" | null;
  licenseKey?: string | null;
  subscribedToId?: string | null;
};

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

function VerifyEmailInner() {
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = useMemo(
    () => searchParams.get("email") ?? "",
    [searchParams],
  );

  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const submit = async (value: string) => {
    if (value.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    if (!email) {
      toast.error("Missing email. Start from the register page.");
      return;
    }

    setIsLoading(true);
    try {
      const session = await authService.verifySignupOtp(email, value);
      dispatch(
        loginSuccess({
          user: session.user as AuthUser,
          accessToken: session.access_token,
        }),
      );
      toast.success("Email verified. Welcome to TradeSync Pro");
      router.push("/dashboard");
    } catch (error: unknown) {
      console.error("Verify email failed:", error);
      toast.error(authErrorMessage(error, "Verification failed"));
      setCode("");
    } finally {
      setIsLoading(false);
    }
  };

  const resend = async () => {
    if (countdown > 0 || !email) return;
    try {
      await authService.resendOtp(email, "SIGNUP");
      toast.success("A new code is on the way");
      setCountdown(RESEND_SECONDS);
    } catch (error: unknown) {
      console.error("Resend failed:", error);
      toast.error(authErrorMessage(error, "Could not resend code"));
    }
  };

  return (
    <div className="otp-shell">
      <div className="otp-card">
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
          <MailCheck size={26} color="var(--color-mint)" />
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: "-0.025em",
            margin: "0 0 8px",
          }}
        >
          Verify your email
        </h1>
        <p
          style={{
            fontSize: 15,
            color: "var(--color-text-2)",
            margin: "0 0 28px",
            lineHeight: 1.55,
          }}
        >
          We sent a 6-digit code to{" "}
          <span style={{ color: "var(--color-text)" }}>
            {email || "your email"}
          </span>
          . Enter it below to activate your account.
        </p>

        <OtpInput
          value={code}
          onChange={setCode}
          onComplete={submit}
          disabled={isLoading}
        />

        <Button
          type="button"
          variant="primary"
          fullWidth
          loading={isLoading}
          disabled={code.length !== 6 || isLoading}
          rightIcon={<ArrowRight size={16} />}
          onClick={() => submit(code)}
        >
          Verify and continue
        </Button>

        <div
          style={{
            fontSize: 13,
            color: "var(--color-text-2)",
            textAlign: "center",
            marginTop: 22,
          }}
        >
          Didn&apos;t get it?{" "}
          {countdown > 0 ? (
            <span className="font-mono-tnum" style={{ color: "var(--color-text-3)" }}>
              Resend in {countdown}s
            </span>
          ) : (
            <span
              role="button"
              tabIndex={0}
              onClick={resend}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") resend();
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

        <p
          style={{
            fontSize: 13,
            color: "var(--color-text-2)",
            textAlign: "center",
            marginTop: 16,
          }}
        >
          Wrong email?{" "}
          <Link
            href="/register"
            style={{ color: "var(--color-mint)", textDecoration: "none" }}
          >
            Start over
          </Link>
        </p>
      </div>

      <style>{`
        .otp-shell {
          min-height: calc(100vh - 64px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
        }

        .otp-card {
          width: 100%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
        }

        .otp-card > button {
          margin-top: 24px;
        }
      `}</style>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}
