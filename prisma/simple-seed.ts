import { PrismaClient } from '@prisma/client'
import { hash } from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting simple database seeding...')

  try {
    // Check if admin employee exists
    let adminEmployee = await prisma.employee.findUnique({
      where: { email: 'admin@mindstix.com' }
    })

    if (!adminEmployee) {
      adminEmployee = await prisma.employee.create({
        data: {
          employeeId: 'EMP001',
          firstName: 'System',
          lastName: 'Admin',
          email: 'admin@mindstix.com',
          phone: '+91-9999999999',
          status: 'ACTIVE',
          createdBy: 1,
          updatedBy: 1,
        },
      })
      console.log('✅ Admin employee created')
    }

    // Check if admin user exists
    let adminUser = await prisma.user.findUnique({
      where: { username: 'admin' }
    })

    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          employeeId: adminEmployee.id,
          username: 'admin',
          passwordHash: await hash('admin123', 10),
          isActive: true,
          createdBy: adminEmployee.id,
          updatedBy: adminEmployee.id,
        },
      })
      console.log('✅ Admin user created')
    }

    // Update employee with correct user reference
    await prisma.employee.update({
      where: { id: adminEmployee.id },
      data: {
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
    })

    // Create basic structure
    const electronics = await prisma.assetCategory.upsert({
      where: { name: 'Electronics' },
      update: {},
      create: {
        name: 'Electronics',
        description: 'Electronic devices and equipment',
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
    })

    const laptop = await prisma.assetType.upsert({
      where: { name_categoryId: { name: 'Laptop', categoryId: electronics.id } },
      update: {},
      create: {
        name: 'Laptop',
        description: 'Portable computers',
        categoryId: electronics.id,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
    })

    const dell = await prisma.brand.upsert({
      where: { name: 'Dell' },
      update: {},
      create: {
        name: 'Dell',
        description: 'Dell Technologies',
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
    })

    const latitude = await prisma.model.upsert({
      where: { name_brandId_assetTypeId: { name: 'Latitude 5520', brandId: dell.id, assetTypeId: laptop.id } },
      update: {},
      create: {
        name: 'Latitude 5520',
        brandId: dell.id,
        assetTypeId: laptop.id,
        specifications: { cpu: 'Intel i7', ram: '16GB', storage: '512GB SSD' },
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
    })

    const vendor = await prisma.vendor.upsert({
      where: { id: 1 },
      update: {},
      create: {
        name: 'TechFix Solutions',
        vendorType: 'SERVICE',
        contactPerson: 'John Smith',
        email: 'john@techfix.com',
        phone: '+91-9876543210',
        address: 'Tech Park, Pune, Maharashtra',
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
    })

    console.log('✅ Basic structure created')

    // Create 5 sample assets
    for (let i = 1; i <= 5; i++) {
      const assetId = `AST-${i.toString().padStart(3, '0')}`
      
      await prisma.asset.upsert({
        where: { assetId },
        update: {},
        create: {
          assetId,
          assetTypeId: laptop.id,
          brandId: dell.id,
          modelId: latitude.id,
          serialNumber: `DL00${i}234`,
          purchaseDate: new Date('2023-06-15'),
          purchaseCost: 75000 + (i * 5000),
          location: `Floor 1 - Desk ${i}`,
          condition: 'GOOD',
          status: 'AVAILABLE',
          createdBy: adminUser.id,
          updatedBy: adminUser.id,
        },
      })
    }

    console.log('✅ 5 Sample assets created')

    // Create 3 sample maintenance records
    const assets = await prisma.asset.findMany({ take: 3 })
    const maintenanceTypes = ['PREVENTIVE', 'CORRECTIVE', 'EMERGENCY']
    const statuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED']

    for (let i = 0; i < 3; i++) {
      await prisma.maintenanceSchedule.create({
        data: {
          assetId: assets[i].id,
          maintenanceType: maintenanceTypes[i] as any,
          scheduledDate: new Date(2024, 3 + i, 15 + i * 5), // April, May, June
          description: `Sample maintenance ${i + 1} - ${maintenanceTypes[i].toLowerCase()} maintenance`,
          estimatedCost: 2500 + (i * 1000),
          status: statuses[i] as any,
          createdBy: adminUser.id,
          updatedBy: adminUser.id,
        },
      })
    }

    console.log('✅ 3 Sample maintenance records created')

    console.log('🎉 Simple database seeding completed successfully!')
    console.log(`📊 Summary:`)
    console.log(`   - 1 Admin user (username: admin, password: admin123)`)
    console.log(`   - 1 Asset category (Electronics)`)
    console.log(`   - 1 Asset type (Laptop)`)
    console.log(`   - 1 Brand (Dell)`)
    console.log(`   - 1 Model (Latitude 5520)`)
    console.log(`   - 1 Vendor (TechFix Solutions)`)
    console.log(`   - 5 Assets (AST-001 to AST-005)`)
    console.log(`   - 3 Maintenance records`)
    console.log('')
    console.log('🔑 Login credentials:')
    console.log('   Username: admin')
    console.log('   Password: admin123')

  } catch (error) {
    console.error('❌ Error during seeding:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 