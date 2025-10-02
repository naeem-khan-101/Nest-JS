import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Otp } from '../auth/entities/otp.entity';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @InjectRepository(Otp)
    private otpRepository: Repository<Otp>,
    private configService: ConfigService,
  ) {}

  /**
   * Generate a 6-digit OTP
   */
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Hash OTP using bcrypt for secure storage
   */
  private async hashOtp(otp: string): Promise<string> {
    return await bcrypt.hash(otp, 10);
  }

  /**
   * Verify OTP against hashed value
   */
  private async verifyOtp(otp: string, hashedOtp: string): Promise<boolean> {
    return await bcrypt.compare(otp, hashedOtp);
  }

  /**
   * Create and store a new OTP for email verification
   */
  async createEmailVerificationOtp(email: string, userId?: number): Promise<string> {
    // Clean up expired OTPs first
    await this.cleanupExpiredOtps();

    // Check rate limiting - allow only 1 OTP per minute per email
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentOtp = await this.otpRepository.findOne({
      where: {
        email,
        type: 'email_verification',
        createdAt: LessThan(oneMinuteAgo),
      },
      order: { createdAt: 'DESC' },
    });

    if (recentOtp && recentOtp.createdAt > oneMinuteAgo) {
      const remainingTime = Math.ceil((oneMinuteAgo.getTime() - recentOtp.createdAt.getTime()) / 1000);
      throw new BadRequestException(`Please wait ${remainingTime} seconds before requesting a new OTP`);
    }

    // Mark any existing unused OTPs as used
    await this.otpRepository.update(
      {
        email,
        type: 'email_verification',
        used: false,
      },
      { used: true }
    );

    // Generate new OTP
    const otp = this.generateOtp();
    const hashedOtp = await this.hashOtp(otp);

    // Get expiry time from config (default 10 minutes)
    const expiryMinutes = this.configService.get<number>('OTP_EXPIRY_MINUTES', 10);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Store OTP
    const otpEntity = this.otpRepository.create({
      email,
      hashedOtp,
      expiresAt,
      type: 'email_verification',
      userId,
      used: false,
    });

    await this.otpRepository.save(otpEntity);

    this.logger.log(`OTP generated for email: ${email}`);
    return otp; // Return plain OTP for sending via email
  }

  /**
   * Verify OTP for email verification
   */
  async verifyEmailOtp(email: string, otp: string): Promise<boolean> {
    // Clean up expired OTPs first
    await this.cleanupExpiredOtps();

    // Find the most recent unused OTP for this email
    const otpEntity = await this.otpRepository.findOne({
      where: {
        email,
        type: 'email_verification',
        used: false,
      },
      order: { createdAt: 'DESC' },
    });

    if (!otpEntity) {
      this.logger.warn(`No valid OTP found for email: ${email}`);
      return false;
    }

    // Check if OTP is expired
    if (otpEntity.expiresAt < new Date()) {
      this.logger.warn(`Expired OTP attempted for email: ${email}`);
      return false;
    }

    // Verify OTP
    const isValid = await this.verifyOtp(otp, otpEntity.hashedOtp);

    if (isValid) {
      // Mark OTP as used
      await this.otpRepository.update(otpEntity.id, { used: true });
      this.logger.log(`OTP verified successfully for email: ${email}`);
    } else {
      this.logger.warn(`Invalid OTP attempted for email: ${email}`);
    }

    return isValid;
  }

  /**
   * Clean up expired OTPs (runs automatically and can be called manually)
   */
  async cleanupExpiredOtps(): Promise<void> {
    const result = await this.otpRepository.delete({
      expiresAt: LessThan(new Date()),
    });

    if (result.affected > 0) {
      this.logger.log(`Cleaned up ${result.affected} expired OTPs`);
    }
  }

  /**
   * Get OTP statistics (for monitoring/debugging)
   */
  async getOtpStats(): Promise<{
    total: number;
    active: number;
    expired: number;
    used: number;
  }> {
    const now = new Date();

    const [total, active, expired, used] = await Promise.all([
      this.otpRepository.count(),
      this.otpRepository.count({
        where: {
          used: false,
          expiresAt: LessThan(now),
        },
      }),
      this.otpRepository.count({
        where: {
          expiresAt: LessThan(now),
        },
      }),
      this.otpRepository.count({
        where: {
          used: true,
        },
      }),
    ]);

    return { total, active, expired, used };
  }
}