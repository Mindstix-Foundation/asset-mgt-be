import { PrismaClient, EmployeeStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function pad(num: number, size: number): string {
  let s = String(num);
  while (s.length < size) s = '0' + s;
  return s;
}

function randomPhone(i: number): string {
  // Generate random 10-digit number starting with 9
  const randomNum = Math.floor(Math.random() * 1000000000) + 9000000000;
  return `+91 ${randomNum}`;
}

async function createAdminUser() {
  console.log('🌱 Starting admin seed...');

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' },
  });

  if (existingAdmin) {
    console.log('⚠️  Admin user already exists. Skipping admin creation.');
    console.log('\n📋 Login Credentials:');
    console.log('   Username: admin');
    console.log('   Password: Admin@123 (if not changed)\n');
    return existingAdmin.id;
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
      employeeId: '0001',
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

  return adminUser.id;
}

async function createSampleEmployees(adminUserId: number) {
  console.log('🌱 Starting employee seed...');

  const firstNames = [
    'Aarav','Vivaan','Aditya','Vihaan','Arjun','Sai','Reyansh','Krishna','Ishaan','Rohan',
    'Anaya','Diya','Ira','Aadhya','Myra','Anika','Sara','Aarohi','Saanvi','Navya'
  ];
  const lastNames = ['Sharma','Verma','Patel','Gupta','Singh','Iyer','Menon','Kulkarni','Reddy','Nair'];

  const employees = [];
  for (let i = 2; i <= 36; i++) { // Start from 2 since 0001 is admin
    const fn = firstNames[(i - 2) % firstNames.length];
    const ln = lastNames[(i - 2) % lastNames.length];
    const id = pad(i, 4); // Format: 0002, 0003, ..., 0036
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@example.com`;

    const dob = new Date(1990, ((i % 12) || 1) - 1, ((i % 28) || 1)); // spread months/days

    employees.push({
      employeeId: id,
      firstName: fn,
      lastName: ln,
      email,
      phone: randomPhone(i), // Random phone number
      dateOfBirth: dob,
      address: `${i} MG Road, Pune, Maharashtra 4110${(i % 10)}`,
      status: EmployeeStatus.ACTIVE,
      createdBy: adminUserId,
      updatedBy: adminUserId,
    });
  }

  await prisma.employee.createMany({ data: employees, skipDuplicates: true });

  console.log(`✅ Seeded ${employees.length} employees`);
}

async function createAssetCategoryAndTypes(adminUserId: number) {
  console.log('🌱 Starting asset category and types seed...');

  // 1. Create Electronics Asset Category
  console.log('📝 Creating Electronics asset category...');
  const assetCategory = await prisma.assetCategory.upsert({
    where: { name: 'Electronics' },
    update: {},
    create: {
      name: 'Electronics',
      description: 'Electronic devices and equipment',
      createdBy: adminUserId,
      updatedBy: adminUserId,
    },
  });
  console.log('✅ Electronics asset category created:', assetCategory);

  // 2. Create Asset Types for Electronics category
  console.log('📝 Creating asset types for Electronics category...');
  const assetTypes = [
    {
      name: 'Laptop',
      description: 'Portable computers',
      categoryId: assetCategory.id,
      createdBy: adminUserId,
      updatedBy: adminUserId,
    },
    {
      name: 'Desktop',
      description: 'Desktop computers',
      categoryId: assetCategory.id,
      createdBy: adminUserId,
      updatedBy: adminUserId,
    },
    {
      name: 'Mobile',
      description: 'Mobile phones and tablets',
      categoryId: assetCategory.id,
      createdBy: adminUserId,
      updatedBy: adminUserId,
    },
    {
      name: 'Monitor',
      description: 'Computer monitors and displays',
      categoryId: assetCategory.id,
      createdBy: adminUserId,
      updatedBy: adminUserId,
    },
    {
      name: 'Tablet',
      description: 'Tablets and portable devices',
      categoryId: assetCategory.id,
      createdBy: adminUserId,
      updatedBy: adminUserId,
    },
    {
      name: 'Accessories',
      description: 'Computer accessories and peripherals',
      categoryId: assetCategory.id,
      createdBy: adminUserId,
      updatedBy: adminUserId,
    },
  ];

  await prisma.assetType.createMany({ data: assetTypes, skipDuplicates: true });
  console.log(`✅ Seeded ${assetTypes.length} asset types for Electronics category`);
}

async function main() {
  try {
    console.log('🚀 Starting unified database seeding...\n');
    
    // First create admin user
    const adminUserId = await createAdminUser();
    
    // Then create sample employees
    await createSampleEmployees(adminUserId);
    
    // Then create asset category and types
    await createAssetCategoryAndTypes(adminUserId);
    
    console.log('\n🎉 All seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   - 1 Admin user created');
    console.log('   - 35 Sample employees created');
    console.log('   - 1 Asset category (Electronics) created');
    console.log('   - 6 Asset types created (Laptop, Desktop, Mobile, Monitor, Tablet, Accessories)');
    console.log('   - Total: 36 users in the system');
    
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
