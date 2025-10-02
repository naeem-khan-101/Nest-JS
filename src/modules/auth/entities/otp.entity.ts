import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('otps')
export class Otp {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  @Index('IDX_OTP_EMAIL')
  email: string;

  @Column({ nullable: true })
  hashedOtp: string;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ default: false, nullable: true })
  used: boolean;

  @Column({ type: 'enum', enum: ['email_verification', 'password_reset'], nullable: true })
  type: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  userId: number;
}