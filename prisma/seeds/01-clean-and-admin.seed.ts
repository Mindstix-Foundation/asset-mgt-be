import { PrismaClient, EmployeeStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * MAIN SEED FILE - Cleans Database & Creates Admin User + sample second tenant
 *
 * 1. Cleans all existing business data (preserves tenants table structure)
 * 2. Ensures platform + default + sample tenants exist
 * 3. Creates platform SUPER_ADMIN and org admins
 */

async function cleanDatabase() {
  console.log('🧹 Cleaning database...\n');

  try {
    console.log('  🗑️  Truncating business tables with CASCADE...');

    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE 
        notifications,
        refresh_sessions,
        blacklisted_tokens,
        password_resets,
        asset_events,
        maintenance_schedules,
        asset_issues,
        assets,
        models,
        brands,
        asset_types,
        asset_categories,
        user_roles,
        vendors,
        roles,
        users,
        employees,
        audit_logs,
        organization_registrations,
        tenants
      RESTART IDENTITY CASCADE;
    `);

    console.log('\n✅ Database cleaned successfully!\n');
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
    throw error;
  }
}

async function ensureTenants() {
  const platformTenant = await prisma.tenant.create({
    data: {
      name: 'Platform',
      isPlatform: true,
      isActive: true,
    },
  });

  const defaultTenant = await prisma.tenant.create({
    data: {
      name: 'Mindstix',
      isActive: true,
      isPlatform: false,
    },
  });

  const sampleTenant = await prisma.tenant.create({
    data: {
      name: 'Acme Corp',
      isActive: true,
      isPlatform: false,
    },
  });

  console.log(
    `✅ Tenants created: ${platformTenant.name}, ${defaultTenant.name}, ${sampleTenant.name}`,
  );
  return { platformTenant, defaultTenant, sampleTenant };
}

async function createAdminForTenant(options: {
  tenantId: number;
  employeeId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  roleName: 'ADMIN' | 'SUPER_ADMIN';
  ensureRole: boolean;
}) {
  const passwordHash = await bcrypt.hash(options.password, 10);

  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`ALTER TABLE employees ALTER COLUMN created_by DROP NOT NULL`);
    await tx.$executeRawUnsafe(`ALTER TABLE employees ALTER COLUMN updated_by DROP NOT NULL`);
    await tx.$executeRawUnsafe(`ALTER TABLE users ALTER COLUMN created_by DROP NOT NULL`);
    await tx.$executeRawUnsafe(`ALTER TABLE users ALTER COLUMN updated_by DROP NOT NULL`);

    await tx.$executeRawUnsafe(`
      INSERT INTO employees (tenant_id, employee_id, first_name, last_name, email, phone, date_of_birth, address, status)
      VALUES (${options.tenantId}, '${options.employeeId}', '${options.firstName}', '${options.lastName}', '${options.email}', '+91 9999999999', '1990-01-01', 'System', 'ACTIVE')
    `);

    const employee = await tx.employee.findFirst({
      where: {
        tenantId: options.tenantId,
        employeeId: options.employeeId,
      },
    });
    if (!employee) throw new Error(`Failed to create employee ${options.employeeId}`);

    await tx.$executeRawUnsafe(`
      INSERT INTO users (tenant_id, employee_id, username, password_hash, roles, is_active)
      VALUES (${options.tenantId}, ${employee.id}, '${options.username}', '${passwordHash}', ARRAY['${options.roleName}']::text[], true)
    `);

    const user = await tx.user.findUnique({
      where: { username: options.username },
    });
    if (!user) throw new Error(`Failed to create user ${options.username}`);

    let role = await tx.role.findUnique({
      where: { roleName: options.roleName },
    });

    if (!role && options.ensureRole) {
      await tx.$executeRawUnsafe(`
        INSERT INTO roles (role_name, is_active)
        VALUES ('${options.roleName}', true)
      `);
      role = await tx.role.findUnique({
        where: { roleName: options.roleName },
      });
    }
    if (!role) throw new Error(`${options.roleName} role not found`);

    // Ensure ADMIN role exists for org provisioning even when creating SUPER_ADMIN first
    if (options.roleName === 'SUPER_ADMIN') {
      const adminRole = await tx.role.findUnique({ where: { roleName: 'ADMIN' } });
      if (!adminRole) {
        await tx.$executeRawUnsafe(`
          INSERT INTO roles (role_name, is_active) VALUES ('ADMIN', true)
        `);
      }
    }

    await tx.$executeRawUnsafe(`
      UPDATE employees SET created_by = ${user.id}, updated_by = ${user.id} WHERE id = ${employee.id}
    `);
    await tx.$executeRawUnsafe(`
      UPDATE users SET created_by = ${user.id}, updated_by = ${user.id} WHERE id = ${user.id}
    `);

    await tx.userRole.create({
      data: {
        userId: user.id,
        roleId: role.id,
        assignedBy: user.id,
        isActive: true,
      },
    });

    return user.id;
  });
}

async function main() {
  try {
    console.log('🚀 Starting database seeding...\n');

    await cleanDatabase();
    const { platformTenant, defaultTenant, sampleTenant } = await ensureTenants();

    await createAdminForTenant({
      tenantId: platformTenant.id,
      employeeId: 'PLAT0001',
      username: 'superadmin',
      email: 'superadmin@platform.local',
      firstName: 'Platform',
      lastName: 'SuperAdmin',
      password: 'SuperAdmin@123',
      roleName: 'SUPER_ADMIN',
      ensureRole: true,
    });

    await createAdminForTenant({
      tenantId: defaultTenant.id,
      employeeId: '9999',
      username: 'admin',
      email: 'admin@pebble-asset-tracker.com',
      firstName: 'System',
      lastName: 'Administrator',
      password: 'Admin@123',
      roleName: 'ADMIN',
      ensureRole: true,
    });

    await createAdminForTenant({
      tenantId: sampleTenant.id,
      employeeId: 'A0001',
      username: 'acme-admin',
      email: 'admin@acme.example.com',
      firstName: 'Acme',
      lastName: 'Admin',
      password: 'Admin@123',
      roleName: 'ADMIN',
      ensureRole: false,
    });

    // Minimal catalog row for sample tenant so isolation tests have tenant-owned data
    const acmeAdmin = await prisma.user.findUnique({ where: { username: 'acme-admin' } });
    if (acmeAdmin) {
      await prisma.assetCategory.create({
        data: {
          tenantId: sampleTenant.id,
          name: 'Acme Sample Category',
          description: 'Seed category for second tenant isolation tests',
          createdBy: acmeAdmin.id,
          updatedBy: acmeAdmin.id,
        },
      });
      await prisma.employee.create({
        data: {
          tenantId: sampleTenant.id,
          employeeId: 'A0002',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane.doe@acme.example.com',
          status: EmployeeStatus.ACTIVE,
          createdBy: acmeAdmin.id,
          updatedBy: acmeAdmin.id,
        },
      });
    }

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   ✓ Platform:     Platform org (superadmin / SuperAdmin@123)`);
    console.log(`   ✓ Default tenant: Mindstix (admin / Admin@123)`);
    console.log(`   ✓ Sample tenant:  Acme Corp (acme-admin / Admin@123)`);
    console.log('   ✓ SUPER_ADMIN manages organizations only; org ADMIN manages tenant data');
    console.log('\n📝 Next: run remaining seed files for the default tenant catalog/assets.');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error in main:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
