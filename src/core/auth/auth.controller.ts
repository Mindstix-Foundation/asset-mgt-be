import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Query,
  Request,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { GoogleCodeLoginDto } from './dto/google-code-login.dto';
import { Public } from './decorators/public.decorator';
import type {
  Response as ExpressResponse,
  Request as ExpressRequest,
  CookieOptions,
} from 'express';

const ACCESS_TOKEN_COOKIE_MAX_AGE_MS = 15 * 60 * 1000;
const REMEMBER_ME_REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function authCookieSecure(): boolean {
  const isProduction = process.env.NODE_ENV === 'production';
  if (process.env.COOKIE_SECURE !== undefined) {
    return process.env.COOKIE_SECURE === 'true';
  }
  return isProduction;
}

function authCookieSameSite(): 'strict' | 'lax' {
  return authCookieSecure() ? 'strict' : 'lax';
}

function buildAccessCookieOptions(rememberMe: boolean): CookieOptions {
  const base: CookieOptions = {
    httpOnly: true,
    secure: authCookieSecure(),
    sameSite: authCookieSameSite(),
    path: '/',
  };
  if (rememberMe) {
    return { ...base, maxAge: ACCESS_TOKEN_COOKIE_MAX_AGE_MS };
  }
  return base;
}

function buildRefreshCookieOptions(rememberMe: boolean): CookieOptions {
  const base: CookieOptions = {
    httpOnly: true,
    secure: authCookieSecure(),
    sameSite: authCookieSameSite(),
    path: '/',
  };
  if (rememberMe) {
    return { ...base, maxAge: REMEMBER_ME_REFRESH_COOKIE_MAX_AGE_MS };
  }
  return base;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setAuthCookies(
    res: ExpressResponse,
    accessToken: string,
    refreshToken: string,
    rememberMe: boolean,
  ): void {
    res.cookie(
      'access_token',
      accessToken,
      buildAccessCookieOptions(rememberMe),
    );
    res.cookie(
      'refresh_token',
      refreshToken,
      buildRefreshCookieOptions(rememberMe),
    );
  }

  private deviceInfoFromRequest(req: ExpressRequest) {
    return {
      ipAddress: req.ip || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
      deviceId: req.headers['x-device-id'] as string,
    };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('google-login')
  @ApiOperation({ summary: 'Google Sign-In login (ID token)' })
  @ApiBody({ type: GoogleLoginDto })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async googleLogin(
    @Body() dto: GoogleLoginDto,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: ExpressResponse,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.loginWithGoogle(
      dto.credential,
      this.deviceInfoFromRequest(req),
      dto.remember_me === true,
    );

    this.setAuthCookies(
      res,
      result.access_token,
      result.refresh_token,
      result.remember_me === true,
    );

    return {
      success: result.success,
      access_token: result.access_token,
      user: result.user,
    };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Get('google')
  @ApiOperation({
    summary: 'Start Google OAuth (server redirect)',
  })
  async googleAuthStart(
    @Query('remember_me') rememberMeRaw: string | undefined,
    @Query('redirect') redirect: string | undefined,
    @Res() res: ExpressResponse,
  ): Promise<void> {
    try {
      const rememberMe =
        rememberMeRaw === '1' ||
        rememberMeRaw === 'true' ||
        rememberMeRaw === 'yes';
      const url = this.authService.buildGoogleOAuthAuthorizationUrl(
        rememberMe,
        redirect,
      );
      res.redirect(url);
    } catch (error) {
      const message =
        error instanceof UnauthorizedException
          ? error.message
          : 'Google sign-in is unavailable.';
      res.redirect(this.authService.buildFrontendGoogleErrorRedirect(message));
    }
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback (sets session cookies)' })
  async googleAuthCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') oauthError: string | undefined,
    @Req() req: ExpressRequest,
    @Res() res: ExpressResponse,
  ): Promise<void> {
    if (oauthError) {
      const message =
        oauthError === 'access_denied'
          ? 'Google sign-in was cancelled.'
          : 'Google sign-in failed. Please try again.';
      res.redirect(this.authService.buildFrontendGoogleErrorRedirect(message));
      return;
    }

    if (!code?.trim() || !state?.trim()) {
      res.redirect(
        this.authService.buildFrontendGoogleErrorRedirect(
          'Google sign-in did not complete. Please try again.',
        ),
      );
      return;
    }

    try {
      const { rememberMe, returnPath } =
        this.authService.parseGoogleOAuthState(state);
      const redirectUri = this.authService.getGoogleOAuthRedirectUri();
      const result = await this.authService.loginWithGoogleAuthCode(
        code.trim(),
        redirectUri,
        this.deviceInfoFromRequest(req),
        rememberMe,
      );

      this.setAuthCookies(
        res,
        result.access_token,
        result.refresh_token,
        result.remember_me === true,
      );

      if (returnPath) {
        res.redirect(`${this.authService.getFrontendBaseUrl()}${returnPath}`);
        return;
      }

      res.redirect(
        this.authService.buildFrontendLoginRedirect({ google_session: '1' }),
      );
    } catch (error) {
      const message =
        error instanceof UnauthorizedException
          ? error.message
          : 'Google login failed. Please try again.';
      res.redirect(this.authService.buildFrontendGoogleErrorRedirect(message));
    }
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('google-code-login')
  @ApiOperation({ summary: 'Google OAuth code login (popup fallback)' })
  @ApiBody({ type: GoogleCodeLoginDto })
  async googleCodeLogin(
    @Body() dto: GoogleCodeLoginDto,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: ExpressResponse,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.loginWithGoogleAuthCode(
      dto.code,
      dto.redirect_uri,
      this.deviceInfoFromRequest(req),
      dto.remember_me === true,
    );

    this.setAuthCookies(
      res,
      result.access_token,
      result.refresh_token,
      result.remember_me === true,
    );

    return {
      success: result.success,
      access_token: result.access_token,
      user: result.user,
    };
  }

  @Get('profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      'Get authenticated user profile information including user details and roles',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired token',
  })
  async getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.id);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Refresh the access token to extend session',
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired token',
  })
  async refreshToken(
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: ExpressResponse,
    @Body('refresh_token') bodyRefreshToken?: string,
  ) {
    const refreshToken = req.cookies?.refresh_token || bodyRefreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not provided');
    }

    const result = await this.authService.refreshToken(
      refreshToken,
      this.deviceInfoFromRequest(req),
    );

    this.setAuthCookies(
      res,
      result.access_token,
      result.refresh_token,
      result.remember_me === true,
    );

    return {
      success: result.success,
      access_token: result.access_token,
      expires_in: result.expires_in,
    };
  }

  @Post('logout')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'User logout',
    description: 'Logout user and invalidate refresh token',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
  })
  async logout(
    @Request() req: any,
    @Req() request: ExpressRequest,
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    const accessToken =
      req.headers.authorization?.split(' ')[1] || request.cookies?.access_token;
    const refreshToken = request.cookies?.refresh_token;

    const result = await this.authService.logout(
      req.user.id,
      accessToken,
      refreshToken,
    );

    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });

    return result;
  }
}
