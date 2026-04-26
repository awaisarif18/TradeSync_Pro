import {
  Inject,
  Injectable,
  UnauthorizedException,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/user.entity';
import { TradeLog } from '../database/tradelog.entity';
import type { MasterHistoryEntry } from '../trade/trade.service';
import { TradeGateway } from '../trade/trade.gateway';
import type {
  MasterProfileResponse,
  SubscriberSummary,
  UpdateMasterProfileDto,
  VerifyNodeResponse,
} from './dto/auth.dto';

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

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(TradeLog)
    private tradeLogRepository: Repository<TradeLog>,
    @Inject(forwardRef(() => TradeGateway))
    private readonly tradeGateway: TradeGateway,
  ) {}

  // --- EXISTING METHODS ---
  async register(userData: Partial<User>) {
    console.log('[AuthService] register called', {
      email: userData?.email,
      role: userData?.role,
      fullName: userData?.fullName,
    });

    try {
      const newUser = this.userRepository.create(userData);
      console.log('[AuthService] register user instance created');

      const savedUser = await this.userRepository.save(newUser);
      console.log('[AuthService] register success', {
        userId: savedUser?.id,
        email: savedUser?.email,
        role: savedUser?.role,
      });

      return savedUser;
    } catch (error) {
      console.error('[AuthService] register failed', error);
      throw error;
    }
  }

  async login(email: string, pass: string) {
    console.log('[AuthService] login called', { email });

    try {
      const user = await this.userRepository.findOne({ where: { email } });
      if (!user) {
        console.warn('[AuthService] login failed: user not found', { email });
        throw new UnauthorizedException('User not found');
      }

      if (user.password !== pass) {
        console.warn('[AuthService] login failed: invalid credentials', {
          email,
        });
        throw new UnauthorizedException('Invalid credentials');
      }

      const { password, ...result } = user;
      void password;
      console.log('[AuthService] login success', {
        userId: result.id,
        email: result.email,
        role: result.role,
      });
      return result;
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
      subscriberCount,
      isLive: this.tradeGateway.isMasterConnected(master.id),
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
