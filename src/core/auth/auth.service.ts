import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as nodemailer from 'nodemailer';
import * as crypto from 'node:crypto';
import { isEmail } from 'class-validator';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password.dto';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private readonly tokenBlacklist: Set<string> = new Set();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Initialize cleanup tasks when module loads
   */
  async onModuleInit() {
    // Start periodic token cleanup
    this.startTokenCleanup();
  }

  /**
   * Start periodic token blacklist cleanup
   */
  private startTokenCleanup(): void {
    // Clean up expired tokens every hour
    this.cleanupInterval = setInterval(
      async () => {
        await this.cleanupExpiredBlacklistedTokens();
      },
      60 * 60 * 1000,
    ); // 1 hour

    // Also run cleanup on startup
    this.cleanupExpiredBlacklistedTokens();
  }

  /**
   * Cleanup expired blacklisted tokens
   */
  private async cleanupExpiredBlacklistedTokens(): Promise<void> {
    try {
      const result = await this.prisma.blacklistedToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      if (result.count > 0) {
        // Clear in-memory cache periodically
        this.tokenBlacklist.clear();
      }
    } catch (error) {
      this.logger.error('Failed to cleanup expired tokens:', error);
    }
  }

  /**
   * Generate session fingerprint for security
   */
  private generateFingerprint(ipAddress?: string, userAgent?: string): string {
    const data = `${ipAddress || 'unknown'}-${userAgent || 'unknown'}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Validate session fingerprint to prevent session hijacking
   */
  private async validateSessionFingerprint(
    sessionId: number,
    currentIp?: string,
    currentUserAgent?: string,
  ): Promise<boolean> {
    try {
      const session = await this.prisma.refreshSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        return false;
      }

      const storedFingerprint = this.generateFingerprint(
        session.ipAddress || undefined,
        session.userAgent || undefined,
      );
      const currentFingerprint = this.generateFingerprint(
        currentIp,
        currentUserAgent,
      );

      return storedFingerprint === currentFingerprint;
    } catch (error) {
      this.logger.error('Session fingerprint validation failed:', error);
      return false;
    }
  }

  async login(
    loginDto: LoginDto,
    deviceInfo?: { ipAddress?: string; userAgent?: string; deviceId?: string },
  ) {
    const { username, password } = loginDto;

    try {
      // Look up user by username, email, or employee ID
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { username: username },
            { employee: { email: username } },
            { employee: { employeeId: username } },
          ],
          isActive: true,
        },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              employeeId: true,
            },
          },
          userRoles: {
            where: {
              isActive: true,
            },
            include: {
              role: true,
            },
          },
        },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const lockTimeRemaining = Math.ceil(
          (user.lockedUntil.getTime() - Date.now()) / 60000,
        );
        throw new UnauthorizedException(
          `Account locked. Try again in ${lockTimeRemaining} minutes.`,
        );
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordValid) {
        // Increment failed login attempts
        const failedAttempts = user.failedLoginAttempts + 1;
        const lockUntil =
          failedAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null; // Lock for 15 minutes after 5 failed attempts

        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: failedAttempts,
            lockedUntil: lockUntil,
          },
        });

        throw new UnauthorizedException('Invalid credentials');
      }

      // Verify user has at least one active role (admin-only system)
      const hasActiveRole = user.userRoles.some(
        (userRole) => userRole.isActive,
      );

      if (!hasActiveRole) {
        throw new UnauthorizedException(
          'Access denied. No active roles found.',
        );
      }

      // Generate tokens
      const refreshToken = this.generateRefreshToken();
      const refreshTokenExpires = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ); // 7 days

      // Create refresh session with device tracking
      await this.prisma.refreshSession.create({
        data: {
          userId: user.id,
          token: refreshToken,
          expiresAt: refreshTokenExpires,
          deviceId: deviceInfo?.deviceId,
          ipAddress: deviceInfo?.ipAddress,
          userAgent: deviceInfo?.userAgent,
        },
      });

      // Reset failed login attempts on successful login
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          lastLogin: new Date(),
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      const payload = {
        sub: user.id,
        username: user.username,
        email: user.employee.email,
        employeeId: user.employee.employeeId,
      };

      const accessToken = this.jwtService.sign(payload);

      return {
        success: true,
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.employee.email,
          name: `${user.employee.firstName} ${user.employee.lastName}`,
          employeeId: user.employee.employeeId,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      console.error('Database error during login:', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  async validateUser(payload: any) {
    // This will be called by the JWT strategy
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            employeeId: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.employee.email,
      name: `${user.employee.firstName} ${user.employee.lastName}`,
      employeeId: user.employee.employeeId,
    };
  }

  async getProfile(userId: number) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              employeeId: true,
              phone: true,
              dateOfBirth: true,
              address: true,
              status: true,
            },
          },
          userRoles: {
            include: {
              role: true,
            },
            where: {
              isActive: true,
            },
          },
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      return {
        success: true,
        data: {
          id: user.id,
          username: user.username,
          email: user.employee.email,
          name: `${user.employee.firstName} ${user.employee.lastName}`,
          employeeId: user.employee.employeeId,
          employee: user.employee,
          roles: user.userRoles.map((userRole) => userRole.role.roleName),
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('Error fetching user profile:', error);
      throw new UnauthorizedException('Failed to fetch user profile');
    }
  }

  async refreshToken(
    refreshToken: string,
    deviceInfo?: { ipAddress?: string; userAgent?: string; deviceId?: string },
  ) {
    try {
      // Find refresh session
      const session = await this.prisma.refreshSession.findFirst({
        where: {
          token: refreshToken,
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          user: {
            include: {
              employee: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                  employeeId: true,
                },
              },
            },
          },
        },
      });

      if (!session || !session.user.isActive) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      // Generate new tokens
      const newRefreshToken = this.generateRefreshToken();
      const refreshTokenExpires = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ); // 7 days

      // Rotate session atomically. deleteMany avoids P2025 when two refresh
      // requests race on the same token (second delete finds 0 rows).
      await this.prisma.$transaction(async (tx) => {
        const deleted = await tx.refreshSession.deleteMany({
          where: {
            id: session.id,
            token: refreshToken,
          },
        });

        if (deleted.count === 0) {
          throw new UnauthorizedException('Invalid or expired refresh token');
        }

        await tx.refreshSession.create({
          data: {
            userId: session.userId,
            token: newRefreshToken,
            expiresAt: refreshTokenExpires,
            deviceId: deviceInfo?.deviceId || session.deviceId,
            ipAddress: deviceInfo?.ipAddress || session.ipAddress,
            userAgent: deviceInfo?.userAgent || session.userAgent,
          },
        });
      });

      const payload = {
        sub: session.user.id,
        username: session.user.username,
        email: session.user.employee.email,
        employeeId: session.user.employee.employeeId,
      };

      return {
        success: true,
        access_token: this.jwtService.sign(payload),
        refresh_token: newRefreshToken,
        expires_in: 900, // 15 minutes in seconds
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('Error refreshing token:', error);
      throw new UnauthorizedException('Failed to refresh token');
    }
  }

  async logout(userId: number, token?: string, refreshToken?: string) {
    try {
      // Blacklist the current access token if provided
      if (token) {
        await this.blacklistToken(token);
      }

      // Delete specific refresh session or all sessions for user
      if (refreshToken) {
        await this.prisma.refreshSession.deleteMany({
          where: {
            userId,
            token: refreshToken,
          },
        });
      } else {
        // Logout from all devices
        await this.prisma.refreshSession.deleteMany({
          where: { userId },
        });
      }

      return {
        success: true,
        message: 'Logged out successfully',
      };
    } catch (error) {
      this.logger.error('Logout error:', error);
      throw new UnauthorizedException('Logout failed');
    }
  }

  private generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  // Token Blacklisting Methods
  async blacklistToken(token: string): Promise<void> {
    try {
      const decoded = this.jwtService.decode(token);
      if (!decoded || typeof decoded === 'string') {
        throw new UnauthorizedException('Invalid token format');
      }

      await this.prisma.blacklistedToken.upsert({
        where: { token },
        update: {
          expiresAt: new Date(decoded.exp * 1000),
        },
        create: {
          token,
          expiresAt: new Date(decoded.exp * 1000),
        },
      });

      // Also add to in-memory blacklist for faster lookup
      this.tokenBlacklist.add(token);
    } catch (error) {
      this.logger.error('Token blacklisting error:', error);
      throw error;
    }
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    // First check in-memory cache for faster lookup
    if (this.tokenBlacklist.has(token)) {
      return true;
    }

    // Check database for blacklisted tokens
    try {
      const blacklistedToken = await this.prisma.blacklistedToken.findUnique({
        where: {
          token,
        },
      });

      if (blacklistedToken) {
        // Check if token has expired
        if (blacklistedToken.expiresAt > new Date()) {
          // Add to in-memory cache for future fast lookups
          this.tokenBlacklist.add(token);
          return true;
        } else {
          // Token has expired, remove from database
          await this.prisma.blacklistedToken.delete({
            where: { token },
          });
        }
      }

      // Also check for user-specific invalidation
      try {
        const decoded = this.jwtService.decode(token);
        if (
          decoded &&
          typeof decoded === 'object' &&
          decoded.sub &&
          decoded.iat
        ) {
          const userId = decoded.sub;
          const tokenIssuedAt = new Date(decoded.iat * 1000); // Convert JWT iat to Date

          // Check if there's a user invalidation token for this user that was created AFTER this token was issued
          const userInvalidationTokens =
            await this.prisma.blacklistedToken.findMany({
              where: {
                token: {
                  startsWith: `USER_INVALIDATION_${userId}_`,
                },
                expiresAt: {
                  gt: new Date(),
                },
                createdAt: {
                  gt: tokenIssuedAt,
                },
              },
            });

          if (userInvalidationTokens.length > 0) {
            // User has been invalidated after this token was issued, blacklist this token too
            this.tokenBlacklist.add(token);
            return true;
          }
        }
      } catch (decodeError) {
        this.logger.warn(
          'Failed to decode token for user invalidation check:',
          decodeError,
        );
      }

      return false;
    } catch (error) {
      this.logger.error('Error checking token blacklist:', error);
      // In case of database error, fall back to in-memory check
      return this.tokenBlacklist.has(token);
    }
  }

  async invalidateAllUserTokens(userId: number): Promise<void> {
    try {
      // Clean up expired tokens first
      await this.cleanupExpiredUserInvalidationTokens();

      // Delete all refresh sessions for this user (NEW - cookie-based sessions)
      await this.prisma.refreshSession.deleteMany({
        where: { userId },
      });

      // Create a special blacklist entry that will invalidate all access tokens for this user
      const userInvalidationToken = `USER_INVALIDATION_${userId}_${Date.now()}`;

      await this.prisma.blacklistedToken.create({
        data: {
          token: userInvalidationToken,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        },
      });

      // Also add to in-memory blacklist
      this.tokenBlacklist.add(userInvalidationToken);

    } catch (error) {
      this.logger.error('Failed to invalidate user tokens:', error);
      throw error;
    }
  }

  private async cleanupExpiredUserInvalidationTokens(): Promise<void> {
    try {
      const result = await this.prisma.blacklistedToken.deleteMany({
        where: {
          token: {
            startsWith: 'USER_INVALIDATION_',
          },
          expiresAt: {
            lt: new Date(),
          },
        },
      });

    } catch (error) {
      this.logger.error(
        'Failed to cleanup expired user invalidation tokens:',
        error,
      );
    }
  }

  // Password Reset Methods
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    // Introduce constant-time delay to prevent timing attacks
    const startTime = Date.now();
    const MINIMUM_DELAY_MS = 1000; // Always take at least 1 second

    try {
      // Check if email format is valid
      if (!isEmail(forgotPasswordDto.email)) {
        throw new UnauthorizedException('Invalid email format');
      }

      // Check if user exists with the given email
      const user = await this.prisma.user.findFirst({
        where: {
          employee: {
            email: forgotPasswordDto.email,
          },
          isActive: true,
        },
        include: {
          employee: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Always log the attempt, but don't expose if user exists or not
      if (!user) {
        this.logger.warn(
          `Password reset attempted for non-existent email: ${forgotPasswordDto.email}`,
        );

        // Introduce delay to match the time taken when user exists
        const elapsed = Date.now() - startTime;
        if (elapsed < MINIMUM_DELAY_MS) {
          await new Promise((resolve) =>
            setTimeout(resolve, MINIMUM_DELAY_MS - elapsed),
          );
        }

        // Return success message even if user doesn't exist
        return {
          message:
            'If your email is registered with us, you will receive a password reset link shortly.',
        };
      }

      // Generate reset token only if user exists
      const token = this.jwtService.sign(
        {
          email: user.employee.email,
          userId: user.id,
          type: 'password_reset',
        },
        { expiresIn: '15m' },
      );

      // Store reset token in database
      await this.prisma.passwordReset.create({
        data: {
          token,
          userId: user.id,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
          used: false,
        },
      });

      // Validate SMTP configuration before attempting to send email
      const smtpHost = this.configService.get('SMTP_HOST');
      const smtpPort = this.configService.get('SMTP_PORT');
      const smtpUser = this.configService.get('SMTP_USER');
      const smtpPass = this.configService.get('SMTP_PASS');

      if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
        this.logger.error(
          'SMTP configuration is incomplete. Please check your .env file.',
        );
        throw new InternalServerErrorException(
          'Email service is not configured. Please contact support.',
        );
      }

      // Send email only if user exists
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number.parseInt(String(smtpPort)),
        secure: Number.parseInt(String(smtpPort)) === 465, // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const frontendUrl =
        this.configService.get('FRONTEND_URL') || 'http://localhost:5173';

      await transporter.sendMail({
        from:
          this.configService.get('SMTP_FROM') ||
          '"Pebble Asset Tracker Support" <pebble-asset-tracker.noreply@gmail.com>',
        to: user.employee.email,
        subject:
          'Password Reset Request - Pebble Asset Tracker Asset Management',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa; line-height: 1.6;">
            <!-- Main Container -->
            <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #dee2e6; border-radius: 8px;">
              
              <!-- Header Section -->
              <div style="background-color: #212529; color: #ffffff; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px; font-weight: bold;">Pebble Asset Tracker Asset Management</h1>
                <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.9;">Password Reset Request</p>
              </div>

              <!-- Content Section -->
              <div style="padding: 30px;">
                <h2 style="margin: 0 0 20px; font-size: 20px; color: #212529; font-weight: 600;">
                  Reset Your Password
                </h2>

                <p style="margin: 0 0 20px; font-size: 16px; color: #495057;">
                  Hello ${user.employee.firstName},
                </p>

                <p style="margin: 0 0 25px; font-size: 16px; color: #495057;">
                  We received a request to reset the password for your Pebble Asset Tracker account. 
                  Click the button below to reset your password:
                </p>

                <!-- Reset Button -->
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${frontendUrl}/reset-password?token=${token}" 
                     style="display: inline-block; padding: 12px 24px; background-color: #198754; 
                            color: #ffffff; text-decoration: none; border-radius: 4px; 
                            font-weight: 600; font-size: 16px; border: 1px solid #198754;">
                    Reset Password
                  </a>
                </div>

                <!-- Important Notice -->
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin: 25px 0;">
                  <p style="margin: 0; font-size: 14px; color: #856404;">
                    <strong>Important:</strong> This password reset link will expire in 15 minutes for your security.
                  </p>
                </div>

                <!-- Security Information -->
                <div style="border: 1px solid #dee2e6; border-radius: 4px; padding: 20px; margin: 25px 0; background-color: #f8f9fa;">
                  <h4 style="margin: 0 0 15px; font-size: 16px; color: #212529;">Security Information</h4>
                  <ul style="margin: 0; padding-left: 20px; color: #495057; font-size: 14px;">
                    <li style="margin-bottom: 8px;">If you didn't request this password reset, please ignore this email</li>
                    <li style="margin-bottom: 8px;">Never share this reset link with anyone</li>
                    <li style="margin-bottom: 8px;">Choose a strong password for your account</li>
                    <li>Contact support if you have any concerns</li>
                  </ul>
                </div>

                <!-- Alternative Link -->
                <div style="margin: 25px 0; padding: 15px; background-color: #e9ecef; border-radius: 4px;">
                  <p style="margin: 0 0 8px; font-size: 12px; color: #495057; font-weight: 600;">
                    Having trouble with the button? Copy and paste this link into your browser:
                  </p>
                  <p style="margin: 0; font-size: 11px; color: #6c757d; word-break: break-all; font-family: monospace;">
                    ${frontendUrl}/reset-password?token=${token}
                  </p>
                </div>
              </div>

              <!-- Footer -->
              <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6; border-radius: 0 0 8px 8px;">
                <p style="margin: 0 0 8px; font-size: 14px; color: #212529; font-weight: 600;">
                  Pebble Asset Tracker Asset Management
                </p>
                <p style="margin: 0 0 8px; font-size: 12px; color: #6c757d;">
                  Professional Asset Tracking & Management
                </p>
                <p style="margin: 0 0 15px; font-size: 11px; color: #6c757d;">
                  This is an automated message. Please do not reply to this email.
                </p>
                <p style="margin: 0; font-size: 10px; color: #adb5bd;">
                  &copy; ${new Date().getFullYear()} Pebble Asset Tracker. All rights reserved.
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      // Ensure constant timing
      const elapsed = Date.now() - startTime;
      if (elapsed < MINIMUM_DELAY_MS) {
        await new Promise((resolve) =>
          setTimeout(resolve, MINIMUM_DELAY_MS - elapsed),
        );
      }

      // Return the same message whether user exists or not
      return {
        message:
          'If your email is registered with us, you will receive a password reset link shortly.',
      };
    } catch (error: unknown) {
      this.logger.error('Password reset request failed:', error);

      // Handle specific error types
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      // Log detailed error for debugging
      const errorCode =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code?: unknown }).code)
          : undefined;
      if (errorCode === 'EAUTH' || errorCode === 'ECONNECTION') {
        this.logger.error('SMTP Authentication or Connection Error:', error);
        throw new InternalServerErrorException(
          'Email service is currently unavailable. Please contact support or try again later.',
        );
      }

      // Generic error message to avoid information disclosure
      throw new InternalServerErrorException(
        'Unable to process your request. Please try again later.',
      );
    }
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    try {
      this.jwtService.verify(resetPasswordDto.token);

      const resetRecord = await this.prisma.passwordReset.findFirst({
        where: {
          token: resetPasswordDto.token,
          used: false,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (!resetRecord) {
        throw new UnauthorizedException('Invalid or expired reset token');
      }

      const hashedPassword = await bcrypt.hash(
        resetPasswordDto.newPassword,
        10,
      );

      // Update password
      await this.prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash: hashedPassword },
      });

      // Invalidate reset token
      await this.prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { used: true },
      });

      // Invalidate all existing sessions/tokens for this user
      await this.invalidateAllUserTokens(resetRecord.userId);

      return { message: 'Password successfully reset' };
    } catch (error) {
      this.logger.error('Password reset failed:', error);
      throw new UnauthorizedException('Invalid or expired reset token');
    }
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    try {
      // Get user with current password
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.passwordHash,
      );
      if (!isPasswordValid) {
        throw new BadRequestException('Current password is incorrect');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: hashedPassword },
      });

      // Invalidate all existing tokens for this user
      await this.invalidateAllUserTokens(userId);

      return { message: 'Password changed successfully' };
    } catch (error) {
      this.logger.error('Failed to change password:', error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to change password');
    }
  }
}
