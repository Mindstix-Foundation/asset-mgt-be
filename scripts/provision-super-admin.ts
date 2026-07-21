/**
 * Idempotent: ensure platform tenant + SUPER_ADMIN user exist.
 * Does not wipe existing data.
 *
 * Usage: npx ts-node scripts/provision-super-admin.ts
 */
import { PrismaClient, EmployeeStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SUPER_USERNAME = 'superadmin';
const SUPER_EMAIL = 'superadmin@platform.local';
const SUPER_PASSWORD = 'SuperAdmin@123';

async function main() {
  let platformTenant = await prisma.tenant.findFirst({
    where: { isPlatform: true },
  });

  if (!platformTenant) {
    platformTenant = await prisma.tenant.findFirst({
      where: { name: { equals: 'Platform', mode: 'insensitive' } },
    });
    if (platformTenant) {
      platformTenant = await prisma.tenant.update({
        where: { id: platformTenant.id },
        data: { isPlatform: true },
      });
    } else {
      platformTenant = await prisma.tenant.create({
        data: {
          name: 'Platform',
          isPlatform: true,
          isActive: true,
        },
      });
    }
  }

  console.log(`Platform tenant: #${platformTenant.id} (${platformTenant.name})`);

  let superRole = await prisma.role.findUnique({
    where: { roleName: 'SUPER_ADMIN' },
  });
  if (!superRole) {
    superRole = await prisma.role.create({
      data: { roleName: 'SUPER_ADMIN', isActive: true },
    });
    console.log('Created SUPER_ADMIN role');
  }

  let adminRole = await prisma.role.findUnique({
    where: { roleName: 'ADMIN' },
  });
  if (!adminRole) {
    adminRole = await prisma.role.create({
      data: { roleName: 'ADMIN', isActive: true },
    });
    console.log('Created ADMIN role');
  }

  let user = await prisma.user.findUnique({
    where: { username: SUPER_USERNAME },
  });

  if (!user) {
    const passwordHash = await bcrypt.hash(SUPER_PASSWORD, 10);
    const employee = await prisma.employee.create({
      data: {
        tenantId: platformTenant.id,
        employeeId: 'PLAT0001',
        firstName: 'Platform',
        lastName: 'SuperAdmin',
        email: SUPER_EMAIL,
        status: EmployeeStatus.ACTIVE,
      },
    });

    user = await prisma.user.create({
      data: {
        tenantId: platformTenant.id,
        employeeId: employee.id,
        username: SUPER_USERNAME,
        passwordHash,
        roles: ['SUPER_ADMIN'],
        isActive: true,
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { createdBy: user.id, updatedBy: user.id },
    });
    await prisma.employee.update({
      where: { id: employee.id },
      data: { createdBy: user.id, updatedBy: user.id },
    });

    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: superRole.id,
        assignedBy: user.id,
        isActive: true,
      },
    });

    console.log('Created superadmin user');
  } else {
    const hasRole = await prisma.userRole.findFirst({
      where: {
        userId: user.id,
        roleId: superRole.id,
        isActive: true,
      },
    });
    if (!hasRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: superRole.id,
          assignedBy: user.id,
          isActive: true,
        },
      });
      console.log('Assigned SUPER_ADMIN role to existing superadmin');
    } else {
      console.log('superadmin already exists');
    }
  }

  console.log('\n📋 Platform super-admin credentials:');
  console.log(`   Username: ${SUPER_USERNAME}`);
  console.log(`   Password: ${SUPER_PASSWORD}`);
  console.log(
    '\n   This account can only manage organizations (allow/revoke), not company data.\n',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
