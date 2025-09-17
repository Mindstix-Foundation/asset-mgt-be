const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    console.log('🔗 Connecting to database...');
    
    // Check if admin user already exists
    const existingUser = await prisma.user.findFirst({
      where: { username: 'admin' }
    });

    if (existingUser) {
      console.log('⚠️  Admin user already exists!');
      console.log(`   Username: ${existingUser.username}`);
      console.log(`   User ID: ${existingUser.id}`);
      return;
    }

    // Check if admin employee already exists
    const existingEmployee = await prisma.employee.findFirst({
      where: { email: 'admin@mindstix.com' }
    });

    if (existingEmployee) {
      console.log('⚠️  Admin employee already exists!');
      console.log(`   Email: ${existingEmployee.email}`);
      console.log(`   Employee ID: ${existingEmployee.employeeId}`);
      return;
    }

    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash('admin123', 12);

    console.log('👤 Creating admin employee and user...');
    console.log('🔄 Temporarily dropping foreign key constraints to handle circular dependency...');

    // Use raw SQL to temporarily drop constraints, create records, then restore constraints
    const result = await prisma.$transaction(async (tx) => {
      console.log('   📝 Dropping foreign key constraints...');
      
      // Drop the foreign key constraints temporarily
      await tx.$executeRaw`ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_created_by_fkey`;
      await tx.$executeRaw`ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_updated_by_fkey`;
      await tx.$executeRaw`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_created_by_fkey`;
      await tx.$executeRaw`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_updated_by_fkey`;
      
      console.log('   👤 Creating employee record...');
      
      // Create employee record without foreign key constraints
      await tx.$executeRaw`
        INSERT INTO employees (employee_id, first_name, last_name, email, phone, status, created_by, updated_by, created_at, updated_at)
        VALUES ('EMP001', 'System', 'Administrator', 'admin@mindstix.com', '+1234567890', 'ACTIVE', 1, 1, NOW(), NOW())
      `;

      // Get the employee record
      const employee = await tx.employee.findFirst({
        where: { employeeId: 'EMP001' }
      });

      if (!employee) {
        throw new Error('Failed to create employee record');
      }

      console.log('   🔐 Creating user record...');
      
      // Create user record
      await tx.$executeRaw`
        INSERT INTO users (employee_id, username, password_hash, is_active, created_by, updated_by, created_at, updated_at)
        VALUES (${employee.id}, 'admin', ${hashedPassword}, true, 1, 1, NOW(), NOW())
      `;

      // Get the user record
      const user = await tx.user.findFirst({
        where: { username: 'admin' }
      });

      if (!user) {
        throw new Error('Failed to create user record');
      }

      console.log('   🔄 Updating audit fields...');
      
      // Update audit fields to reference the actual admin user
      await tx.$executeRaw`
        UPDATE employees 
        SET created_by = ${user.id}, updated_by = ${user.id}
        WHERE id = ${employee.id}
      `;

      await tx.$executeRaw`
        UPDATE users 
        SET created_by = ${user.id}, updated_by = ${user.id}
        WHERE id = ${user.id}
      `;

      console.log('   🔗 Restoring foreign key constraints...');
      
      // Restore the foreign key constraints
      await tx.$executeRaw`
        ALTER TABLE employees 
        ADD CONSTRAINT employees_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT
      `;
      
      await tx.$executeRaw`
        ALTER TABLE employees 
        ADD CONSTRAINT employees_updated_by_fkey 
        FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT
      `;
      
      await tx.$executeRaw`
        ALTER TABLE users 
        ADD CONSTRAINT users_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT
      `;
      
      await tx.$executeRaw`
        ALTER TABLE users 
        ADD CONSTRAINT users_updated_by_fkey 
        FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT
      `;

      return { employee, user };
    });

    console.log('✅ Admin user created successfully!');
    console.log('📋 Details:');
    console.log(`   Employee ID: ${result.employee.employeeId}`);
    console.log(`   Username: ${result.user.username}`);
    console.log(`   Email: ${result.employee.email}`);
    console.log(`   Password: admin123`);
    console.log(`   Database User ID: ${result.user.id}`);
    console.log(`   Database Employee ID: ${result.employee.id}`);
    
    // Test the login functionality
    console.log('\n🧪 Testing login functionality...');
    const testUser = await prisma.user.findFirst({
      where: {
        username: 'admin',
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

    if (testUser) {
      const isPasswordValid = await bcrypt.compare('admin123', testUser.passwordHash);
      if (isPasswordValid) {
        console.log('✅ Login test successful!');
        console.log(`   User can login with username: ${testUser.username}`);
        console.log(`   Full name: ${testUser.employee.firstName} ${testUser.employee.lastName}`);
        console.log(`   Employee ID: ${testUser.employee.employeeId}`);
      } else {
        console.log('❌ Login test failed - password verification failed');
      }
    } else {
      console.log('❌ Login test failed - user not found');
    }

    // Display connection info for frontend
    console.log('\n🔗 Connection Information:');
    console.log('   Backend URL: http://localhost:3000');
    console.log('   Login Credentials:');
    console.log('     Username: admin');
    console.log('     Password: admin123');

    // Verify database integrity
    console.log('\n🔍 Verifying database integrity...');
    const userCount = await prisma.user.count();
    const employeeCount = await prisma.employee.count();
    console.log(`   Users in database: ${userCount}`);
    console.log(`   Employees in database: ${employeeCount}`);

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    
    // Provide specific error messages for common issues
    if (error.code === 'P2002') {
      console.error('   → Duplicate key constraint violation. Admin user might already exist.');
    } else if (error.code === 'P2003') {
      console.error('   → Foreign key constraint violation. Check database relationships.');
    } else if (error.code === 'P1001') {
      console.error('   → Cannot connect to database. Check your DATABASE_URL in .env file.');
    } else if (error.message && error.message.includes('relation') && error.message.includes('does not exist')) {
      console.error('   → Database tables do not exist. Run: npx prisma migrate dev');
    }
    
    console.error('\n🔧 Troubleshooting steps:');
    console.error('   1. Ensure PostgreSQL is running');
    console.error('   2. Check DATABASE_URL in .env file');
    console.error('   3. Run: npx prisma generate');
    console.error('   4. Run: npx prisma migrate dev');
    console.error('   5. Try running this script again');
    
    // Try to restore constraints if something went wrong
    try {
      console.log('\n🔄 Attempting to restore foreign key constraints...');
      await prisma.$executeRaw`
        ALTER TABLE employees 
        ADD CONSTRAINT employees_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT
      `;
      await prisma.$executeRaw`
        ALTER TABLE employees 
        ADD CONSTRAINT employees_updated_by_fkey 
        FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT
      `;
      await prisma.$executeRaw`
        ALTER TABLE users 
        ADD CONSTRAINT users_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT
      `;
      await prisma.$executeRaw`
        ALTER TABLE users 
        ADD CONSTRAINT users_updated_by_fkey 
        FOREIGN KEY (updated_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT
      `;
      console.log('✅ Foreign key constraints restored.');
    } catch (restoreError) {
      console.error('⚠️  Could not restore foreign key constraints:', restoreError.message);
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Database connection closed.');
  }
}

// Run the script
console.log('🚀 Starting admin user creation...');
console.log('📊 Database URL:', process.env.DATABASE_URL ? 'Configured' : 'Not configured');

createAdminUser()
  .then(() => {
    console.log('\n🎉 Admin user creation completed successfully!');
    console.log('📝 You can now use these credentials to login to the application.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error.message);
    process.exit(1);
  });