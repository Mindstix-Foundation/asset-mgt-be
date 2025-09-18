/* eslint-disable */
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const sql = `
    UPDATE employees
    SET phone = '+91 ' || RIGHT(regexp_replace(phone, '\\D', '', 'g'), 10)
    WHERE phone IS NOT NULL
      AND phone <> ''
      AND phone NOT LIKE '+91 %';
  `
  const result = await prisma.$executeRawUnsafe(sql)
  console.log(`Updated ${result} employee phone numbers to +91 format`)
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