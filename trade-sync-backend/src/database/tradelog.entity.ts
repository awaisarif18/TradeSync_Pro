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

  @Column()
  masterId: string; // Who placed the trade

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
}
