import {
  Injectable,
  UnauthorizedException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import * as crypto from 'node:crypto';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { EmployeeStatus } from '@prisma/client';

/** Refresh-session lifetime when Remember Me is OFF (7 days). */
const DEFAULT_REFRESH_SESSION_MS = 7 * 24 * 60 * 60 * 1000;
/** Refresh-session lifetime when Remember Me is ON (30 days). */
const REMEMBER_ME_REFRESH_SESSION_MS = 30 * 24 * 60 * 60 * 1000;

type DeviceInfo = {
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
};

type AuthUserPayload = {
  id: number;
  email: string;
  name: string;
  employeeId: string;
};

type SessionResult = {
  success: true;
  access_token: string;
  refresh_token: string;
  remember_me: boolean;
  user: AuthUserPayload;
};

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private readonly tokenBlacklist: Set<string> = new Set();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private googleAuthClient: OAuth2Client | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    this.startTokenCleanup();
  }

  private startTokenCleanup(): void {
    this.cleanupInterval = setInterval(
      async () => {
        await this.cleanupExpiredBlacklistedTokens();
      },
      60 * 60 * 1000,
    );
    this.cleanupExpiredBlacklistedTokens();
  }

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
        this.tokenBlacklist.clear();
      }
    } catch (error) {
      this.logger.error('Failed to cleanup expired tokens:', error);
    }
  }

  private getGoogleAuthClient(googleClientId: string): OAuth2Client {
    this.googleAuthClient ??= new OAuth2Client(googleClientId);
    return this.googleAuthClient;
  }

  private async verifyGoogleIdToken(
    credential: string,
    googleClientId: string,
  ): Promise<TokenPayload> {
    try {
      const client = this.getGoogleAuthClient(googleClientId);
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: googleClientId,
      });
      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Invalid Google credential');
      }
      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error('Google token verification error:', error);
      throw new UnauthorizedException('Invalid Google credential');
    }
  }

  private async exchangeGoogleAuthCodeForPayload(
    code: string,
    redirectUri: string,
    googleClientId: string,
    googleClientSecret: string,
  ): Promise<TokenPayload> {
    try {
      const oauthClient = new OAuth2Client({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        redirectUri,
      });
      this.logger.log(
        `[exchangeCode] exchanging auth code with redirectUri=${redirectUri} clientIdSuffix=...${googleClientId.slice(-12)}`,
      );
      const { tokens } = await oauthClient.getToken(code);
      if (!tokens?.id_token) {
        this.logger.error('[exchangeCode] token exchange returned no id_token');
        throw new UnauthorizedException(
          'Google code exchange missing id_token',
        );
      }
      this.logger.log('[exchangeCode] id_token received, verifying');
      return await this.verifyGoogleIdToken(tokens.id_token, googleClientId);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      const googleError =
        error &&
        typeof error === 'object' &&
        'response' in error &&
        (error as { response?: { data?: { error?: string } } }).response?.data
          ?.error
          ? String(
              (error as { response?: { data?: { error?: string } } }).response
                ?.data?.error,
            )
          : '';
      if (googleError === 'invalid_client') {
        throw new UnauthorizedException(
          'Google OAuth client credentials are invalid. Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET from the same OAuth Web client.',
        );
      }
      if (googleError === 'invalid_grant') {
        throw new UnauthorizedException(
          'Google authorization code is invalid or expired. Please try signing in again.',
        );
      }
      this.logger.error('Google code exchange error:', error);
      throw new UnauthorizedException('Invalid Google authorization code');
    }
  }

  private async findActiveUserByGoogleEmail(email: string) {
    return this.prisma.user.findFirst({
      where: {
        isActive: true,
        employee: {
          email: {
            equals: email.toLowerCase(),
            mode: 'insensitive',
          },
          status: EmployeeStatus.ACTIVE,
        },
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
          where: { isActive: true },
          include: { role: true },
        },
      },
    });
  }

  /**
   * Issue access + refresh tokens after a successful Google identity check.
   */
  private async issueSessionForUser(
    user: NonNullable<Awaited<ReturnType<typeof this.findActiveUserByGoogleEmail>>>,
    deviceInfo?: DeviceInfo,
    rememberMe: boolean = false,
  ): Promise<SessionResult> {
    const hasActiveRole = user.userRoles.some((userRole) => userRole.isActive);
    if (!hasActiveRole) {
      throw new UnauthorizedException(
        'Access denied. No active roles found.',
      );
    }

    const refreshToken = this.generateRefreshToken();
    const refreshTokenExpires = new Date(
      Date.now() +
        (rememberMe
          ? REMEMBER_ME_REFRESH_SESSION_MS
          : DEFAULT_REFRESH_SESSION_MS),
    );

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
      email: user.employee.email,
      employeeId: user.employee.employeeId,
    };

    return {
      success: true,
      access_token: this.jwtService.sign(payload),
      refresh_token: refreshToken,
      remember_me: rememberMe,
      user: {
        id: user.id,
        email: user.employee.email,
        name: `${user.employee.firstName} ${user.employee.lastName}`,
        employeeId: user.employee.employeeId,
      },
    };
  }

  private async completeGoogleLogin(
    payload: TokenPayload,
    deviceInfo?: DeviceInfo,
    rememberMe: boolean = false,
  ): Promise<SessionResult> {
    this.logger.log(
      `[completeGoogleLogin] google email=${payload.email} verified=${payload.email_verified}`,
    );
    if (!payload.email || payload.email_verified !== true) {
      this.logger.warn('[completeGoogleLogin] email missing or not verified');
      throw new UnauthorizedException('Google email is not verified');
    }

    const user = await this.findActiveUserByGoogleEmail(payload.email);
    if (!user) {
      this.logger.warn(
        `[completeGoogleLogin] no active user linked to email=${payload.email}`,
      );
      throw new UnauthorizedException(
        'No active account is linked to this Google email.',
      );
    }

    this.logger.log(
      `[completeGoogleLogin] matched userId=${user.id} employeeId=${user.employee?.employeeId} activeRoles=${user.userRoles?.length ?? 0}`,
    );
    return this.issueSessionForUser(user, deviceInfo, rememberMe);
  }

  async loginWithGoogle(
    credential: string,
    deviceInfo?: DeviceInfo,
    rememberMe: boolean = false,
  ): Promise<SessionResult> {
    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!googleClientId) {
      throw new UnauthorizedException('Google login is not configured');
    }

    const payload = await this.verifyGoogleIdToken(credential, googleClientId);
    if (payload.aud !== googleClientId) {
      throw new UnauthorizedException('Google credential audience mismatch');
    }

    return this.completeGoogleLogin(payload, deviceInfo, rememberMe);
  }

  async loginWithGoogleAuthCode(
    code: string,
    redirectUri: string,
    deviceInfo?: DeviceInfo,
    rememberMe: boolean = false,
  ): Promise<SessionResult> {
    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const googleClientSecret = this.configService.get<string>(
      'GOOGLE_CLIENT_SECRET',
    );
    if (!googleClientId || !googleClientSecret) {
      throw new UnauthorizedException('Google code login is not configured');
    }

    const payload = await this.exchangeGoogleAuthCodeForPayload(
      code,
      redirectUri,
      googleClientId,
      googleClientSecret,
    );
    if (payload.aud !== googleClientId) {
      throw new UnauthorizedException('Google credential audience mismatch');
    }

    return this.completeGoogleLogin(payload, deviceInfo, rememberMe);
  }

  /** Strip trailing slashes without regex backtracking. */
  private stripTrailingSlashes(value: string): string {
    let result = value.trim();
    while (result.endsWith('/')) {
      result = result.slice(0, -1);
    }
    return result;
  }

  getFrontendBaseUrl(): string {
    const raw =
      this.configService.get<string>('FRONTEND_URL') ||
      this.configService.get<string>('CORS_ORIGIN')?.split(',')[0] ||
      'http://localhost:5173';
    return this.stripTrailingSlashes(raw);
  }

  getGoogleOAuthRedirectUri(): string {
    const explicit = this.configService.get<string>('GOOGLE_OAUTH_REDIRECT_URI');
    if (explicit?.trim()) {
      return this.stripTrailingSlashes(explicit);
    }
    const raw =
      this.configService.get<string>('PUBLIC_API_BASE_URL') ||
      this.configService.get<string>('API_PUBLIC_BASE_URL') ||
      `http://localhost:${this.configService.get<string>('PORT') || '3000'}`;
    const base = this.stripTrailingSlashes(String(raw));
    if (base.endsWith('/api')) {
      return `${base}/auth/google/callback`;
    }
    return `${base}/api/auth/google/callback`;
  }

  private sanitizeOAuthReturnPath(raw?: string): string | undefined {
    if (!raw?.trim()) return undefined;
    const path = raw.trim();
    if (!path.startsWith('/') || path.startsWith('//')) return undefined;
    if (path.includes('://')) return undefined;
    return path;
  }

  createGoogleOAuthState(rememberMe: boolean, returnPath?: string): string {
    const safePath = this.sanitizeOAuthReturnPath(returnPath);
    return this.jwtService.sign(
      {
        typ: 'google_oauth_state',
        rm: rememberMe === true,
        ...(safePath ? { redir: safePath } : {}),
        nonce: crypto.randomBytes(16).toString('hex'),
      },
      { expiresIn: '10m' },
    );
  }

  parseGoogleOAuthState(state: string): {
    rememberMe: boolean;
    returnPath?: string;
  } {
    let decoded: { typ?: string; rm?: boolean; redir?: string };
    try {
      decoded = this.jwtService.verify(state);
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired Google sign-in session. Please try again.',
      );
    }
    if (decoded.typ !== 'google_oauth_state') {
      throw new UnauthorizedException('Invalid Google sign-in session.');
    }
    return {
      rememberMe: decoded.rm === true,
      returnPath: this.sanitizeOAuthReturnPath(decoded.redir),
    };
  }

  buildGoogleOAuthAuthorizationUrl(
    rememberMe: boolean,
    returnPath?: string,
  ): string {
    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const googleClientSecret = this.configService.get<string>(
      'GOOGLE_CLIENT_SECRET',
    );
    if (!googleClientId || !googleClientSecret) {
      throw new UnauthorizedException('Google login is not configured');
    }
    const redirectUri = this.getGoogleOAuthRedirectUri();
    const state = this.createGoogleOAuthState(rememberMe, returnPath);
    const oauthClient = new OAuth2Client({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      redirectUri,
    });
    return oauthClient.generateAuthUrl({
      access_type: 'online',
      scope: ['openid', 'email', 'profile'],
      state,
      prompt: 'select_account',
    });
  }

  buildFrontendLoginRedirect(params: Record<string, string | undefined>): string {
    const base = this.getFrontendBaseUrl();
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value != null && value !== '') qs.set(key, value);
    }
    const query = qs.toString();
    return query ? `${base}/?${query}` : `${base}/`;
  }

  buildFrontendGoogleErrorRedirect(message: string): string {
    return this.buildFrontendLoginRedirect({
      google_error: '1',
      google_error_message: message.slice(0, 300),
    });
  }

  async validateUser(payload: any) {
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

    if (!user?.isActive) {
      return null;
    }

    return {
      id: user.id,
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

      if (!user?.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      return {
        success: true,
        data: {
          id: user.id,
          email: user.employee.email,
          name: `${user.employee.firstName} ${user.employee.lastName}`,
          employeeId: user.employee.employeeId,
          employee: user.employee,
          roles: user.userRoles.map((userRole) => userRole.role.roleName),
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        // Flat user shape for FE session hydrate after Google redirect
        user: {
          id: user.id,
          email: user.employee.email,
          name: `${user.employee.firstName} ${user.employee.lastName}`,
          employeeId: user.employee.employeeId,
          roles: user.userRoles.map((userRole) => userRole.role.roleName),
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Error fetching user profile:', error);
      throw new UnauthorizedException('Failed to fetch user profile');
    }
  }

  async refreshToken(refreshToken: string, deviceInfo?: DeviceInfo) {
    try {
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

      if (!session?.user?.isActive) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      const remainingMs = session.expiresAt.getTime() - Date.now();
      const rememberMe = remainingMs > DEFAULT_REFRESH_SESSION_MS;
      const newRefreshToken = this.generateRefreshToken();
      const refreshTokenExpires = new Date(
        Date.now() +
          (rememberMe
            ? REMEMBER_ME_REFRESH_SESSION_MS
            : DEFAULT_REFRESH_SESSION_MS),
      );

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
        email: session.user.employee.email,
        employeeId: session.user.employee.employeeId,
      };

      return {
        success: true,
        access_token: this.jwtService.sign(payload),
        refresh_token: newRefreshToken,
        remember_me: rememberMe,
        expires_in: 900,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Error refreshing token:', error);
      throw new UnauthorizedException('Failed to refresh token');
    }
  }

  async logout(userId: number, token?: string, refreshToken?: string) {
    try {
      if (token) {
        await this.blacklistToken(token);
      }

      if (refreshToken) {
        await this.prisma.refreshSession.deleteMany({
          where: {
            userId,
            token: refreshToken,
          },
        });
      } else {
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

      this.tokenBlacklist.add(token);
    } catch (error) {
      this.logger.error('Token blacklisting error:', error);
      throw error;
    }
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    if (this.tokenBlacklist.has(token)) {
      return true;
    }

    try {
      const blacklistedToken = await this.prisma.blacklistedToken.findUnique({
        where: { token },
      });

      if (blacklistedToken) {
        if (blacklistedToken.expiresAt > new Date()) {
          this.tokenBlacklist.add(token);
          return true;
        }
        await this.prisma.blacklistedToken.delete({
          where: { token },
        });
      }

      try {
        const decoded = this.jwtService.decode(token);
        if (
          decoded &&
          typeof decoded === 'object' &&
          decoded.sub &&
          decoded.iat
        ) {
          const userId = decoded.sub;
          const tokenIssuedAt = new Date(decoded.iat * 1000);

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
      return this.tokenBlacklist.has(token);
    }
  }

  async invalidateAllUserTokens(userId: number): Promise<void> {
    try {
      await this.cleanupExpiredUserInvalidationTokens();

      await this.prisma.refreshSession.deleteMany({
        where: { userId },
      });

      const userInvalidationToken = `USER_INVALIDATION_${userId}_${Date.now()}`;

      await this.prisma.blacklistedToken.create({
        data: {
          token: userInvalidationToken,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });

      this.tokenBlacklist.add(userInvalidationToken);
    } catch (error) {
      this.logger.error('Failed to invalidate user tokens:', error);
      throw error;
    }
  }

  private async cleanupExpiredUserInvalidationTokens(): Promise<void> {
    try {
      await this.prisma.blacklistedToken.deleteMany({
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
}
