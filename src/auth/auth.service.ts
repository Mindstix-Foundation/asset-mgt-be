import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { username, password } = loginDto;

    // Find user by username (could be username or employee ID)
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: username },
          { 
            employee: {
              employeeId: username
            }
          }
        ],
        isActive: true,
      },
      include: {
        employee: true,
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

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate JWT token
    const payload = {
      sub: user.id,
      username: user.username,
      employeeId: user.employeeId,
    };

    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        username: user.username,
        employeeId: user.employeeId,
        roles: user.userRoles.map((userRole) => userRole.role.roleName),
      },
    };
  }

  async validateUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        employee: true,
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
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      employeeId: user.employeeId,
      employee: user.employee,
      roles: user.userRoles.map((userRole) => userRole.role.roleName),
    };
  }
} 