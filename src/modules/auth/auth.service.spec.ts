import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { OtpService } from '../otp/otp.service';
import { MailService } from '../mail/mail.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let otpService: jest.Mocked<OtpService>;
  let mailService: jest.Mocked<MailService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedPassword',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRefreshTokenRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findByEmailWithPassword: jest.fn(),
            create: jest.fn(),
            verifyEmail: jest.fn(),
          },
        },
        {
          provide: OtpService,
          useValue: {
            createEmailVerificationOtp: jest.fn(),
            verifyEmailOtp: jest.fn(),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendOtpEmail: jest.fn(),
            sendWelcomeEmail: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    otpService = module.get(OtpService);
    mailService = module.get(MailService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);

    // Setup default mock implementations
    configService.get.mockImplementation((key: string) => {
      const config = {
        'JWT_ACCESS_EXPIRES_IN': '15m',
        'JWT_SECRET': 'test-secret',
      };
      return config[key];
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'Password123',
      name: 'Test User',
    };

    it('should register a new user successfully', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashedPassword' as never);
      usersService.create.mockResolvedValue(mockUser);
      otpService.createEmailVerificationOtp.mockResolvedValue('123456');
      mailService.sendOtpEmail.mockResolvedValue();

      const result = await service.register(registerDto);

      expect(usersService.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(registerDto.password, 12);
      expect(usersService.create).toHaveBeenCalledWith({
        email: registerDto.email,
        password: 'hashedPassword',
        name: registerDto.name,
      });
      expect(otpService.createEmailVerificationOtp).toHaveBeenCalledWith(registerDto.email, mockUser.id);
      expect(mailService.sendOtpEmail).toHaveBeenCalledWith(registerDto.email, '123456', 'verification');
      expect(result).toEqual({
        message: 'Registration successful. Please check your email for verification code.',
        email: registerDto.email,
      });
    });

    it('should throw ConflictException if user already exists', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(usersService.findByEmail).toHaveBeenCalledWith(registerDto.email);
    });

    it('should handle email sending failure gracefully', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashedPassword' as never);
      usersService.create.mockResolvedValue(mockUser);
      otpService.createEmailVerificationOtp.mockResolvedValue('123456');
      mailService.sendOtpEmail.mockRejectedValue(new Error('Email failed'));

      const result = await service.register(registerDto);

      expect(result.message).toContain('However, there was an issue sending the verification email');
    });
  });

  describe('verifyEmail', () => {
    const verifyOtpDto = {
      email: 'test@example.com',
      otp: '123456',
    };

    it('should verify email successfully', async () => {
      const unverifiedUser = { ...mockUser, emailVerified: false };
      const verifiedUser = { ...mockUser, emailVerified: true };

      otpService.verifyEmailOtp.mockResolvedValue(true);
      usersService.findByEmail.mockResolvedValue(unverifiedUser);
      usersService.verifyEmail.mockResolvedValue(verifiedUser);
      mailService.sendWelcomeEmail.mockResolvedValue();

      const result = await service.verifyEmail(verifyOtpDto);

      expect(otpService.verifyEmailOtp).toHaveBeenCalledWith(verifyOtpDto.email, verifyOtpDto.otp);
      expect(usersService.verifyEmail).toHaveBeenCalledWith(unverifiedUser.id);
      expect(mailService.sendWelcomeEmail).toHaveBeenCalledWith(verifyOtpDto.email, unverifiedUser.name);
      expect(result.message).toBe('Email verified successfully');
      expect(result.user.emailVerified).toBe(true);
    });

    it('should throw BadRequestException for invalid OTP', async () => {
      otpService.verifyEmailOtp.mockResolvedValue(false);

      await expect(service.verifyEmail(verifyOtpDto)).rejects.toThrow(BadRequestException);
      expect(otpService.verifyEmailOtp).toHaveBeenCalledWith(verifyOtpDto.email, verifyOtpDto.otp);
    });

    it('should throw BadRequestException if email is already verified', async () => {
      otpService.verifyEmailOtp.mockResolvedValue(true);
      usersService.findByEmail.mockResolvedValue(mockUser); // already verified

      await expect(service.verifyEmail(verifyOtpDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'Password123',
    };

    it('should login user successfully', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      jwtService.sign.mockReturnValue('access-token');
      mockRefreshTokenRepository.save.mockResolvedValue({});

      const result = await service.login(loginDto, 'user-agent', '127.0.0.1');

      expect(usersService.findByEmailWithPassword).toHaveBeenCalledWith(loginDto.email);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockUser.password);
      expect(result.user.email).toBe(mockUser.email);
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for unverified email', async () => {
      const unverifiedUser = { ...mockUser, emailVerified: false };
      usersService.findByEmailWithPassword.mockResolvedValue(unverifiedUser);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    const payload = {
      sub: 1,
      email: 'test@example.com',
      emailVerified: true,
    };

    it('should return user for valid payload', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      const result = await service.validateUser(payload);

      expect(result).toBe(mockUser);
      expect(usersService.findByEmail).toHaveBeenCalledWith(payload.email);
    });

    it('should return null for unverified user', async () => {
      const unverifiedUser = { ...mockUser, emailVerified: false };
      usersService.findByEmail.mockResolvedValue(unverifiedUser);

      const result = await service.validateUser(payload);

      expect(result).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser(payload);

      expect(result).toBeNull();
    });
  });
});