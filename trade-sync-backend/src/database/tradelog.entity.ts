import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('TradeLogs')
export class TradeLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({nullable: true})
  masterId: string; // Who placed the trade

  @Column({ type: 'varchar', nullable: true })
  slaveId: string | null;
  // UUID of the slave who copied this trade.
  // Null for trades recorded before Phase 9 (pre-slaveId era).
  // Set by TradeGateway when slave execution is confirmed.

  @Column()
  masterName: string; // For easy UI display

  @Column()
  symbol: string;

  @Column()
  action: string; // BUY or SELL

  @Column('float')
  volume: number;

  @Column()
  ticketNumber: string;

  // NEW: The profit/loss captured when the trade closes
  @Column('float', { nullable: true })
  pnl: number;

  @Column({ default: 'OPEN' })
  status: 'OPEN' | 'CLOSED';

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  closedAt: Date;

  // --- Slippage guard diagnostics (additive, Phase: slippage hardening) ---
  // masterPrice: saved from OPEN signal payload.
  // copierPrice/slippagePoints* : populated by trade_execution_ack from the slave.
  // All nullable so synchronize:true adds them without touching historical rows.
  @Column('float', { nullable: true })
  masterPrice: number | null;

  @Column('float', { nullable: true })
  copierPrice: number | null;

  @Column('float', { nullable: true })
  slippagePointsConfigured: number | null;

  @Column('float', { nullable: true })
  slippagePointsActual: number | null;

  @Column({ nullable: true, default: false })
  slippageBlocked: boolean;
}
