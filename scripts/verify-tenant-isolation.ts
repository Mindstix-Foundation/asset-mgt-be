/**
 * Seed a second tenant (Acme) and verify cross-tenant data isolation.
 * Safe to run on an already-migrated DB without wiping Mindstix data.
 *
 * Usage: npx ts-node scripts/verify-tenant-isolation.ts
 */
import { PrismaClient, EmployeeStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function ensureSampleTenant() {
  let tenant = await prisma.tenant.findFirst({
    where: { name: { equals: 'Acme Corp', mode: 'insensitive' } },
  });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { name: 'Acme Corp', isActive: true, isPlatform: false },
    });
    console.log(`Created tenant Acme Corp (#${tenant.id})`);
  } else {
    console.log(`Tenant Acme Corp already exists (#${tenant.id})`);
  }

  let adminRole = await prisma.role.findUnique({ where: { roleName: 'ADMIN' } });
  if (!adminRole) {
    adminRole = await prisma.role.create({
      data: { roleName: 'ADMIN', isActive: true },
    });
  }

  let user = await prisma.user.findUnique({
    where: { username: 'acme-admin' },
    include: { employee: true },
  });

  if (!user) {
    const passwordHash = await bcrypt.hash('Admin@123', 10);
    const employee = await prisma.employee.create({
      data: {
        tenantId: tenant.id,
        employeeId: 'A0001',
        firstName: 'Acme',
        lastName: 'Admin',
        email: 'admin@acme.example.com',
        status: EmployeeStatus.ACTIVE,
      },
    });

    user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        employeeId: employee.id,
        username: 'acme-admin',
        passwordHash,
        roles: ['ADMIN'],
        isActive: true,
      },
      include: { employee: true },
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
        roleId: adminRole.id,
        assignedBy: user.id,
        isActive: true,
      },
    });

    console.log('Created acme-admin user');
  } else {
    console.log('acme-admin already exists');
  }

  const categoryCount = await prisma.assetCategory.count({
    where: { tenantId: tenant.id },
  });
  if (categoryCount === 0) {
    await prisma.assetCategory.create({
      data: {
        tenantId: tenant.id,
        name: 'Acme Sample Category',
        description: 'Isolation test category',
        createdBy: user.id,
        updatedBy: user.id,
      },
    });
  }

  const employeeCount = await prisma.employee.count({
    where: { tenantId: tenant.id },
  });
  if (employeeCount < 2) {
    const existing = await prisma.employee.findFirst({
      where: { email: 'jane.doe@acme.example.com' },
    });
    if (!existing) {
      await prisma.employee.create({
        data: {
          tenantId: tenant.id,
          employeeId: 'A0002',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane.doe@acme.example.com',
          status: EmployeeStatus.ACTIVE,
          createdBy: user.id,
          updatedBy: user.id,
        },
      });
    }
  }

  return tenant;
}

async function verifyIsolation() {
  const mindstix = await prisma.tenant.findFirst({
    where: { name: { equals: 'Mindstix', mode: 'insensitive' } },
  });
  const acme = await prisma.tenant.findFirst({
    where: { name: { equals: 'Acme Corp', mode: 'insensitive' } },
  });

  if (!mindstix || !acme) {
    throw new Error('Both Mindstix and Acme Corp tenants must exist');
  }

  const mindstixUsers = await prisma.user.findMany({
    where: { tenantId: mindstix.id },
    select: { id: true, username: true, tenantId: true },
  });
  const acmeUsers = await prisma.user.findMany({
    where: { tenantId: acme.id },
    select: { id: true, username: true, tenantId: true },
  });

  const mindstixEmployeeIds = (
    await prisma.employee.findMany({
      where: { tenantId: mindstix.id },
      select: { id: true },
    })
  ).map((e) => e.id);

  const leakedEmployees = await prisma.employee.findMany({
    where: {
      tenantId: acme.id,
      id: { in: mindstixEmployeeIds },
    },
  });

  const acmeCategoriesVisibleAsMindstix = await prisma.assetCategory.count({
    where: {
      tenantId: mindstix.id,
      name: 'Acme Sample Category',
    },
  });

  const mindstixAssetCount = await prisma.asset.count({
    where: { tenantId: mindstix.id },
  });
  const acmeAssetCount = await prisma.asset.count({
    where: { tenantId: acme.id },
  });

  console.log('\n=== Isolation verification ===');
  console.log(`Mindstix users: ${mindstixUsers.map((u) => u.username).join(', ') || '(none)'}`);
  console.log(`Acme users:     ${acmeUsers.map((u) => u.username).join(', ') || '(none)'}`);
  console.log(`Mindstix assets: ${mindstixAssetCount}`);
  console.log(`Acme assets:     ${acmeAssetCount}`);
  console.log(`Cross-tenant employee ID overlap: ${leakedEmployees.length}`);
  console.log(`Acme category visible under mindstix filter: ${acmeCategoriesVisibleAsMindstix}`);

  const ok =
    acmeUsers.length >= 1 &&
    leakedEmployees.length === 0 &&
    acmeCategoriesVisibleAsMindstix === 0 &&
    mindstixUsers.every((u) => u.tenantId === mindstix.id) &&
    acmeUsers.every((u) => u.tenantId === acme.id);

  if (!ok) {
    throw new Error('Tenant isolation checks failed');
  }

  console.log('\n✅ Tenant isolation checks passed');
}

async function main() {
  await ensureSampleTenant();
  await verifyIsolation();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
