import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { OtpPurpose } from '../database/otp.entity';

/**
 * Provider-agnostic SMTP mailer. Reads SMTP_* + MAIL_FROM from env and builds a
 * single nodemailer transport. Swapping to Resend/SES/Brevo is an env-only change.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private transporter: Transporter;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST') ?? '';
    const port = Number(this.config.get<string>('SMTP_PORT') ?? '587');
    const user = this.config.get<string>('SMTP_USER') ?? '';
    const pass = this.config.get<string>('SMTP_PASS') ?? '';
    this.from = this.config.get<string>('MAIL_FROM') ?? user;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      // 465 = implicit TLS; 587 = STARTTLS (secure:false).
      secure: port === 465,
      auth: user ? { user, pass } : undefined,
    });
  }

  onModuleInit() {
    const user = this.config.get<string>('SMTP_USER') ?? '';
    if (user && this.from && !this.from.includes(user)) {
      console.warn(
        `[MailService] MAIL_FROM (${this.from}) does not contain SMTP_USER (${user}). Gmail rewrites mismatched From addresses.`,
      );
    }
  }

  async sendOtpEmail(
    to: string,
    code: string,
    purpose: OtpPurpose,
  ): Promise<void> {
    const isSignup = purpose === 'SIGNUP';
    const subject = isSignup
      ? 'Verify your TradeSync Pro account'
      : 'Reset your TradeSync Pro password';
    const heading = isSignup ? 'Confirm your email' : 'Password reset';
    const intro = isSignup
      ? 'Use this code to finish setting up your TradeSync Pro account.'
      : 'Use this code to reset your TradeSync Pro password. If you did not request this, you can ignore this email.';

    const html = this.buildHtml(heading, intro, code);
    const text = `${heading}\n\n${intro}\n\nYour code: ${code}\n\nThis code expires in ${this.config.get<string>('OTP_TTL_MINUTES') ?? '10'} minutes.`;

    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        text,
        html,
      });
      console.log('[MailService] OTP email sent', { to, purpose });
    } catch (error) {
      console.error('[MailService] failed to send OTP email', {
        to,
        purpose,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private buildHtml(heading: string, intro: string, code: string): string {
    const ttl = this.config.get<string>('OTP_TTL_MINUTES') ?? '10';
    return `
  <div style="background:#0a0e0d;padding:40px 0;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#11181a;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
      <div style="padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.08);">
        <span style="font-size:18px;font-weight:600;color:#e8eef0;">TradeSync<span style="color:#00c389;"> Pro</span></span>
      </div>
      <div style="padding:32px;">
        <h1 style="margin:0 0 12px;font-size:20px;color:#e8eef0;">${heading}</h1>
        <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#8a9ba0;">${intro}</p>
        <div style="text-align:center;margin:0 0 28px;">
          <span style="display:inline-block;font-family:'Courier New',monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:#00c389;background:rgba(0,195,137,0.12);border:1px solid rgba(0,195,137,0.3);border-radius:12px;padding:16px 24px;">${code}</span>
        </div>
        <p style="margin:0;font-size:12px;color:#5d6d72;">This code expires in ${ttl} minutes. Never share it with anyone.</p>
      </div>
      <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.08);font-size:11px;color:#5d6d72;">
        Sent by TradeSync Pro. If you weren't expecting this, ignore it.
      </div>
    </div>
  </div>`;
  }
}
