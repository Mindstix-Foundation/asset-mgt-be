import { PrismaClient, EmployeeStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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
    // Temporarily disable all triggers to handle circular dependencies during cleanup
    console.log('  📝 Disabling foreign key constraints for cleanup...');
    await prisma.$executeRaw`ALTER TABLE employees DISABLE TRIGGER ALL`;
    await prisma.$executeRaw`ALTER TABLE users DISABLE TRIGGER ALL`;
    await prisma.$executeRaw`ALTER TABLE roles DISABLE TRIGGER ALL`;
    await prisma.$executeRaw`ALTER TABLE asset_categories DISABLE TRIGGER ALL`;
    await prisma.$executeRaw`ALTER TABLE asset_types DISABLE TRIGGER ALL`;
    await prisma.$executeRaw`ALTER TABLE brands DISABLE TRIGGER ALL`;
    await prisma.$executeRaw`ALTER TABLE models DISABLE TRIGGER ALL`;
    await prisma.$executeRaw`ALTER TABLE vendors DISABLE TRIGGER ALL`;
    
    // Delete all data - order doesn't matter since constraints are disabled
    console.log('  🗑️  Deleting notifications...');
    await prisma.notification.deleteMany({});
    
    console.log('  🗑️  Deleting refresh sessions...');
    await prisma.refreshSession.deleteMany({});
    
    console.log('  🗑️  Deleting blacklisted tokens...');
    await prisma.blacklistedToken.deleteMany({});
    
    console.log('  🗑️  Deleting password resets...');
    await prisma.passwordReset.deleteMany({});
    
    console.log('  🗑️  Deleting asset events...');
    await prisma.assetEvent.deleteMany({});
    
    console.log('  🗑️  Deleting maintenance schedules...');
    await prisma.maintenanceSchedule.deleteMany({});
    
    console.log('  🗑️  Deleting asset issues...');
    await prisma.assetIssue.deleteMany({});
    
    console.log('  🗑️  Deleting assets...');
    await prisma.asset.deleteMany({});
    
    console.log('  🗑️  Deleting models...');
    await prisma.model.deleteMany({});
    
    console.log('  🗑️  Deleting brands...');
    await prisma.brand.deleteMany({});
    
    console.log('  🗑️  Deleting asset types...');
    await prisma.assetType.deleteMany({});
    
    console.log('  🗑️  Deleting asset categories...');
    await prisma.assetCategory.deleteMany({});
    
    console.log('  🗑️  Deleting user roles...');
    await prisma.userRole.deleteMany({});
    
    console.log('  🗑️  Deleting vendors...');
    await prisma.vendor.deleteMany({});
    
    console.log('  🗑️  Deleting roles...');
    await prisma.role.deleteMany({});
    
    console.log('  🗑️  Deleting users...');
    await prisma.user.deleteMany({});
    
    console.log('  🗑️  Deleting employees...');
    await prisma.employee.deleteMany({});
    
    // Re-enable all triggers
    console.log('  📝 Re-enabling foreign key constraints...');
    await prisma.$executeRaw`ALTER TABLE employees ENABLE TRIGGER ALL`;
    await prisma.$executeRaw`ALTER TABLE users ENABLE TRIGGER ALL`;
    await prisma.$executeRaw`ALTER TABLE roles ENABLE TRIGGER ALL`;
    await prisma.$executeRaw`ALTER TABLE asset_categories ENABLE TRIGGER ALL`;
    await prisma.$executeRaw`ALTER TABLE asset_types ENABLE TRIGGER ALL`;
    await prisma.$executeRaw`ALTER TABLE brands ENABLE TRIGGER ALL`;
    await prisma.$executeRaw`ALTER TABLE models ENABLE TRIGGER ALL`;
    await prisma.$executeRaw`ALTER TABLE vendors ENABLE TRIGGER ALL`;
    
    console.log('\n✅ Database cleaned successfully!\n');
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
    throw error;
  }
}

async function createAdminUser() {
  console.log('🌱 Starting admin seed...');

  // Due to circular dependencies (employee needs user, user needs employee, both need created_by),
  // we use raw SQL to insert the first records with temporary IDs, then update them properly
  
  // 1. Hash the default password
  const defaultPassword = 'Admin@123';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // 2. Temporarily disable foreign key constraints to allow circular dependency resolution
  console.log('📝 Temporarily disabling foreign key constraints...');
  await prisma.$executeRaw`ALTER TABLE employees DISABLE TRIGGER ALL`;
  await prisma.$executeRaw`ALTER TABLE users DISABLE TRIGGER ALL`;
  await prisma.$executeRaw`ALTER TABLE roles DISABLE TRIGGER ALL`;

  // 3. Insert admin employee with dummy created_by (will update later)
  console.log('📝 Creating admin employee with raw SQL...');
  await prisma.$executeRaw`
    INSERT INTO employees (employee_id, first_name, last_name, email, phone, date_of_birth, address, status, created_by, updated_by)
    VALUES ('9999', 'System', 'Administrator', 'admin@trackstix.com', '+91 9999999999', '1990-01-01', 'System', 'ACTIVE', 1, 1)
  `;
  
  const adminEmployee = await prisma.employee.findUnique({
    where: { employeeId: '9999' },
  });
  if (!adminEmployee) throw new Error('Failed to create admin employee');
  console.log('✅ Admin employee created');

  // 4. Insert admin user with dummy created_by (will update later)
  console.log('📝 Creating admin user with raw SQL...');
  await prisma.$executeRaw`
    INSERT INTO users (employee_id, username, password_hash, roles, is_active, created_by, updated_by)
    VALUES (${adminEmployee.id}, 'admin', ${passwordHash}, ARRAY['ADMIN']::text[], true, 1, 1)
  `;
  
  const adminUser = await prisma.user.findUnique({
    where: { username: 'admin' },
  });
  if (!adminUser) throw new Error('Failed to create admin user');
  console.log('✅ Admin user created');

  // 5. Re-enable foreign key constraints
  console.log('📝 Re-enabling foreign key constraints...');
  await prisma.$executeRaw`ALTER TABLE employees ENABLE TRIGGER ALL`;
  await prisma.$executeRaw`ALTER TABLE users ENABLE TRIGGER ALL`;
  await prisma.$executeRaw`ALTER TABLE roles ENABLE TRIGGER ALL`;

  // 6. Now create ADMIN role (must be done after re-enabling constraints)
  console.log('📝 Creating ADMIN role with raw SQL...');
  await prisma.$executeRaw`
    INSERT INTO roles (role_name, is_active, created_by, updated_by)
    VALUES ('ADMIN', true, ${adminUser.id}, ${adminUser.id})
  `;
  
  const adminRole = await prisma.role.findUnique({
    where: { roleName: 'ADMIN' },
  });
  if (!adminRole) throw new Error('Failed to create admin role');
  console.log('✅ ADMIN role created');

  // 7. Update employee to reference the admin user properly
  await prisma.employee.update({
    where: { id: adminEmployee.id },
    data: {
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });

  // 8. Update user to reference itself properly
  await prisma.user.update({
    where: { id: adminUser.id },
    data: {
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });
  console.log('✅ Updated audit fields to reference admin user');

  // 9. Assign ADMIN role to admin user
  console.log('📝 Assigning ADMIN role to admin user...');
  const userRole = await prisma.userRole.create({
    data: {
      userId: adminUser.id,
      roleId: adminRole.id,
      assignedBy: adminUser.id,
      isActive: true,
    },
  });
  console.log('✅ ADMIN role assigned to user');

  console.log('\n🎉 Admin seed completed successfully!');
  console.log('\n📋 Login Credentials:');
  console.log('   Username: admin');
  console.log('   Password: Admin@123');
  console.log('\n⚠️  Please change the password after first login!\n');

  return adminUser.id;
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
    console.log('   ✓ 1 Admin user created (username: admin)');
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
