import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter;

  constructor(private configService: ConfigService) {
    this.createTransporter();
  }

  private createTransporter() {
    const smtpHost = this.configService.get<string>('SMTP_HOST') || this.configService.get<string>('smtp.host');
    const smtpPort = this.configService.get<number>('SMTP_PORT') || this.configService.get<number>('smtp.port', 587);
    const smtpUser = this.configService.get<string>('SMTP_USER') || this.configService.get<string>('smtp.user');
    const smtpPass = this.configService.get<string>('SMTP_PASS') || this.configService.get<string>('smtp.pass');

    if (!smtpHost || !smtpUser || !smtpPass) {
      this.logger.warn('SMTP configuration is missing. Email functionality will be disabled.');
      this.logger.warn('Please set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates
      },
    });

    this.logger.log('Mail transporter created successfully');
  }

  /**
   * Send OTP verification email
   */
  async sendOtpEmail(email: string, otp: string, type: 'verification' | 'password_reset' = 'verification'): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`Cannot send email to ${email} - SMTP not configured`);
      // In development, log the OTP for testing
      if (this.configService.get('NODE_ENV') === 'development') {
        this.logger.log(`OTP for ${email}: ${otp}`);
      }
      return;
    }

    const subject = type === 'verification'
      ? 'Email Verification - Your OTP Code'
      : 'Password Reset - Your OTP Code';

    const html = this.getOtpEmailTemplate(otp, type);
    const smtpUser = this.configService.get<string>('SMTP_USER') || this.configService.get<string>('smtp.user');

    try {
      const info = await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_FROM') || this.configService.get<string>('smtp.from') || `"NestJS App" <${smtpUser}>`,
        to: email,
        subject,
        html,
      });

      this.logger.log(`OTP email sent successfully to ${email}. Message ID: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${email}:`, error);
      // In development, still log the OTP for testing
      if (this.configService.get('NODE_ENV') === 'development') {
        this.logger.log(`OTP for ${email}: ${otp}`);
      }
      throw error;
    }
  }

  /**
   * Send welcome email after successful verification
   */
  async sendWelcomeEmail(email: string, name?: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`Cannot send welcome email to ${email} - SMTP not configured`);
      return;
    }

    const displayName = name || 'User';
    const html = this.getWelcomeEmailTemplate(displayName);
    const smtpUser = this.configService.get<string>('SMTP_USER') || this.configService.get<string>('smtp.user');

    try {
      const info = await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_FROM') || this.configService.get<string>('smtp.from') || `"NestJS App" <${smtpUser}>`,
        to: email,
        subject: 'Welcome to NestJS App!',
        html,
      });

      this.logger.log(`Welcome email sent successfully to ${email}. Message ID: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}:`, error);
      // Don't throw error for welcome email as it's not critical
    }
  }

  /**
   * Get OTP email template
   */
  private getOtpEmailTemplate(otp: string, type: 'verification' | 'password_reset'): string {
    const title = type === 'verification' ? 'Verify Your Email' : 'Reset Your Password';
    const message = type === 'verification'
      ? 'Please use the following OTP to verify your email address:'
      : 'Please use the following OTP to reset your password:';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 5px; margin: 20px 0; }
          .otp-code { background: #e9ecef; border: 2px dashed #6c757d; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 3px; margin: 20px 0; }
          .footer { text-align: center; color: #6c757d; font-size: 14px; }
          .warning { color: #dc3545; font-weight: bold; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${title}</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>${message}</p>
            <div class="otp-code">${otp}</div>
            <p>This OTP is valid for 10 minutes and can only be used once.</p>
            <div class="warning">
              ⚠️ If you didn't request this OTP, please ignore this email and contact support if you have concerns.
            </div>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
            <p>&copy; ${new Date().getFullYear()} NestJS App. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get welcome email template
   */
  private getWelcomeEmailTemplate(name: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to NestJS App!</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 20px; text-align: center; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 5px; margin: 20px 0; }
          .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #6c757d; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to NestJS App!</h1>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>Congratulations! Your email has been successfully verified and your account is now active.</p>
            <p>You can now enjoy all the features our application has to offer:</p>
            <ul>
              <li>Secure authentication</li>
              <li>Profile management</li>
              <li>And much more!</li>
            </ul>
            <p>Thank you for joining us!</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
            <p>&copy; ${new Date().getFullYear()} NestJS App. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error('SMTP connection failed:', error);
      return false;
    }
  }
}