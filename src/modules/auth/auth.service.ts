import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { UsersService } from '../users/users.service';
import { OtpService } from '../otp/otp.service';
import { MailService } from '../mail/mail.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';

export interface JwtPayload {
  sub: number;
  email: string;
  emailVerified: boolean;
}

export interface AuthResult {
  user: Partial<User>;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private otpService: OtpService,
    private mailService: MailService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto): Promise<{ message: string; email: string }> {
    const { email, password } = registerDto;

    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Create user (email verification defaults to false)
    // Note: UsersService.create() will handle password hashing
    const user = await this.usersService.create({
      email,
      password,
      name: registerDto.name || null,
    });

    // Generate and send OTP
    try {
      const otp = await this.otpService.createEmailVerificationOtp(email, user.id);
      await this.mailService.sendOtpEmail(email, otp, 'verification');

      this.logger.log(`User registered successfully: ${email}`);

      return {
        message: 'Registration successful. Please check your email for verification code.',
        email,
      };
    } catch (error) {
      this.logger.error(`Failed to send OTP email for ${email}:`, error);
      // If email fails, still return success but mention the issue
      return {
        message: 'Registration successful. However, there was an issue sending the verification email. Please try resending the OTP.',
        email,
      };
    }
  }

  /**
   * Verify email with OTP
   */
  async verifyEmail(verifyOtpDto: VerifyOtpDto): Promise<{ message: string; user: Partial<User> }> {
    const { email, otp } = verifyOtpDto;

    // Verify OTP
    const isValidOtp = await this.otpService.verifyEmailOtp(email, otp);
    if (!isValidOtp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Find user and verify email
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Mark email as verified
    const verifiedUser = await this.usersService.verifyEmail(user.id);

    // Send welcome email
    try {
      await this.mailService.sendWelcomeEmail(email, user.name);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}:`, error);
      // Don't fail the verification if welcome email fails
    }

    this.logger.log(`Email verified successfully: ${email}`);

    return {
      message: 'Email verified successfully',
      user: this.sanitizeUser(verifiedUser),
    };
  }

  /**
   * Resend OTP
   */
  async resendOtp(resendOtpDto: ResendOtpDto): Promise<{ message: string }> {
    const { email } = resendOtpDto;

    // Check if user exists
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate and send new OTP
    try {
      const otp = await this.otpService.createEmailVerificationOtp(email, user.id);
      await this.mailService.sendOtpEmail(email, otp, 'verification');

      this.logger.log(`OTP resent to: ${email}`);

      return {
        message: 'OTP sent successfully. Please check your email.',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error; // Rate limiting error
      }
      this.logger.error(`Failed to resend OTP to ${email}:`, error);
      throw new BadRequestException('Failed to send OTP. Please try again later.');
    }
  }

  /**
   * Login user
   */
  async login(loginDto: LoginDto, userAgent?: string, ipAddress?: string): Promise<AuthResult> {
    const { email, password } = loginDto;

    // Find user with password
    const user = await this.usersService.findByEmailWithPassword(email);

    // Debug logging
    this.logger.debug(`Login attempt for email: ${email}`);
    this.logger.debug(`User found: ${!!user}`);
    if (user) {
      this.logger.debug(`User ID: ${user.id}`);
      this.logger.debug(`Email verified: ${user.emailVerified}`);
      this.logger.debug(`Password field present: ${!!user.password}`);
      this.logger.debug(`Password hash: ${user.password?.substring(0, 20)}...`);
    }

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new UnauthorizedException('Please verify your email before logging in');
    }

    // Verify password
    this.logger.debug(`Comparing password: "${password}" with hash: "${user.password?.substring(0, 20)}..."`);
    const isPasswordValid = await bcrypt.compare(password, user.password);
    this.logger.debug(`Password valid: ${isPasswordValid}`);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user, userAgent, ipAddress);

    this.logger.log(`User logged in successfully: ${email}`);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto, userAgent?: string, ipAddress?: string): Promise<AuthResult> {
    const { refreshToken } = refreshTokenDto;

    // Hash the provided refresh token to compare with stored hash
    const hashedToken = this.hashToken(refreshToken);

    // Find refresh token in database
    const tokenEntity = await this.refreshTokenRepository.findOne({
      where: { hashedToken, revoked: false },
      relations: ['user'],
    });

    if (!tokenEntity) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token is expired
    if (tokenEntity.expiresAt < new Date()) {
      // Revoke expired token
      await this.refreshTokenRepository.update(tokenEntity.id, { revoked: true });
      throw new UnauthorizedException('Refresh token expired');
    }

    // Revoke old refresh token (token rotation)
    await this.refreshTokenRepository.update(tokenEntity.id, { revoked: true });

    // Generate new tokens
    const tokens = await this.generateTokens(tokenEntity.user, userAgent, ipAddress);

    this.logger.log(`Token refreshed successfully for user: ${tokenEntity.user.email}`);

    return {
      user: this.sanitizeUser(tokenEntity.user),
      ...tokens,
    };
  }

  /**
   * Logout user (revoke refresh token)
   */
  async logout(refreshToken: string): Promise<{ message: string }> {
    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    const hashedToken = this.hashToken(refreshToken);

    await this.refreshTokenRepository.update(
      { hashedToken },
      { revoked: true }
    );

    this.logger.log('User logged out successfully');

    return {
      message: 'Logged out successfully',
    };
  }

  /**
   * Logout from all devices (revoke all refresh tokens for user)
   */
  async logoutFromAllDevices(userId: number): Promise<{ message: string }> {
    await this.refreshTokenRepository.update(
      { userId, revoked: false },
      { revoked: true }
    );

    this.logger.log(`User ${userId} logged out from all devices`);

    return {
      message: 'Logged out from all devices successfully',
    };
  }

  /**
   * Validate user for JWT strategy
   */
  async validateUser(payload: JwtPayload): Promise<User | null> {
    const user = await this.usersService.findByEmail(payload.email);
    return user && user.emailVerified ? user : null;
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(user: User, userAgent?: string, ipAddress?: string): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
    };

    // Generate access token (short-lived)
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    });

    // Generate refresh token (long-lived)
    const refreshToken = this.generateRefreshToken();
    const hashedRefreshToken = this.hashToken(refreshToken);

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await this.refreshTokenRepository.save({
      hashedToken: hashedRefreshToken,
      userId: user.id,
      expiresAt,
      userAgent,
      ipAddress,
    });

    // Clean up expired refresh tokens (moved to background task)
    // await this.cleanupExpiredRefreshTokens();

    return { accessToken, refreshToken };
  }

  /**
   * Generate a secure refresh token
   */
  private generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Hash token for secure storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Remove sensitive data from user object
   */
  private sanitizeUser(user: User): Partial<User> {
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  /**
   * Clean up expired refresh tokens
   */
  private async cleanupExpiredRefreshTokens(): Promise<void> {
    const result = await this.refreshTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });

    if (result.affected > 0) {
      this.logger.log(`Cleaned up ${result.affected} expired refresh tokens`);
    }
  }

  /**
   * Get user's active sessions (refresh tokens)
   */
  async getActiveSessions(userId: number): Promise<any[]> {
    const sessions = await this.refreshTokenRepository.find({
      where: { userId, revoked: false },
      select: ['id', 'userAgent', 'ipAddress', 'createdAt', 'expiresAt'],
      order: { createdAt: 'DESC' },
    });

    return sessions.map(session => ({
      id: session.id,
      userAgent: session.userAgent || 'Unknown',
      ipAddress: session.ipAddress || 'Unknown',
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    }));
  }

  /**
   * Revoke specific session
   */
  async revokeSession(userId: number, sessionId: number): Promise<{ message: string }> {
    const result = await this.refreshTokenRepository.update(
      { id: sessionId, userId, revoked: false },
      { revoked: true }
    );

    if (result.affected === 0) {
      throw new NotFoundException('Session not found');
    }

    return {
      message: 'Session revoked successfully',
    };
  }
}