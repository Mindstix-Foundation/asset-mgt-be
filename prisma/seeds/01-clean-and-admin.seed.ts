import { PrismaClient, EmployeeStatus } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * MAIN SEED FILE - Cleans Database & Creates Admin User
 * 
 * This is the primary seed file that:
 * 1. Cleans all existing data from the database
 * 2. Creates the system administrator
 * 
 * Other data is seeded using dedicated seed files:
 * - Asset categories, types, brands, models: seed-asset-categories-updated.ts
 * - Assets: seed-assets-final.ts
 * - Employees: (separate employee seed file)
 * - Asset assignments: seed-asset-assignments.ts
 */

async function cleanDatabase() {
  console.log('🧹 Cleaning database...\n');

  try {
    // Use TRUNCATE CASCADE to delete all data efficiently, handling circular dependencies
    console.log('  🗑️  Truncating all tables with CASCADE...');
    
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
        employees
      RESTART IDENTITY CASCADE;
    `);
    
    console.log('\n✅ Database cleaned successfully!\n');
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
    throw error;
  }
}

async function createAdminUser() {
  console.log('🌱 Starting admin seed...');

  // Due to circular dependencies (employee needs user, user needs employee, both need created_by),
  // we need to create them with SET CONSTRAINTS DEFERRED or use a workaround

  console.log('📝 Creating admin employee and user with deferred constraints...');
  
  const result = await prisma.$transaction(async (tx) => {
    // Drop NOT NULL constraints temporarily (they may exist in DB but not in Prisma schema)
    await tx.$executeRawUnsafe(`ALTER TABLE employees ALTER COLUMN created_by DROP NOT NULL`);
    await tx.$executeRawUnsafe(`ALTER TABLE employees ALTER COLUMN updated_by DROP NOT NULL`);
    await tx.$executeRawUnsafe(`ALTER TABLE users ALTER COLUMN created_by DROP NOT NULL`);
    await tx.$executeRawUnsafe(`ALTER TABLE users ALTER COLUMN updated_by DROP NOT NULL`);
    
    // Insert admin employee with NULL created_by (will update later)
    await tx.$executeRawUnsafe(`
      INSERT INTO employees (employee_id, first_name, last_name, email, phone, date_of_birth, address, status)
      VALUES ('9999', 'System', 'Administrator', 'uduvalorant@gmail.com', '+91 9999999999', '1990-01-01', 'System', 'ACTIVE')
    `);
    
    const adminEmployee = await tx.employee.findUnique({
      where: { employeeId: '9999' },
    });
    if (!adminEmployee) throw new Error('Failed to create admin employee');
    console.log('✅ Admin employee created');

    // Insert admin user with NULL created_by (will update later) — Google SSO, no password
    await tx.$executeRawUnsafe(`
      INSERT INTO users (employee_id, roles, is_active)
      VALUES (${adminEmployee.id}, ARRAY['ADMIN']::text[], true)
    `);
    
    const adminUser = await tx.user.findFirst({
      where: { employee: { employeeId: '9999' } },
    });
    if (!adminUser) throw new Error('Failed to create admin user');
    console.log('✅ Admin user created');

    // Create ADMIN role (audit fields removed from roles table)
    await tx.$executeRawUnsafe(`
      INSERT INTO roles (role_name, is_active)
      VALUES ('ADMIN', true)
    `);
    
    const adminRole = await tx.role.findUnique({
      where: { roleName: 'ADMIN' },
    });
    if (!adminRole) throw new Error('Failed to create admin role');
    console.log('✅ ADMIN role created');

    // Now update employee and user to reference proper IDs
    await tx.$executeRawUnsafe(`
      UPDATE employees SET created_by = ${adminUser.id}, updated_by = ${adminUser.id} WHERE id = ${adminEmployee.id}
    `);
    await tx.$executeRawUnsafe(`
      UPDATE users SET created_by = ${adminUser.id}, updated_by = ${adminUser.id} WHERE id = ${adminUser.id}
    `);
    console.log('✅ Updated audit fields to reference admin user');

    // Assign ADMIN role to admin user
    await tx.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: adminRole.id,
        assignedBy: adminUser.id,
        isActive: true,
      },
    });
    console.log('✅ ADMIN role assigned to user');

    return adminUser.id;
  });

  console.log('\n🎉 Admin seed completed successfully!');
  console.log('\n📋 Google SSO Login:');
  console.log('   Sign in with Google using the employee email: uduvalorant@gmail.com');
  console.log('   (This must match the Google account you use for SSO.)\n');

  return result;
}

async function main() {
  try {
    console.log('🚀 Starting database seeding...\n');
    
    // Step 1: Clean all existing data
    await cleanDatabase();
    
    // Step 2: Create admin user
    await createAdminUser();
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   ✓ Database cleaned (all old data removed)');
    console.log('   ✓ 1 Admin user created (employeeId: 9999)');
    console.log('   ✓ 1 Admin employee created (ID: 9999)');
    console.log('   ✓ 1 ADMIN role created and assigned');
    
    console.log('\n📝 Next Steps:');
    console.log('   Option 1 (Recommended): Run all seeds at once');
    console.log('      npx ts-node prisma/seeds/run-all-seeds.ts');
    console.log('');
    console.log('   Option 2: Run seeds individually in order');
    console.log('      npx ts-node prisma/seeds/02-asset-structure.seed.ts');
    console.log('      npx ts-node prisma/seeds/03-assets.seed.ts');
    console.log('      npx ts-node prisma/seeds/04-employees.seed.ts');
    console.log('      npx ts-node prisma/seeds/05-asset-assignments.seed.ts');
    
    console.log('\n⚠️  WARNING: All previous data has been deleted!');
    console.log('   Make sure to run all remaining seed files to populate the database.\n');
    
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
