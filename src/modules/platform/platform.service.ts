import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { OrganizationRegistrationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import {
  CreateTenantDto,
  UpdateTenantDto,
  UpdateTenantStatusDto,
} from './dto/tenant.dto';
import {
  RejectOrganizationRegistrationDto,
  SubmitOrganizationRegistrationDto,
} from './dto/registration.dto';

@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaService) {}

  private assertNotPlatformTenant(tenant: { isPlatform: boolean }) {
    if (tenant.isPlatform) {
      throw new BadRequestException(
        'The platform system organization cannot be modified this way',
      );
    }
  }

  private async findTenantByName(name: string) {
    return this.prisma.tenant.findFirst({
      where: { name: { equals: name.trim(), mode: 'insensitive' } },
    });
  }

  private mapRegistration(r: {
    id: number;
    organizationName: string;
    adminFirstName: string;
    adminLastName: string;
    adminEmail: string;
    adminUsername: string;
    phone: string | null;
    message: string | null;
    status: OrganizationRegistrationStatus;
    rejectionReason: string | null;
    reviewedBy: number | null;
    reviewedAt: Date | null;
    tenantId: number | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: r.id,
      organizationName: r.organizationName,
      adminFirstName: r.adminFirstName,
      adminLastName: r.adminLastName,
      adminEmail: r.adminEmail,
      adminUsername: r.adminUsername,
      phone: r.phone,
      message: r.message,
      status: r.status,
      rejectionReason: r.rejectionReason,
      reviewedBy: r.reviewedBy,
      reviewedAt: r.reviewedAt,
      tenantId: r.tenantId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  private mapTenant(t: {
    id: number;
    name: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt?: Date;
    _count?: { users: number; employees: number; assets: number };
  }) {
    return {
      id: t.id,
      name: t.name,
      isActive: t.isActive,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      stats: t._count
        ? {
            users: t._count.users,
            employees: t._count.employees,
            assets: t._count.assets,
          }
        : undefined,
    };
  }

  async listTenants() {
    const tenants = await this.prisma.tenant.findMany({
      where: { isPlatform: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
            employees: true,
            assets: true,
          },
        },
      },
    });

    return {
      success: true,
      data: tenants.map((t) => this.mapTenant(t)),
    };
  }

  async getTenant(id: number) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id, isPlatform: false },
      select: {
        id: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { users: true, employees: true, assets: true },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Organization not found');
    }

    return {
      success: true,
      data: this.mapTenant(tenant),
    };
  }

  async createTenant(dto: CreateTenantDto, actorUserId: number) {
    const name = dto.name.trim();
    const existing = await this.findTenantByName(name);
    if (existing) {
      throw new ConflictException(
        'An organization with this name already exists',
      );
    }

    if (dto.admin) {
      const usernameTaken = await this.prisma.user.findUnique({
        where: { username: dto.admin.username },
      });
      if (usernameTaken) {
        throw new ConflictException('Admin username is already taken');
      }
      const emailTaken = await this.prisma.employee.findUnique({
        where: { email: dto.admin.email },
      });
      if (emailTaken) {
        throw new ConflictException('Admin email is already registered');
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name,
          isActive: dto.isActive ?? true,
          isPlatform: false,
        },
      });

      let admin: { id: number; username: string; email: string } | null = null;

      if (dto.admin) {
        admin = await this.provisionOrgAdmin(tx, {
          tenantId: tenant.id,
          actorUserId,
          username: dto.admin.username,
          email: dto.admin.email,
          firstName: dto.admin.firstName,
          lastName: dto.admin.lastName,
          passwordHash: await bcrypt.hash(dto.admin.password, 10),
        });
      }

      return { tenant, admin };
    });

    return {
      success: true,
      message: result.tenant.isActive
        ? 'Organization created and allowed to use the platform'
        : 'Organization created but access is currently revoked',
      data: {
        id: result.tenant.id,
        name: result.tenant.name,
        isActive: result.tenant.isActive,
        createdAt: result.tenant.createdAt,
        admin: result.admin,
      },
    };
  }

  private async provisionOrgAdmin(
    tx: Prisma.TransactionClient,
    opts: {
      tenantId: number;
      actorUserId: number;
      username: string;
      email: string;
      firstName: string;
      lastName: string;
      passwordHash: string;
    },
  ) {
    const adminRole = await tx.role.findUnique({
      where: { roleName: 'ADMIN' },
    });
    if (!adminRole) {
      throw new BadRequestException(
        'ADMIN role is missing; seed roles before provisioning organizations',
      );
    }

    const employee = await tx.employee.create({
      data: {
        tenantId: opts.tenantId,
        employeeId: 'ADM00001',
        firstName: opts.firstName,
        lastName: opts.lastName,
        email: opts.email,
        status: 'ACTIVE',
        createdBy: opts.actorUserId,
        updatedBy: opts.actorUserId,
      },
    });

    const user = await tx.user.create({
      data: {
        tenantId: opts.tenantId,
        employeeId: employee.id,
        username: opts.username,
        passwordHash: opts.passwordHash,
        roles: ['ADMIN'],
        isActive: true,
        createdBy: opts.actorUserId,
        updatedBy: opts.actorUserId,
      },
    });

    await tx.userRole.create({
      data: {
        userId: user.id,
        roleId: adminRole.id,
        assignedBy: opts.actorUserId,
        isActive: true,
      },
    });

    return {
      id: user.id,
      username: user.username,
      email: opts.email,
    };
  }

  async updateTenant(id: number, dto: UpdateTenantDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('Organization not found');
    }
    this.assertNotPlatformTenant(tenant);

    if (dto.name !== undefined) {
      const other = await this.findTenantByName(dto.name);
      if (other && other.id !== id) {
        throw new ConflictException(
          'An organization with this name already exists',
        );
      }
    }

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    return {
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        isActive: updated.isActive,
        updatedAt: updated.updatedAt,
      },
    };
  }

  async updateTenantStatus(id: number, dto: UpdateTenantStatusDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('Organization not found');
    }
    this.assertNotPlatformTenant(tenant);

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { isActive: dto.isActive },
    });

    return {
      success: true,
      message: dto.isActive
        ? 'Organization is now allowed to use the platform'
        : 'Organization access revoked — users cannot log in',
      data: {
        id: updated.id,
        name: updated.name,
        isActive: updated.isActive,
      },
    };
  }

  /**
   * Public self-service signup — creates a PENDING request for SUPER_ADMIN review.
   */
  async submitRegistration(dto: SubmitOrganizationRegistrationDto) {
    const organizationName = dto.organizationName.trim();

    const tenantExists = await this.findTenantByName(organizationName);
    if (tenantExists) {
      throw new ConflictException(
        'An organization with this name already exists',
      );
    }

    const pendingSameName =
      await this.prisma.organizationRegistration.findFirst({
        where: {
          organizationName: { equals: organizationName, mode: 'insensitive' },
          status: OrganizationRegistrationStatus.PENDING,
        },
      });
    if (pendingSameName) {
      throw new ConflictException(
        'A registration request for this organization is already pending review',
      );
    }

    const usernameTaken = await this.prisma.user.findUnique({
      where: { username: dto.adminUsername },
    });
    if (usernameTaken) {
      throw new ConflictException('Admin username is already taken');
    }

    const emailTaken = await this.prisma.employee.findUnique({
      where: { email: dto.adminEmail },
    });
    if (emailTaken) {
      throw new ConflictException('Admin email is already registered');
    }

    const pendingEmail = await this.prisma.organizationRegistration.findFirst({
      where: {
        adminEmail: dto.adminEmail,
        status: OrganizationRegistrationStatus.PENDING,
      },
    });
    if (pendingEmail) {
      throw new ConflictException(
        'A pending registration already uses this admin email',
      );
    }

    const adminPasswordHash = await bcrypt.hash(dto.adminPassword, 10);

    const registration = await this.prisma.organizationRegistration.create({
      data: {
        organizationName,
        adminFirstName: dto.adminFirstName.trim(),
        adminLastName: dto.adminLastName.trim(),
        adminEmail: dto.adminEmail.trim().toLowerCase(),
        adminUsername: dto.adminUsername.trim(),
        adminPasswordHash,
        phone: dto.phone?.trim() || null,
        message: dto.message?.trim() || null,
        status: OrganizationRegistrationStatus.PENDING,
      },
    });

    return {
      success: true,
      message:
        'Registration submitted. A platform administrator will review your request. You will be able to sign in after approval.',
      data: {
        id: registration.id,
        organizationName: registration.organizationName,
        status: registration.status,
        createdAt: registration.createdAt,
      },
    };
  }

  async listRegistrations(status?: OrganizationRegistrationStatus) {
    const registrations = await this.prisma.organizationRegistration.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: registrations.map((r) => this.mapRegistration(r)),
    };
  }

  async approveRegistration(id: number, actorUserId: number) {
    const registration = await this.prisma.organizationRegistration.findUnique({
      where: { id },
    });
    if (!registration) {
      throw new NotFoundException('Registration request not found');
    }
    if (registration.status !== OrganizationRegistrationStatus.PENDING) {
      throw new BadRequestException(
        `Registration is already ${registration.status.toLowerCase()}`,
      );
    }

    const existingName = await this.findTenantByName(
      registration.organizationName,
    );
    if (existingName) {
      throw new ConflictException(
        'Organization name was taken since this request was submitted',
      );
    }

    const usernameTaken = await this.prisma.user.findUnique({
      where: { username: registration.adminUsername },
    });
    if (usernameTaken) {
      throw new ConflictException('Admin username is no longer available');
    }

    const emailTaken = await this.prisma.employee.findUnique({
      where: { email: registration.adminEmail },
    });
    if (emailTaken) {
      throw new ConflictException('Admin email is no longer available');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: registration.organizationName,
          isActive: true,
          isPlatform: false,
        },
      });

      const admin = await this.provisionOrgAdmin(tx, {
        tenantId: tenant.id,
        actorUserId,
        username: registration.adminUsername,
        email: registration.adminEmail,
        firstName: registration.adminFirstName,
        lastName: registration.adminLastName,
        passwordHash: registration.adminPasswordHash,
      });

      const updated = await tx.organizationRegistration.update({
        where: { id },
        data: {
          status: OrganizationRegistrationStatus.APPROVED,
          reviewedBy: actorUserId,
          reviewedAt: new Date(),
          tenantId: tenant.id,
        },
      });

      return { tenant, admin, registration: updated };
    });

    return {
      success: true,
      message: 'Organization approved and granted platform access',
      data: {
        registrationId: result.registration.id,
        tenant: {
          id: result.tenant.id,
          name: result.tenant.name,
          isActive: result.tenant.isActive,
        },
        admin: result.admin,
      },
    };
  }

  async rejectRegistration(
    id: number,
    actorUserId: number,
    dto: RejectOrganizationRegistrationDto,
  ) {
    const registration = await this.prisma.organizationRegistration.findUnique({
      where: { id },
    });
    if (!registration) {
      throw new NotFoundException('Registration request not found');
    }
    if (registration.status !== OrganizationRegistrationStatus.PENDING) {
      throw new BadRequestException(
        `Registration is already ${registration.status.toLowerCase()}`,
      );
    }

    const updated = await this.prisma.organizationRegistration.update({
      where: { id },
      data: {
        status: OrganizationRegistrationStatus.REJECTED,
        rejectionReason: dto.reason?.trim() || null,
        reviewedBy: actorUserId,
        reviewedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Registration request rejected',
      data: this.mapRegistration(updated),
    };
  }
}
