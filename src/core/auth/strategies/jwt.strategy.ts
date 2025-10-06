import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

export interface JwtPayload {
  sub: number;
  username: string;
  employeeId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    super({
      // Extract JWT from both Authorization header AND cookies
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: any) => {
          return request?.cookies?.access_token || null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        employee: true,
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

    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    // Check if user has ADMIN role
    const hasAdminRole = user.userRoles.some(
      (userRole) => userRole.role.roleName === 'ADMIN' && userRole.isActive,
    );

    if (!hasAdminRole) {
      throw new UnauthorizedException('Access denied. Admin role required.');
    }

    return {
      id: user.id,
      username: user.username,
      employeeId: user.employeeId,
      employee: user.employee,
      // Derive roles from UserRole mapping (source of truth)
      roles: (user.userRoles || []).map((ur) => ur.role.roleName),
    };
  }
}
