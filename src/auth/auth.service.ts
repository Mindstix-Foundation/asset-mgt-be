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
} 