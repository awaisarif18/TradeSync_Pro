import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TradeLog } from '../database/tradelog.entity';

export interface MasterHistoryEntry {
  id: string;
  symbol: string;
  action: string;
  volume: number;
  status: 'OPEN' | 'CLOSED';
  pnl: number | null;
  createdAt: Date;
  closedAt: Date | null;
}

@Injectable()
export class TradeService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(TradeLog)
    private readonly tradeLogRepository: Repository<TradeLog>,
  ) {}

  async logSignal(data: any): Promise<number> {
    console.log('[TradeService] logSignal called', {
      symbol: data?.symbol,
      action: data?.action,
      price: data?.price || 0,
      volume: data?.volume,
    });

    try {
      const result = await this.dataSource.query(
        `INSERT INTO TradeLog (MasterID, Symbol, ActionType, Price, Volume) 
         VALUES (1, @0, @1, @2, @3); SELECT SCOPE_IDENTITY() AS id`,
        [data.symbol, data.action, data.price || 0, data.volume],
      );

      const signalId = result[0].id;
      console.log('[TradeService] logSignal success', { signalId });
      return signalId;
    } catch (error) {
      console.error('[TradeService] logSignal failed', error);
      throw error;
    }
  }

  async logExecution(
    userId: number,
    signalId: number,
    status: string,
    latency: number,
  ) {
    console.log('[TradeService] logExecution called', {
      userId,
      signalId,
      status,
      latency,
    });

    try {
      await this.dataSource.query(
        `INSERT INTO ExecutionLog (UserID, SignalID, Status, LatencyMs) 
         VALUES (@0, @1, @2, @3)`,
        [userId, signalId, status, latency],
      );

      console.log('[TradeService] logExecution success', { userId, signalId });
    } catch (error) {
      console.error('[TradeService] logExecution failed', error);
      throw error;
    }
  }

  async getLatestLogs(limit: number) {
    console.log('[TradeService] getLatestLogs called', { limit });

    try {
      const logs = await this.dataSource.query(
        `SELECT TOP (@0) * FROM TradeLog ORDER BY SignalTimestamp DESC`,
        [limit],
      );

      console.log('[TradeService] getLatestLogs success', {
        count: Array.isArray(logs) ? logs.length : 0,
      });
      return logs;
    } catch (error) {
      console.error('[TradeService] getLatestLogs failed', error);
      throw error;
    }
  }

  async getMasterHistory(masterId: string): Promise<MasterHistoryEntry[]> {
    const rows = await this.tradeLogRepository.find({
      where: { masterId },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return rows.map((row) => ({
      id: row.id,
      symbol: row.symbol,
      action: row.action,
      volume: Number(row.volume ?? 0),
      status: row.status,
      pnl: row.pnl ?? null,
      createdAt: row.createdAt,
      closedAt: row.closedAt ?? null,
    }));
  }
}
