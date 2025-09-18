/* eslint-disable */
const { PrismaClient, EmployeeStatus } = require('@prisma/client')
const prisma = new PrismaClient()

function pad(num, size) {
  let s = String(num)
  while (s.length < size) s = '0' + s
  return s
}

function randomPhone(i) {
  return `+91 9${String(800000000 + i).slice(0, 9)}`
}

async function main() {
  // Optional: do not delete existing employees to avoid FK issues
  // We will just upsert-like using createMany with skipDuplicates.

  const firstNames = [
    'Aarav','Vivaan','Aditya','Vihaan','Arjun','Sai','Reyansh','Krishna','Ishaan','Rohan',
    'Anaya','Diya','Ira','Aadhya','Myra','Anika','Sara','Aarohi','Saanvi','Navya'
  ]
  const lastNames = ['Sharma','Verma','Patel','Gupta','Singh','Iyer','Menon','Kulkarni','Reddy','Nair']

  const employees = []
  for (let i = 1; i <= 35; i++) {
    const fn = firstNames[(i - 1) % firstNames.length]
    const ln = lastNames[(i - 1) % lastNames.length]
    const id = `EMP-${pad(i, 3)}`
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@example.com`

    const dob = new Date(1990, ((i % 12) || 1) - 1, ((i % 28) || 1)) // spread months/days

    employees.push({
      employeeId: id,
      firstName: fn,
      lastName: ln,
      email,
      phone: `1234567${pad(i, 2)}`,
      dateOfBirth: dob,
      address: `${i} MG Road, Pune, Maharashtra 4110${(i % 10)}`,
      status: EmployeeStatus.ACTIVE,
      createdBy: 1,
      updatedBy: 1,
    })
  }

  await prisma.employee.createMany({ data: employees, skipDuplicates: true })

  console.log(`Seeded ${employees.length} employees`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  }) 