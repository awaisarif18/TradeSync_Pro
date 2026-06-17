"use client";

import {
  useRef,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";

type OtpInputProps = {
  value: string;
  onChange: (next: string) => void;
  onComplete?: (code: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
};

const ONLY_DIGITS = /\D/g;

export default function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  autoFocus = true,
}: OtpInputProps) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  const emit = (next: string) => {
    onChange(next);
    if (next.length === length && !next.includes("")) {
      onComplete?.(next);
    }
  };

  const setDigit = (index: number, raw: string) => {
    const clean = raw.replace(ONLY_DIGITS, "");
    if (!clean) return;

    const chars = value.split("");
    // Typing replaces the current slot with the first new char.
    chars[index] = clean[0];
    const next = chars.join("").slice(0, length);
    emit(next);

    const focusTarget = Math.min(index + 1, length - 1);
    inputs.current[focusTarget]?.focus();
  };

  const handleKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const chars = value.split("");
      if (chars[index]) {
        chars[index] = "";
        emit(chars.join(""));
        return;
      }
      const prev = Math.max(index - 1, 0);
      chars[prev] = "";
      emit(chars.join(""));
      inputs.current[prev]?.focus();
    } else if (event.key === "ArrowLeft") {
      inputs.current[Math.max(index - 1, 0)]?.focus();
    } else if (event.key === "ArrowRight") {
      inputs.current[Math.min(index + 1, length - 1)]?.focus();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .replace(ONLY_DIGITS, "")
      .slice(0, length);
    if (!pasted) return;
    emit(pasted);
    const focusTarget = Math.min(pasted.length, length - 1);
    inputs.current[focusTarget]?.focus();
  };

  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputs.current[index] = el;
          }}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          onChange={(event) => setDigit(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onFocus={(event) => event.target.select()}
          style={{
            width: 48,
            height: 56,
            textAlign: "center",
            fontFamily: "var(--font-mono), monospace",
            fontVariantNumeric: "tabular-nums",
            fontSize: 22,
            fontWeight: 600,
            color: "var(--color-text)",
            background: "var(--color-surface-2)",
            border: `1px solid ${digit ? "var(--color-mint)" : "var(--color-line)"}`,
            borderRadius: 12,
            outline: "none",
            transition: "border-color .12s",
            caretColor: "var(--color-mint)",
          }}
        />
      ))}
    </div>
  );
}
