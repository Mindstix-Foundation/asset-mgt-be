const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const NEW_EMAIL = 'uduvalorant@gmail.com';

async function main() {
  const adminUsers = await prisma.user.findMany({
    where: {
      userRoles: {
        some: { role: { roleName: 'ADMIN' }, isActive: true },
      },
    },
    include: { employee: true },
    orderBy: { id: 'asc' },
  });

  console.log(
    'Admins before:',
    adminUsers.map((u) => ({
      userId: u.id,
      empId: u.employee?.employeeId,
      email: u.employee?.email,
      name: u.employee
        ? `${u.employee.firstName} ${u.employee.lastName}`
        : null,
    })),
  );

  let employeeIdToUpdate = null;

  if (adminUsers.length) {
    const target =
      adminUsers.find((u) => u.employee?.employeeId === '9999') ||
      adminUsers[0];
    employeeIdToUpdate = target.employeeId;
    console.log(
      `Updating admin employee ${target.employee?.employeeId} (user #${target.id})`,
    );
  } else {
    const emp = await prisma.employee.findFirst({
      where: {
        OR: [{ employeeId: '9999' }, { email: { contains: 'admin@' } }],
      },
    });
    if (!emp) throw new Error('No admin employee found');
    employeeIdToUpdate = emp.id;
    console.log(`Updating fallback employee ${emp.employeeId}`);
  }

  const updated = await prisma.employee.update({
    where: { id: employeeIdToUpdate },
    data: { email: NEW_EMAIL },
  });

  console.log(`Done. Admin email is now: ${updated.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
