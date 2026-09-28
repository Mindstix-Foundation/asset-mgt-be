import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

export interface JwtPayload {
  sub: number;
  email: string;
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

    if (!user?.isActive) {
      throw new UnauthorizedException('Invalid or inactive user');
    }

    // Since this is an admin-only system, verify user has at least one active role
    // (In practice, all users in this system should have ADMIN role)
    const hasActiveRole = user.userRoles.some((userRole) => userRole.isActive);

    if (!hasActiveRole) {
      throw new UnauthorizedException('User has no active roles');
    }

    return {
      id: user.id,
      email: user.employee.email,
      name: `${user.employee.firstName} ${user.employee.lastName}`.trim(),
      employeeId: user.employeeId,
      employee: user.employee,
      // Derive roles from UserRole mapping (source of truth)
      roles: (user.userRoles || []).map((ur) => ur.role.roleName),
    };
  }
}
