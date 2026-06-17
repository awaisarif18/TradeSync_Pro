import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type OtpPurpose = 'SIGNUP' | 'PASSWORD_RESET';

@Entity('EmailOtps')
export class EmailOtp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  email: string;

  @Column({ type: 'varchar' })
  codeHash: string;

  @Column({ type: 'varchar' })
  purpose: OtpPurpose;

  @Column({ type: 'datetime2' })
  expiresAt: Date;

  @Column({ type: 'datetime2', nullable: true })
  consumedAt: Date | null;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @CreateDateColumn()
  createdAt: Date;
}
