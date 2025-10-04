const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAndUpdateUserRoles() {
  try {
    console.log('Checking user roles...');
    
    // Get all users
    const users = await prisma.user.findMany({
      include: {
        employee: true
      }
    });

    console.log('Current users:');
    users.forEach(user => {
      console.log(`- ID: ${user.id}, Username: ${user.username}, Roles: [${user.roles.join(', ')}], Active: ${user.isActive}`);
    });

    // Check if any user has ADMIN role
    const adminUsers = users.filter(user => user.roles.includes('ADMIN'));
    console.log(`\nAdmin users: ${adminUsers.length}`);

    if (adminUsers.length === 0) {
      console.log('\nNo admin users found. Creating admin role for first user...');
      
      if (users.length > 0) {
        const firstUser = users[0];
        await prisma.user.update({
          where: { id: firstUser.id },
          data: { 
            roles: ['ADMIN'],
            isActive: true
          }
        });
        console.log(`✅ Updated user ${firstUser.username} to have ADMIN role`);
      } else {
        console.log('❌ No users found in database');
      }
    } else {
      console.log('✅ Admin users found:');
      adminUsers.forEach(user => {
        console.log(`  - ${user.username} (${user.employee?.firstName} ${user.employee?.lastName})`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndUpdateUserRoles();
