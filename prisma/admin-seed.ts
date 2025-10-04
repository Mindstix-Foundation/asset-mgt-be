import { PrismaClient, EmployeeStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting admin seed...');

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' },
  });

  if (existingAdmin) {
    console.log('⚠️  Admin user already exists. Skipping seed.');
    console.log('\n📋 Login Credentials:');
    console.log('   Username: admin');
    console.log('   Password: Admin@123 (if not changed)\n');
    return;
  }

  // 1. Create ADMIN role
  console.log('📝 Creating ADMIN role...');
  const adminRole = await prisma.role.upsert({
    where: { roleName: 'ADMIN' },
    update: {},
    create: {
      roleName: 'ADMIN',
      isActive: true,
    },
  });
  console.log('✅ ADMIN role created:', adminRole);

  // 2. Create admin employee first (without createdBy/updatedBy)
  console.log('📝 Creating admin employee...');
  const adminEmployee = await prisma.employee.create({
    data: {
      employeeId: 'EMP-001',
      firstName: 'System',
      lastName: 'Administrator',
      email: 'admin@trackstix.com',
      phone: '+91 9999999999',
      dateOfBirth: new Date('1990-01-01'),
      address: 'System',
      status: EmployeeStatus.ACTIVE,
      // createdBy and updatedBy are now nullable, so we can leave them empty initially
    },
  });
  console.log('✅ Admin employee created:', adminEmployee);

  // 3. Hash the default password
  const defaultPassword = 'Admin@123';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // 4. Create admin user
  console.log('📝 Creating admin user...');
  const adminUser = await prisma.user.create({
    data: {
      employeeId: adminEmployee.id,
      username: 'admin',
      passwordHash,
      roles: ['ADMIN'],
      isActive: true,
      // createdBy and updatedBy are now nullable, so we can leave them empty initially
    },
  });
  console.log('✅ Admin user created:', adminUser);

  // 5. Update employee to reference the admin user
  await prisma.employee.update({
    where: { id: adminEmployee.id },
    data: {
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });

  // 6. Update user to reference itself
  await prisma.user.update({
    where: { id: adminUser.id },
    data: {
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });
  console.log('✅ Updated audit fields to reference admin user');

  // 7. Assign ADMIN role to admin user
  console.log('📝 Assigning ADMIN role to admin user...');
  const userRole = await prisma.userRole.create({
    data: {
      userId: adminUser.id,
      roleId: adminRole.id,
      assignedBy: adminUser.id,
      isActive: true,
    },
  });
  console.log('✅ ADMIN role assigned to user:', userRole);

  console.log('\n🎉 Admin seed completed successfully!');
  console.log('\n📋 Login Credentials:');
  console.log('   Username: admin');
  console.log('   Password: Admin@123');
  console.log('\n⚠️  Please change the password after first login!\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error seeding admin:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
