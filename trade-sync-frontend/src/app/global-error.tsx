"use client";

import Link from "next/link";
import { Button, Card, CardBody } from "../components/ui";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message =
    process.env.NODE_ENV === "production"
      ? "An unexpected error interrupted this app."
      : error.message;

  return (
    <html lang="en">
      <body
        className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]"
        style={{ fontFamily: "var(--font-sans, system-ui, sans-serif)" }}
      >
        <div className="flex min-h-screen items-center justify-center px-4">
          <Card>
            <CardBody>
              <div className="mx-auto flex max-w-[520px] flex-col items-center py-10 text-center">
                <div className="font-mono-tnum text-[64px] font-semibold leading-none text-[var(--color-text-3)]">
                  500
                </div>
                <h1 className="mt-6 text-[32px] font-semibold tracking-[-0.025em]">
                  Something went wrong
                </h1>
                <p className="font-mono-tnum mt-3 max-w-[360px] text-xs leading-6 text-[var(--color-text-3)]">
                  {message}
                </p>
                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  <Button onClick={reset}>Try again</Button>
                  <Link href="/">
                    <Button variant="ghost">Back to home</Button>
                  </Link>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </body>
    </html>
  );
}
