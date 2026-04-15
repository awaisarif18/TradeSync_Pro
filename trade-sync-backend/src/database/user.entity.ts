import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('Users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  fullName: string;

  @Column({ default: 'SLAVE' })
  role: 'MASTER' | 'SLAVE' | 'ADMIN';

  @Column({ nullable: true })
  licenseKey: string;

  @Column({ type: 'nvarchar', nullable: true })
  bio: string | null;

  @Column({ type: 'nvarchar', nullable: true })
  tradingPlatform: string | null;

  @Column({ type: 'nvarchar', nullable: true })
  instruments: string | null;

  @Column({ type: 'nvarchar', nullable: true })
  strategyDescription: string | null;

  @Column({
    type: 'varchar',
    nullable: true,
    default: 'MEDIUM',
  })
  riskLevel: string | null;

  @Column({ type: 'nvarchar', nullable: true })
  typicalHoldTime: string | null;

  @Column({ default: true })
  isActive: boolean;

  // FIX: Explicitly defining type: 'varchar' tells TypeORM exactly what to build in MSSQL,
  // preventing it from getting confused by the 'string | null' TypeScript union.
  @Column({ type: 'varchar', nullable: true })
  subscribedToId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
