import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;

    try {
      // Look up user by username or email (through employee relation)
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { username: username },
            { employee: { email: username } }
          ],
          isActive: true
        },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              employeeId: true
            }
          }
        }
      });

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });

      const payload = {
        sub: user.id,
        username: user.username,
        email: user.employee.email,
        employeeId: user.employee.employeeId,
      };

      return {
        success: true,
        access_token: this.jwtService.sign(payload),
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
            employeeId: true
          }
        }
      }
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
              status: true
            }
          },
          userRoles: {
            include: {
              role: true,
            },
            where: {
              isActive: true,
            },
          },
        }
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
          updatedAt: user.updatedAt
        }
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('Error fetching user profile:', error);
      throw new UnauthorizedException('Failed to fetch user profile');
    }
  }

  async refreshToken(userId: number) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              employeeId: true
            }
          }
        }
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Update last login to track activity
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });

      const payload = {
        sub: user.id,
        username: user.username,
        email: user.employee.email,
        employeeId: user.employee.employeeId,
      };

      return {
        success: true,
        access_token: this.jwtService.sign(payload),
        expires_in: 900 // 15 minutes in seconds
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('Error refreshing token:', error);
      throw new UnauthorizedException('Failed to refresh token');
    }
  }
} 