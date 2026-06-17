import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { EmailOtp, type OtpPurpose } from '../database/otp.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class OtpService {
  private readonly saltRounds = 10;

  constructor(
    @InjectRepository(EmailOtp)
    private readonly otpRepository: Repository<EmailOtp>,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}

  /** 6-digit numeric code, crypto-random, zero-padded. */
  generateCode(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  private get ttlMinutes(): number {
    return Number(this.config.get<string>('OTP_TTL_MINUTES') ?? '10');
  }

  private get resendSeconds(): number {
    return Number(this.config.get<string>('OTP_RESEND_SECONDS') ?? '30');
  }

  private get maxAttempts(): number {
    return Number(this.config.get<string>('OTP_MAX_ATTEMPTS') ?? '5');
  }

  /** Invalidate any unconsumed OTPs for an (email, purpose) pair. */
  async invalidateOtps(email: string, purpose: OtpPurpose): Promise<void> {
    await this.otpRepository.update(
      { email, purpose, consumedAt: IsNull() },
      { consumedAt: new Date() },
    );
  }

  /**
   * Issue a fresh OTP: enforce resend throttle, invalidate prior unconsumed
   * codes, hash + persist the new one, and email it.
   */
  async issueOtp(email: string, purpose: OtpPurpose): Promise<void> {
    const newest = await this.otpRepository.findOne({
      where: { email, purpose, consumedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    if (newest) {
      const elapsedSeconds =
        (Date.now() - new Date(newest.createdAt).getTime()) / 1000;
      if (elapsedSeconds < this.resendSeconds) {
        const wait = Math.ceil(this.resendSeconds - elapsedSeconds);
        throw new BadRequestException(
          `Please wait ${wait}s before requesting a new code.`,
        );
      }
    }

    await this.invalidateOtps(email, purpose);

    const code = this.generateCode();
    const codeHash = await bcrypt.hash(code, this.saltRounds);
    const expiresAt = new Date(Date.now() + this.ttlMinutes * 60 * 1000);

    const record = this.otpRepository.create({
      email,
      codeHash,
      purpose,
      expiresAt,
      consumedAt: null,
      attempts: 0,
    });
    await this.otpRepository.save(record);

    await this.mailService.sendOtpEmail(email, code, purpose);
  }

  /**
   * Verify a submitted code against the newest unconsumed, non-expired OTP.
   * Increments attempts; locks after maxAttempts; consumes on success.
   */
  async verifyOtp(
    email: string,
    purpose: OtpPurpose,
    code: string,
  ): Promise<void> {
    const record = await this.otpRepository.findOne({
      where: { email, purpose, consumedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    if (!record) {
      throw new BadRequestException(
        'No active verification code. Request a new one.',
      );
    }

    if (new Date(record.expiresAt).getTime() < Date.now()) {
      throw new BadRequestException(
        'Verification code expired. Request a new one.',
      );
    }

    if (record.attempts >= this.maxAttempts) {
      await this.otpRepository.update(record.id, { consumedAt: new Date() });
      throw new UnauthorizedException(
        'Too many attempts. Request a new code.',
      );
    }

    const matches = await bcrypt.compare(code, record.codeHash);
    if (!matches) {
      record.attempts += 1;
      await this.otpRepository.save(record);
      const remaining = Math.max(this.maxAttempts - record.attempts, 0);
      throw new BadRequestException(
        `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} left.`,
      );
    }

    record.consumedAt = new Date();
    await this.otpRepository.save(record);
  }
}
