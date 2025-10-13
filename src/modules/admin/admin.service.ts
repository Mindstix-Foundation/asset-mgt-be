import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import * as bcrypt from 'bcryptjs';
import { CreateAdminDto, UpdateAdminStatusDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAdminUsers() {
    try {
      // Get ADMIN role ID
      const adminRole = await this.prisma.role.findFirst({
        where: { roleName: 'ADMIN' },
      });

      if (!adminRole) {
        throw new BadRequestException('ADMIN role not found in system');
      }

      const users = await this.prisma.user.findMany({
        where: {
          userRoles: {
            some: {
              roleId: adminRole.id,
              isActive: true,
            },
          },
        },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              employeeId: true,
              phone: true,
              status: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        success: true,
        data: users,
      };
    } catch (error) {
      this.logger.error('Error fetching admin users:', error);
      throw error;
    }
  }

  async createAdminUser(createAdminDto: CreateAdminDto, currentUserId: number) {
    try {
      const {
        employeeId,
        username,
        password,
        roles = ['ADMIN'],
      } = createAdminDto;

      // Check if employee exists
      const employee = await this.prisma.employee.findUnique({
        where: { id: employeeId },
      });

      if (!employee) {
        throw new NotFoundException('Employee not found');
      }

      // Check if employee is already an admin
      const existingAdmin = await this.prisma.user.findFirst({
        where: {
          employeeId: employee.id,
          roles: {
            has: 'ADMIN',
          },
        },
      });

      if (existingAdmin) {
        throw new ConflictException('This employee is already an admin');
      }

      // Check if username is already taken
      const existingUser = await this.prisma.user.findUnique({
        where: { username },
      });

      if (existingUser) {
        throw new ConflictException('Username already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Get ADMIN role ID
      const adminRole = await this.prisma.role.findFirst({
        where: { roleName: 'ADMIN' },
      });

      if (!adminRole) {
        throw new BadRequestException('ADMIN role not found in system');
      }

      // Create admin user
      const adminUser = await this.prisma.user.create({
        data: {
          username,
          passwordHash: hashedPassword,
          employeeId: employee.id,
          roles: roles, // Keep for backward compatibility
          isActive: true,
          createdBy: currentUserId,
          updatedBy: currentUserId,
          userRoles: {
            create: {
              roleId: adminRole.id,
              assignedBy: currentUserId,
              isActive: true,
            },
          },
        },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              employeeId: true,
              phone: true,
              status: true,
            },
          },
        },
      });

      this.logger.log(
        `Admin user created: ${adminUser.username} for employee ${employee.firstName} ${employee.lastName}`,
      );

      return {
        success: true,
        message: 'Admin user created successfully',
        data: adminUser,
      };
    } catch (error) {
      this.logger.error('Error creating admin user:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to create admin user');
    }
  }

  async updateAdminStatus(
    id: number,
    updateStatusDto: UpdateAdminStatusDto,
    currentUserId: number,
  ) {
    try {
      const { isActive } = updateStatusDto;

      // Prevent self-deactivation/activation toggling
      if (id === currentUserId) {
        throw new BadRequestException(
          'You cannot change your own admin status',
        );
      }

      // Get ADMIN role ID
      const adminRole = await this.prisma.role.findFirst({
        where: { roleName: 'ADMIN' },
      });

      if (!adminRole) {
        throw new BadRequestException('ADMIN role not found in system');
      }

      // Check if admin user exists (regardless of current role assignment active state)
      const adminUser = await this.prisma.user.findFirst({
        where: {
          id,
          userRoles: {
            some: {
              roleId: adminRole.id,
            },
          },
        },
        include: {
          employee: true,
        },
      });

      if (!adminUser) {
        throw new NotFoundException('Admin user not found');
      }

      // Update status for both user and all their role mappings in a single transaction
      const updatedUser = await this.prisma.$transaction(async (tx) => {
        // Update user active state
        const user = await tx.user.update({
          where: { id },
          data: {
            isActive,
            updatedBy: currentUserId,
          },
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                employeeId: true,
                phone: true,
                status: true,
              },
            },
          },
        });

        // Toggle all role mappings for this user to match user active state
        await tx.userRole.updateMany({
          where: { userId: id },
          data: { isActive },
        });

        return user;
      });

      this.logger.log(
        `Admin user ${adminUser.username} ${isActive ? 'activated' : 'deactivated'}`,
      );

      return {
        success: true,
        message: `Admin user ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: updatedUser,
      };
    } catch (error) {
      this.logger.error('Error updating admin status:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to update admin status');
    }
  }

  /**
   * Check if an admin user can be safely deleted
   * Returns true if user has no related records in any createdBy/updatedBy fields
   */
  async checkAdminCanBeDeleted(id: number) {
    try {
      // Check if user exists
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: {
          employee: true,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check all tables for createdBy/updatedBy references
      const checks = await Promise.all([
        // Check Assets
        this.prisma.asset.count({
          where: {
            OR: [{ createdBy: id }, { updatedBy: id }],
          },
        }),
        // Check Asset Categories
        this.prisma.assetCategory.count({
          where: {
            OR: [{ createdBy: id }, { updatedBy: id }],
          },
        }),
        // Check Asset Types
        this.prisma.assetType.count({
          where: {
            OR: [{ createdBy: id }, { updatedBy: id }],
          },
        }),
        // Check Asset Issues
        this.prisma.assetIssue.count({
          where: {
            OR: [{ createdBy: id }, { updatedBy: id }, { issuedBy: id }],
          },
        }),
        // Check Asset Events
        this.prisma.assetEvent.count({
          where: { performedBy: id },
        }),
        // Check Brands
        this.prisma.brand.count({
          where: {
            OR: [{ createdBy: id }, { updatedBy: id }],
          },
        }),
        // Check Models
        this.prisma.model.count({
          where: {
            OR: [{ createdBy: id }, { updatedBy: id }],
          },
        }),
        // Check Vendors
        this.prisma.vendor.count({
          where: {
            OR: [{ createdBy: id }, { updatedBy: id }],
          },
        }),
        // Check Employees
        this.prisma.employee.count({
          where: {
            OR: [{ createdBy: id }, { updatedBy: id }],
          },
        }),
        // Check Maintenance Schedules
        this.prisma.maintenanceSchedule.count({
          where: {
            OR: [{ createdBy: id }, { updatedBy: id }],
          },
        }),
        // Check Users (created or updated other users)
        this.prisma.user.count({
          where: {
            OR: [{ createdBy: id }, { updatedBy: id }],
          },
        }),
        // Check UserRoles (assigned roles to others)
        this.prisma.userRole.count({
          where: { assignedBy: id },
        }),
      ]);

      const totalReferences = checks.reduce((sum, count) => sum + count, 0);
      const canBeDeleted = totalReferences === 0;

      return {
        success: true,
        data: {
          canBeDeleted,
          totalReferences,
          breakdown: {
            assets: checks[0],
            assetCategories: checks[1],
            assetTypes: checks[2],
            assetIssues: checks[3],
            assetEvents: checks[4],
            brands: checks[5],
            models: checks[6],
            vendors: checks[7],
            employees: checks[8],
            maintenanceSchedules: checks[9],
            users: checks[10],
            userRoles: checks[11],
          },
        },
      };
    } catch (error) {
      this.logger.error('Error checking admin deletion eligibility:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to check admin deletion status');
    }
  }

  async removeAdminUser(id: number, currentUserId: number) {
    try {
      // First check if user exists at all
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: {
          employee: true,
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Prevent self-deletion
      if (user.id === currentUserId) {
        throw new BadRequestException(
          'You cannot delete your own admin account',
        );
      }

      // Get ADMIN role ID
      const adminRole = await this.prisma.role.findFirst({
        where: { roleName: 'ADMIN' },
      });

      if (!adminRole) {
        throw new BadRequestException('ADMIN role not found in system');
      }

      // Check if user has ADMIN role (regardless of current active state)
      const hasAdminRole = user.userRoles.some(
        (userRole) => userRole.roleId === adminRole.id,
      );

      if (!hasAdminRole) {
        throw new NotFoundException('This user is not an admin');
      }

      // Check if admin can be safely deleted
      const deletionCheck = await this.checkAdminCanBeDeleted(id);
      if (!deletionCheck.data.canBeDeleted) {
        throw new BadRequestException(
          `Cannot delete admin user: This admin has ${deletionCheck.data.totalReferences} related records in the system. ` +
            `Please use Activate/Deactivate instead to preserve data integrity and audit trails.`,
        );
      }

      // Delete all UserRole entries for this user
      await this.prisma.userRole.deleteMany({
        where: {
          userId: id,
        },
      });

      // Delete the user from User table
      await this.prisma.user.delete({
        where: { id },
      });

      this.logger.log(
        `Admin user ${user.username} completely removed from system`,
      );

      return {
        success: true,
        message: 'Admin user removed successfully',
      };
    } catch (error) {
      this.logger.error('Error removing admin user:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to remove admin privileges');
    }
  }
}
