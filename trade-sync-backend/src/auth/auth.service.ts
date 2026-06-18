import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/user.entity';
import { TradeLog } from '../database/tradelog.entity';
import type { MasterHistoryEntry } from '../trade/trade.service';
import { TradeGateway } from '../trade/trade.gateway';
import { OtpService } from './otp.service';
import type {
  MasterProfileResponse,
  SubscriberSummary,
  UpdateMasterProfileDto,
  VerifyNodeResponse,
} from './dto/auth.dto';
import {
  buildAnalytics,
  MASTER_ANALYTICS_CLOSED_CAP,
} from './master-analytics.util';
import {
  buildAvatarUrl,
  deleteAvatarFileIfExists,
  extensionForMime,
  parseAvatarPathFromUrl,
  validateAvatarUpload,
  writeAvatarFile,
  type AvatarUploadFile,
} from './avatar-storage.util';

export interface MasterDashboardData {
  profile: MasterProfileResponse;
  recentTrades: MasterHistoryEntry[];
  subscriberCount: number;
  openTrades: number;
  totalSignalsSent: number;
}

export interface TopMasterProfile extends MasterProfileResponse {
  openTrades: number;
}

export type LoginResponse = {
  access_token: string;
  user: Omit<User, 'password'>;
};

@Injectable()
export class AuthService {
  private readonly saltRounds = 10;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(TradeLog)
    private tradeLogRepository: Repository<TradeLog>,
    @Inject(forwardRef(() => TradeGateway))
    private readonly tradeGateway: TradeGateway,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    private readonly configService: ConfigService,
  ) {}

  private isBcryptHash(value: string): boolean {
    return typeof value === 'string' && value.startsWith('$2');
  }

  private async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.saltRounds);
  }

  private async verifyPlainAgainstStored(
    plain: string,
    stored: string,
  ): Promise<boolean> {
    if (this.isBcryptHash(stored)) {
      return bcrypt.compare(plain, stored);
    }
    return plain === stored;
  }

  /** Issue JWT after successful login/register. */
  async issueAccessToken(
    userId: string,
    email: string,
    role: User['role'],
  ): Promise<string> {
    return this.jwtService.signAsync({
      sub: userId,
      email,
      role,
    });
  }

  /** Strip password and attach access_token (for register / login responses). */
  async buildAuthResponse(user: User): Promise<LoginResponse> {
    const { password, ...rest } = user;
    void password;
    const access_token = await this.issueAccessToken(
      rest.id,
      rest.email,
      rest.role,
    );
    return { access_token, user: rest };
  }

  // --- EXISTING METHODS ---
  async register(userData: Partial<User>) {
    console.log('[AuthService] register called', {
      email: userData?.email,
      role: userData?.role,
      fullName: userData?.fullName,
    });

    try {
      if (
        typeof userData.password !== 'string' ||
        userData.password.length === 0
      ) {
        throw new BadRequestException('Password is required');
      }

      const hashed = await this.hashPassword(userData.password);
      const newUser = this.userRepository.create({
        ...userData,
        password: hashed,
        isEmailVerified: false,
      });
      console.log('[AuthService] register user instance created');

      const savedUser = await this.userRepository.save(newUser);
      console.log('[AuthService] register success', {
        userId: savedUser?.id,
        email: savedUser?.email,
        role: savedUser?.role,
      });

      await this.otpService.issueOtp(savedUser.email, 'SIGNUP');

      return {
        message: 'Account created. Check your email for a verification code.',
        email: savedUser.email,
        requiresOtp: true as const,
      };
    } catch (error) {
      console.error('[AuthService] register failed', error);
      throw error;
    }
  }

  /** Verify the signup OTP, mark the user verified, and return an auth session. */
  async verifySignupOtp(email: string, code: string): Promise<LoginResponse> {
    await this.otpService.verifyOtp(email, 'SIGNUP', code);

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isEmailVerified = true;
    await this.userRepository.save(user);

    const fresh = await this.userRepository.findOne({ where: { email } });
    if (!fresh) {
      throw new NotFoundException('User not found');
    }
    return this.buildAuthResponse(fresh);
  }

  /** Resend an OTP for signup or password reset. Generic by design. */
  async resendOtp(
    email: string,
    purpose: 'SIGNUP' | 'PASSWORD_RESET',
  ): Promise<{ message: string }> {
    if (purpose === 'PASSWORD_RESET') {
      const user = await this.userRepository.findOne({ where: { email } });
      if (user && user.isActive) {
        await this.otpService.issueOtp(email, 'PASSWORD_RESET');
      }
      return { message: 'If an account exists, a new code was sent.' };
    }

    await this.otpService.issueOtp(email, 'SIGNUP');
    return { message: 'A new verification code was sent.' };
  }

  /** Always returns a generic message; emails a code only if a user exists. */
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (user && user.isActive) {
      await this.otpService.issueOtp(email, 'PASSWORD_RESET');
    }
    return {
      message: 'If an account exists for that email, a reset code was sent.',
    };
  }

  /** Verify the reset OTP and issue a short-lived single-use reset token. */
  async verifyResetOtp(
    email: string,
    code: string,
  ): Promise<{ resetToken: string }> {
    await this.otpService.verifyOtp(email, 'PASSWORD_RESET', code);

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const resetTokenTtl =
      this.configService.get<string>('PASSWORD_RESET_TOKEN_TTL') ?? '10m';

    const resetToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, purpose: 'PASSWORD_RESET' },
      {
        // expiresIn is typed as ms.StringValue; env is a plain string — assert at sign boundary (same as auth.module.ts).
        expiresIn: resetTokenTtl,
      } as JwtSignOptions,
    );

    return { resetToken };
  }

  /** Validate the reset token and write a new bcrypt password hash. */
  async confirmPasswordReset(
    resetToken: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    if (typeof newPassword !== 'string' || newPassword.length < 5) {
      throw new BadRequestException(
        'Password must be at least 5 characters.',
      );
    }

    let payload: { sub: string; email: string; purpose?: string };
    try {
      payload = await this.jwtService.verifyAsync(resetToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired reset token.');
    }

    if (payload.purpose !== 'PASSWORD_RESET') {
      throw new UnauthorizedException('Invalid reset token.');
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.password = await this.hashPassword(newPassword);
    await this.userRepository.save(user);
    await this.otpService.invalidateOtps(user.email, 'PASSWORD_RESET');

    return { message: 'Password updated. You can sign in now.' };
  }

  async login(email: string, pass: string): Promise<LoginResponse> {
    console.log('[AuthService] login called', { email });

    try {
      const user = await this.userRepository.findOne({ where: { email } });
      if (!user) {
        console.warn('[AuthService] login failed: user not found', { email });
        throw new UnauthorizedException('User not found');
      }

      const valid = await this.verifyPlainAgainstStored(pass, user.password);
      if (!valid) {
        console.warn('[AuthService] login failed: invalid credentials', {
          email,
        });
        throw new UnauthorizedException('Invalid credentials');
      }

      // Lazy migration: legacy plaintext passwords become bcrypt on successful login
      if (!this.isBcryptHash(user.password)) {
        user.password = await this.hashPassword(pass);
        await this.userRepository.save(user);
      }

      const fresh = await this.userRepository.findOne({ where: { email } });
      if (!fresh) {
        throw new UnauthorizedException('User not found');
      }

      // Gate only blocks accounts explicitly marked unverified (new registrations).
      // Existing users (true/null/undefined) pass through unaffected.
      if (fresh.isEmailVerified === false) {
        console.warn('[AuthService] login blocked: email not verified', {
          email,
        });
        throw new ForbiddenException({
          message: 'Email not verified. Enter the code we sent you.',
          requiresOtp: true,
          email,
        });
      }

      console.log('[AuthService] login success', {
        userId: fresh.id,
        email: fresh.email,
        role: fresh.role,
      });
      return this.buildAuthResponse(fresh);
    } catch (error) {
      console.error('[AuthService] login error', error);
      throw error;
    }
  }

  // --- NEW ADMIN METHODS ---

  // 1. Fetch all users for the Admin Table
  async getAllUsers() {
    console.log('[AuthService] getAllUsers called');

    try {
      // We exclude passwords from the returned data for security
      const users = await this.userRepository.find({
        select: [
          'id',
          'fullName',
          'email',
          'role',
          'isActive',
          'licenseKey',
          'createdAt',
          'subscribedToId',
        ],
        order: { createdAt: 'DESC' }, // Newest users first
      });

      console.log('[AuthService] getAllUsers success', { count: users.length });
      return users;
    } catch (error) {
      console.error('[AuthService] getAllUsers failed', error);
      throw error;
    }
  }

  // 2. Generate a random License Key for a Master
  async generateLicense(userId: string) {
    console.log('[AuthService] generateLicense called', { userId });

    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        console.warn('[AuthService] generateLicense failed: user not found', {
          userId,
        });
        throw new NotFoundException('User not found');
      }

      if (user.role !== 'MASTER') {
        console.warn(
          '[AuthService] generateLicense failed: non-master user attempted',
          {
            userId,
            role: user.role,
          },
        );
        throw new UnauthorizedException(
          'Licenses can only be generated for Masters',
        );
      }

      // Create a random key like: TSP-A1B2-C3D4
      const randomPart1 = Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase();
      const randomPart2 = Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase();
      const newLicense = `TSP-${randomPart1}-${randomPart2}`;

      user.licenseKey = newLicense;
      await this.userRepository.save(user);

      console.log('[AuthService] generateLicense success', {
        userId,
        role: user.role,
      });
      return {
        message: 'License generated successfully',
        licenseKey: newLicense,
      };
    } catch (error) {
      console.error('[AuthService] generateLicense failed', error);
      throw error;
    }
  }

  // 3. The Kill-Switch: Toggle isActive true/false
  async toggleUserStatus(userId: string) {
    console.log('[AuthService] toggleUserStatus called', { userId });

    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        console.warn('[AuthService] toggleUserStatus failed: user not found', {
          userId,
        });
        throw new NotFoundException('User not found');
      }

      if (user.role === 'ADMIN') {
        console.warn('[AuthService] toggleUserStatus blocked for admin', {
          userId,
        });
        throw new UnauthorizedException('Cannot disable an Admin');
      }

      // Flip the boolean
      user.isActive = !user.isActive;
      await this.userRepository.save(user);

      console.log('[AuthService] toggleUserStatus success', {
        userId,
        isActive: user.isActive,
      });
      return {
        message: `User status changed to ${user.isActive ? 'Active' : 'Disabled'}`,
        isActive: user.isActive,
      };
    } catch (error) {
      console.error('[AuthService] toggleUserStatus failed', error);
      throw error;
    }
  }

  // --- NODE VERIFICATION (PYTHON CLIENT) ---
  async verifyNode(
    role: string,
    identifier: string,
    traceId?: string,
  ): Promise<VerifyNodeResponse> {
    const resolvedTraceId = traceId || randomUUID();
    console.log('[AuthService]', {
      message: 'verify_node_called',
      trace_id: resolvedTraceId,
      role,
      identifier,
    });
    let user;

    try {
      // Masters use their License Key as their identifier
      if (role === 'MASTER') {
        user = await this.userRepository.findOne({
          where: { licenseKey: identifier, role: 'MASTER' },
        });
      }
      // Slaves use their Registered Email as their identifier
      else if (role === 'SLAVE') {
        user = await this.userRepository.findOne({
          where: { email: identifier, role: 'SLAVE' },
        });
      }

      if (!user) {
        console.warn('[AuthService]', {
          message: 'verify_node_user_not_found',
          trace_id: resolvedTraceId,
          role,
          identifier,
        });
        throw new UnauthorizedException(
          'Invalid Verification Details. Check Key/Email.',
        );
      }

      if (!user.isActive) {
        console.warn('[AuthService]', {
          message: 'verify_node_inactive_user',
          trace_id: resolvedTraceId,
          userId: user.id,
          role: user.role,
        });
        throw new UnauthorizedException(
          'ACCOUNT DISABLED. Please contact the Administrator.',
        );
      }

      console.log('[AuthService]', {
        message: 'verify_node_success',
        trace_id: resolvedTraceId,
        userId: user.id,
        role: user.role,
      });
      return {
        message: 'Node Verified',
        trace_id: resolvedTraceId,
        role: user.role,
        fullName: user.fullName,
        id: user.id,
      };
    } catch (error) {
      console.error('[AuthService]', {
        message: 'verify_node_error',
        trace_id: resolvedTraceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async revokeSubscriber(
    masterLicenseKey: string,
    slaveId: string,
  ): Promise<{ message: string; slaveId: string }> {
    const master = await this.userRepository.findOne({
      where: { licenseKey: masterLicenseKey, role: 'MASTER' },
    });
    if (!master || !master.isActive) {
      throw new UnauthorizedException('Invalid or inactive master license');
    }

    const slave = await this.userRepository.findOne({
      where: { id: slaveId },
    });
    if (!slave || slave.subscribedToId !== master.id) {
      throw new ForbiddenException('Slave is not subscribed to this master');
    }

    slave.subscribedToId = null;
    await this.userRepository.save(slave);
    return { message: 'Subscriber revoked', slaveId };
  }

  async getSlaveIdByEmail(email: string): Promise<string | null> {
    const user = await this.userRepository.findOne({
      where: { email, role: 'SLAVE' },
      select: ['id'],
    });

    return user?.id ?? null;
  }

  // --- MARKETPLACE METHODS ---

  // 1. Fetch all Active Masters for the Slave Dashboard
  async getActiveMasters() {
    return await this.userRepository.find({
      where: { role: 'MASTER', isActive: true },
      select: ['id', 'fullName', 'email', 'createdAt'], // Do not send passwords or license keys to the frontend!
      order: { createdAt: 'DESC' },
    });
  }

  async getMasterProfile(masterId: string): Promise<MasterProfileResponse> {
    const master = await this.userRepository.findOne({
      where: { id: masterId, role: 'MASTER', isActive: true },
      select: [
        'id',
        'fullName',
        'createdAt',
        'bio',
        'tradingPlatform',
        'instruments',
        'strategyDescription',
        'riskLevel',
        'typicalHoldTime',
        'avatarUrl',
      ],
    });

    if (!master) {
      throw new NotFoundException('Active master not found');
    }

    const totalTrades = await this.tradeLogRepository.count({
      where: { masterId: master.id },
    });

    const closedTrades = await this.tradeLogRepository.count({
      where: { masterId: master.id, status: 'CLOSED' },
    });

    const closedTradeRows = await this.tradeLogRepository.find({
      where: { masterId: master.id, status: 'CLOSED' },
      select: ['pnl'],
    });

    const winningTrades = closedTradeRows.filter(
      (row) => (row.pnl ?? 0) > 0,
    ).length;
    const totalPnLRaw = closedTradeRows.reduce(
      (acc, row) => acc + (row.pnl ?? 0),
      0,
    );

    const allTradeRows = await this.tradeLogRepository.find({
      where: { masterId: master.id },
      select: ['volume'],
    });

    const totalVolume = allTradeRows.reduce((acc, row) => acc + row.volume, 0);
    const avgVolumeRaw = totalTrades > 0 ? totalVolume / totalTrades : 0;
    const winRateRaw =
      closedTrades > 0 ? (winningTrades / closedTrades) * 100 : 0;
    const subscriberCount = await this.userRepository.count({
      where: { subscribedToId: master.id },
    });

    const closedTradesNewestFirst = await this.tradeLogRepository
      .createQueryBuilder('log')
      .where('log.masterId = :masterId', { masterId: master.id })
      .andWhere('log.status = :status', { status: 'CLOSED' })
      .orderBy('COALESCE(log.closedAt, log.createdAt)', 'DESC')
      .take(MASTER_ANALYTICS_CLOSED_CAP)
      .getMany();

    const closedTradesOldestFirst = [...closedTradesNewestFirst].reverse();
    const analytics = buildAnalytics(closedTradesOldestFirst);

    return {
      id: master.id,
      fullName: master.fullName,
      createdAt: master.createdAt,
      totalTrades,
      closedTrades,
      winRate: Number(winRateRaw.toFixed(2)),
      totalPnL: Number(totalPnLRaw.toFixed(2)),
      avgVolume: Number(avgVolumeRaw.toFixed(2)),
      bio: master.bio ?? null,
      tradingPlatform: master.tradingPlatform ?? null,
      instruments: master.instruments ?? null,
      strategyDescription: master.strategyDescription ?? null,
      riskLevel: master.riskLevel ?? null,
      typicalHoldTime: master.typicalHoldTime ?? null,
      avatarUrl: master.avatarUrl ?? null,
      subscriberCount,
      isLive: this.tradeGateway.isMasterConnected(master.id),
      riskMetrics: analytics?.riskMetrics,
      equitySparkline: analytics?.equitySparkline ?? undefined,
      activeHoursSummary: analytics?.activeHoursSummary ?? null,
    };
  }

  async getMasterSubscribers(masterId: string): Promise<SubscriberSummary[]> {
    const subscribers = await this.userRepository.find({
      where: { subscribedToId: masterId, role: 'SLAVE' },
      select: ['id', 'fullName', 'email', 'isActive'],
      order: { createdAt: 'DESC' },
    });

    return await Promise.all(
      subscribers.map(async (subscriber) => {
        const tradeRows = await this.tradeLogRepository.find({
          where: { masterId, slaveId: subscriber.id },
          select: ['pnl', 'status'],
        });

        const totalPnL = Number(
          tradeRows
            .filter((row) => row.status === 'CLOSED')
            .reduce((acc, row) => acc + (row.pnl ?? 0), 0)
            .toFixed(2),
        );

        return {
          id: subscriber.id,
          fullName: subscriber.fullName,
          email: subscriber.email,
          isActive: subscriber.isActive,
          totalCopied: tradeRows.length,
          totalPnL,
        };
      }),
    );
  }

  async updateMasterProfile(
    masterId: string,
    dto: UpdateMasterProfileDto,
  ): Promise<Omit<User, 'password'>> {
    const master = await this.userRepository.findOne({
      where: { id: masterId, role: 'MASTER' },
    });

    if (!master) {
      throw new NotFoundException('Master not found');
    }

    const updates: Partial<User> = {};

    if (dto.bio !== undefined) updates.bio = dto.bio;
    if (dto.tradingPlatform !== undefined) {
      updates.tradingPlatform = dto.tradingPlatform;
    }
    if (dto.instruments !== undefined) updates.instruments = dto.instruments;
    if (dto.strategyDescription !== undefined) {
      updates.strategyDescription = dto.strategyDescription;
    }
    if (dto.riskLevel !== undefined) updates.riskLevel = dto.riskLevel;
    if (dto.typicalHoldTime !== undefined) {
      updates.typicalHoldTime = dto.typicalHoldTime;
    }

    const savedMaster = await this.userRepository.save({
      ...master,
      ...updates,
    });

    const { password, ...publicMaster } = savedMaster;
    void password;
    return publicMaster;
  }

  async uploadMasterAvatar(
    masterId: string,
    file: AvatarUploadFile | undefined,
  ): Promise<{ avatarUrl: string }> {
    const master = await this.userRepository.findOne({
      where: { id: masterId, role: 'MASTER' },
    });

    if (!master) {
      throw new NotFoundException('Master not found');
    }

    const validated = validateAvatarUpload(file);
    const ext = extensionForMime(validated.mimetype);
    const previous = parseAvatarPathFromUrl(master.avatarUrl);

    writeAvatarFile(masterId, ext, validated.buffer);

    if (previous && previous.ext !== ext) {
      deleteAvatarFileIfExists(previous.masterId, previous.ext);
    }

    const avatarUrl = buildAvatarUrl(masterId, ext);
    master.avatarUrl = avatarUrl;
    await this.userRepository.save(master);

    return { avatarUrl };
  }

  async getMasterDashboard(masterId: string): Promise<MasterDashboardData> {
    const profile = await this.getMasterProfile(masterId);
    const recentTrades = await this.tradeLogRepository.find({
      where: { masterId },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const openTrades = await this.tradeLogRepository.count({
      where: { masterId, status: 'OPEN' },
    });

    return {
      profile,
      recentTrades: recentTrades.map((trade) => ({
        id: trade.id,
        symbol: trade.symbol,
        action: trade.action,
        volume: Number(trade.volume ?? 0),
        status: trade.status,
        pnl: trade.pnl ?? null,
        createdAt: trade.createdAt,
        closedAt: trade.closedAt ?? null,
      })),
      subscriberCount: profile.subscriberCount,
      openTrades,
      totalSignalsSent: profile.totalTrades,
    };
  }

  async getTopMasters(): Promise<TopMasterProfile[]> {
    const activeMasters = await this.userRepository.find({
      where: { role: 'MASTER', isActive: true },
      select: ['id'],
      order: { createdAt: 'DESC' },
    });

    const profiles = await Promise.all(
      activeMasters.map(async (master) => {
        const profile = await this.getMasterProfile(master.id);
        const openTrades = await this.tradeLogRepository.count({
          where: { masterId: master.id, status: 'OPEN' },
        });

        return {
          ...profile,
          openTrades,
        };
      }),
    );

    return profiles
      .sort((left, right) => right.totalTrades - left.totalTrades)
      .slice(0, 3);
  }

  // 2. Update a Slave's Subscription
  async updateSubscription(slaveId: string, masterId: string | null) {
    const slave = await this.userRepository.findOne({
      where: { id: slaveId, role: 'SLAVE' },
    });
    if (!slave) throw new NotFoundException('Slave user not found');

    // If masterId is provided, we are subscribing. If it's null, we are unsubscribing.
    slave.subscribedToId = masterId;
    await this.userRepository.save(slave);

    return {
      message: masterId
        ? 'Successfully subscribed to Master'
        : 'Successfully unsubscribed',
      subscribedToId: slave.subscribedToId,
    };
  }
}
