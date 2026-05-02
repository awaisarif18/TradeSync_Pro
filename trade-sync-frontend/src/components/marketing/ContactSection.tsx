"use client";

import { type FormEvent, useState } from "react";
import { Button } from "../ui";

const FORMSPREE_ENDPOINT = "https://formspree.io/f/xojrjvoj";

export default function ContactSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ name, email, message }),
      });
      if (res.ok) {
        setSuccess(true);
        setName("");
        setEmail("");
        setMessage("");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch {
      setError("Could not send message. Check your connection.");
      console.error("Contact form submission failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="contact"
      style={{
        background: "var(--color-bg)",
        padding: "64px 32px",
      }}
    >
      <div style={{ maxWidth: 1240, margin: "0 auto", textAlign: "center" }}>
        <div
          style={{
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontWeight: 500,
            color: "var(--color-text-3)",
            marginBottom: 12,
          }}
        >
          Contact
        </div>
        <h2
          style={{
            margin: "0 0 12px",
            fontSize: 36,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            color: "var(--color-text)",
          }}
        >
          Get in touch
        </h2>
        <p
          style={{
            margin: "0 0 32px",
            fontSize: 16,
            color: "var(--color-text-2)",
            maxWidth: 440,
            marginLeft: "auto",
            marginRight: "auto",
            lineHeight: 1.5,
          }}
        >
          Have questions about TradeSync Pro? Send us a message.
        </p>

        <div
          style={{
            maxWidth: 560,
            margin: "0 auto",
            background: "var(--color-surface)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            padding: 28,
            textAlign: "left",
          }}
        >
          {success ? (
            <p
              style={{
                margin: 0,
                padding: "24px 8px",
                textAlign: "center",
                fontSize: 16,
                color: "var(--color-mint)",
                fontWeight: 500,
              }}
            >
              ✓ Message sent! We&apos;ll get back to you soon.
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 18 }}>
                <label
                  htmlFor="contact-name"
                  style={{
                    display: "block",
                    fontSize: 13,
                    color: "var(--color-text-2)",
                    marginBottom: 8,
                  }}
                >
                  Name
                </label>
                <input
                  id="contact-name"
                  className="contact-section-input"
                  type="text"
                  name="name"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(ev) => setName(ev.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label
                  htmlFor="contact-email"
                  style={{
                    display: "block",
                    fontSize: 13,
                    color: "var(--color-text-2)",
                    marginBottom: 8,
                  }}
                >
                  Email
                </label>
                <input
                  id="contact-email"
                  className="contact-section-input"
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div style={{ marginBottom: 22 }}>
                <label
                  htmlFor="contact-message"
                  style={{
                    display: "block",
                    fontSize: 13,
                    color: "var(--color-text-2)",
                    marginBottom: 8,
                  }}
                >
                  Message
                </label>
                <textarea
                  id="contact-message"
                  className="contact-section-input"
                  name="message"
                  rows={5}
                  required
                  value={message}
                  onChange={(ev) => setMessage(ev.target.value)}
                  placeholder="How can we help?"
                  style={{ resize: "vertical", minHeight: 120 }}
                />
              </div>
              {error ? (
                <p
                  style={{
                    margin: "0 0 14px",
                    fontSize: 14,
                    color: "var(--color-danger)",
                  }}
                >
                  {error}
                </p>
              ) : null}
              <Button
                type="submit"
                variant="primary"
                fullWidth
                size="lg"
                loading={loading}
                disabled={loading}
              >
                Send message
              </Button>
            </form>
          )}
        </div>
      </div>

      <style>{`
        .contact-section-input {
          width: 100%;
          box-sizing: border-box;
          background: var(--color-surface-2);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          color: var(--color-text);
          font-family: var(--font-sans);
          font-size: 15px;
          padding: 14px;
          outline: none;
          transition: border-color 0.15s;
        }
        .contact-section-input::placeholder {
          color: var(--color-text-3);
        }
        .contact-section-input:focus {
          border-color: var(--color-mint);
        }
      `}</style>
    </section>
  );
}
