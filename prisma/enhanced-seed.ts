import { PrismaClient, AssetStatus, AssetCondition } from '@prisma/client'
import { hash } from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting enhanced database seeding with diverse asset types...')

  try {
    // Get admin user (should exist from simple-seed)
    const adminUser = await prisma.user.findUnique({
      where: { username: 'admin' }
    })

    if (!adminUser) {
      throw new Error('Admin user not found. Please run simple-seed.ts first.')
    }

    // Get electronics category
    const electronics = await prisma.assetCategory.findUnique({
      where: { name: 'Electronics' }
    })

    if (!electronics) {
      throw new Error('Electronics category not found. Please run simple-seed.ts first.')
    }

    // Create additional asset types
    const assetTypes = [
      { name: 'Monitor', description: 'Computer monitors and displays' },
      { name: 'Mobile', description: 'Mobile phones and smartphones' },
      { name: 'Tablet', description: 'Tablets and portable devices' },
      { name: 'Accessories', description: 'Computer accessories and peripherals' }
    ]

    const createdAssetTypes: any = {}
    for (const assetType of assetTypes) {
      const created = await prisma.assetType.upsert({
        where: { name_categoryId: { name: assetType.name, categoryId: electronics.id } },
        update: {},
        create: {
          name: assetType.name,
          description: assetType.description,
          categoryId: electronics.id,
          createdBy: adminUser.id,
          updatedBy: adminUser.id,
        },
      })
      createdAssetTypes[assetType.name] = created
    }

    // Get laptop asset type
    const laptop = await prisma.assetType.findFirst({
      where: { name: 'Laptop', categoryId: electronics.id }
    })
    createdAssetTypes['Laptop'] = laptop

    console.log('✅ Asset types created')

    // Create additional brands
    const brands = [
      { name: 'HP', description: 'HP Inc.' },
      { name: 'Lenovo', description: 'Lenovo Group' },
      { name: 'Samsung', description: 'Samsung Electronics' },
      { name: 'Apple', description: 'Apple Inc.' },
      { name: 'LG', description: 'LG Electronics' },
      { name: 'Logitech', description: 'Logitech International' }
    ]

    const createdBrands: any = {}
    for (const brand of brands) {
      const created = await prisma.brand.upsert({
        where: { name: brand.name },
        update: {},
        create: {
          name: brand.name,
          description: brand.description,
          createdBy: adminUser.id,
          updatedBy: adminUser.id,
        },
      })
      createdBrands[brand.name] = created
    }

    // Get Dell brand
    const dell = await prisma.brand.findUnique({ where: { name: 'Dell' } })
    createdBrands['Dell'] = dell

    console.log('✅ Brands created')

    // Create models for each asset type and brand combination
    const models = [
      // Laptops
      { name: 'ThinkPad T14', brand: 'Lenovo', assetType: 'Laptop', specs: { cpu: 'AMD Ryzen 7', ram: '16GB', storage: '512GB SSD' } },
      { name: 'EliteBook 840', brand: 'HP', assetType: 'Laptop', specs: { cpu: 'Intel i7', ram: '16GB', storage: '1TB SSD' } },
      { name: 'MacBook Pro 14"', brand: 'Apple', assetType: 'Laptop', specs: { cpu: 'M2 Pro', ram: '16GB', storage: '512GB SSD' } },
      
      // Monitors
      { name: 'UltraSharp U2720Q', brand: 'Dell', assetType: 'Monitor', specs: { size: '27"', resolution: '4K UHD', panel: 'IPS' } },
      { name: 'EliteDisplay E243', brand: 'HP', assetType: 'Monitor', specs: { size: '24"', resolution: '1080p', panel: 'IPS' } },
      { name: '27UL500-W', brand: 'LG', assetType: 'Monitor', specs: { size: '27"', resolution: '4K UHD', panel: 'IPS' } },
      
      // Mobiles
      { name: 'Galaxy S23', brand: 'Samsung', assetType: 'Mobile', specs: { storage: '256GB', ram: '8GB', camera: '50MP' } },
      { name: 'iPhone 14 Pro', brand: 'Apple', assetType: 'Mobile', specs: { storage: '128GB', ram: '6GB', camera: '48MP' } },
      
      // Tablets
      { name: 'Galaxy Tab S8', brand: 'Samsung', assetType: 'Tablet', specs: { storage: '128GB', ram: '8GB', screen: '11"' } },
      { name: 'iPad Pro 11"', brand: 'Apple', assetType: 'Tablet', specs: { storage: '256GB', ram: '8GB', screen: '11"' } },
      
      // Accessories
      { name: 'MX Master 3', brand: 'Logitech', assetType: 'Accessories', specs: { type: 'Wireless Mouse', connectivity: 'Bluetooth' } },
      { name: 'MX Keys', brand: 'Logitech', assetType: 'Accessories', specs: { type: 'Wireless Keyboard', connectivity: 'Bluetooth' } },
    ]

    const createdModels: any[] = []
    for (const model of models) {
      const created = await prisma.model.upsert({
        where: { 
          name_brandId_assetTypeId: { 
            name: model.name, 
            brandId: createdBrands[model.brand].id, 
            assetTypeId: createdAssetTypes[model.assetType].id 
          } 
        },
        update: {},
        create: {
          name: model.name,
          brandId: createdBrands[model.brand].id,
          assetTypeId: createdAssetTypes[model.assetType].id,
          specifications: model.specs,
          createdBy: adminUser.id,
          updatedBy: adminUser.id,
        },
      })
      createdModels.push({ ...created, assetType: model.assetType, brand: model.brand })
    }

    console.log('✅ Models created')

    // Create additional vendors
    const additionalVendors = [
      { name: 'ElectroWorld', type: 'SUPPLIER', contact: 'Sarah Johnson', email: 'sarah@electroworld.com' },
      { name: 'MobileTech Services', type: 'SERVICE', contact: 'Mike Chen', email: 'mike@mobiletech.com' },
      { name: 'AccessoryHub', type: 'DISTRIBUTOR', contact: 'Lisa Brown', email: 'lisa@accessoryhub.com' }
    ]

    for (const vendor of additionalVendors) {
      // Check if vendor exists first
      const existingVendor = await prisma.vendor.findFirst({
        where: { name: vendor.name }
      })

      if (!existingVendor) {
        await prisma.vendor.create({
          data: {
            name: vendor.name,
            vendorType: vendor.type as any,
            contactPerson: vendor.contact,
            email: vendor.email,
            phone: '+91-9876543210',
            address: 'Tech Park, Pune, Maharashtra',
            createdBy: adminUser.id,
            updatedBy: adminUser.id,
          },
        })
      }
    }

    console.log('✅ Additional vendors created')

    // Create diverse assets with different statuses
    const assetData = [
      // Additional Laptops
      { type: 'Laptop', brand: 'Lenovo', model: 'ThinkPad T14', status: 'ASSIGNED', condition: 'GOOD', cost: 85000 },
      { type: 'Laptop', brand: 'HP', model: 'EliteBook 840', status: 'AVAILABLE', condition: 'NEW', cost: 95000 },
      { type: 'Laptop', brand: 'Apple', model: 'MacBook Pro 14"', status: 'IN_MAINTENANCE', condition: 'GOOD', cost: 180000 },
      
      // Monitors
      { type: 'Monitor', brand: 'Dell', model: 'UltraSharp U2720Q', status: 'AVAILABLE', condition: 'NEW', cost: 35000 },
      { type: 'Monitor', brand: 'Dell', model: 'UltraSharp U2720Q', status: 'ASSIGNED', condition: 'GOOD', cost: 35000 },
      { type: 'Monitor', brand: 'HP', model: 'EliteDisplay E243', status: 'AVAILABLE', condition: 'GOOD', cost: 18000 },
      { type: 'Monitor', brand: 'HP', model: 'EliteDisplay E243', status: 'ASSIGNED', condition: 'GOOD', cost: 18000 },
      { type: 'Monitor', brand: 'LG', model: '27UL500-W', status: 'AVAILABLE', condition: 'NEW', cost: 28000 },
      { type: 'Monitor', brand: 'LG', model: '27UL500-W', status: 'RETIRED', condition: 'POOR', cost: 28000 },
      { type: 'Monitor', brand: 'LG', model: '27UL500-W', status: 'IN_MAINTENANCE', condition: 'FAIR', cost: 28000 },
      
      // Mobiles
      { type: 'Mobile', brand: 'Samsung', model: 'Galaxy S23', status: 'ASSIGNED', condition: 'NEW', cost: 65000 },
      { type: 'Mobile', brand: 'Samsung', model: 'Galaxy S23', status: 'AVAILABLE', condition: 'GOOD', cost: 65000 },
      { type: 'Mobile', brand: 'Apple', model: 'iPhone 14 Pro', status: 'ASSIGNED', condition: 'NEW', cost: 120000 },
      { type: 'Mobile', brand: 'Apple', model: 'iPhone 14 Pro', status: 'AVAILABLE', condition: 'GOOD', cost: 120000 },
      { type: 'Mobile', brand: 'Samsung', model: 'Galaxy S23', status: 'IN_MAINTENANCE', condition: 'DAMAGED', cost: 65000 },
      { type: 'Mobile', brand: 'Apple', model: 'iPhone 14 Pro', status: 'AVAILABLE', condition: 'FAIR', cost: 120000 },
      { type: 'Mobile', brand: 'Samsung', model: 'Galaxy S23', status: 'AVAILABLE', condition: 'GOOD', cost: 65000 },
      { type: 'Mobile', brand: 'Apple', model: 'iPhone 14 Pro', status: 'ASSIGNED', condition: 'NEW', cost: 120000 },
      
      // Tablets
      { type: 'Tablet', brand: 'Samsung', model: 'Galaxy Tab S8', status: 'AVAILABLE', condition: 'NEW', cost: 55000 },
      { type: 'Tablet', brand: 'Apple', model: 'iPad Pro 11"', status: 'ASSIGNED', condition: 'GOOD', cost: 85000 },
      { type: 'Tablet', brand: 'Samsung', model: 'Galaxy Tab S8', status: 'AVAILABLE', condition: 'GOOD', cost: 55000 },
      { type: 'Tablet', brand: 'Apple', model: 'iPad Pro 11"', status: 'IN_MAINTENANCE', condition: 'FAIR', cost: 85000 },
      { type: 'Tablet', brand: 'Samsung', model: 'Galaxy Tab S8', status: 'ASSIGNED', condition: 'GOOD', cost: 55000 },
      { type: 'Tablet', brand: 'Apple', model: 'iPad Pro 11"', status: 'AVAILABLE', condition: 'NEW', cost: 85000 },
      
      // Accessories
      { type: 'Accessories', brand: 'Logitech', model: 'MX Master 3', status: 'AVAILABLE', condition: 'NEW', cost: 8500 },
      { type: 'Accessories', brand: 'Logitech', model: 'MX Keys', status: 'ASSIGNED', condition: 'GOOD', cost: 12000 },
      { type: 'Accessories', brand: 'Logitech', model: 'MX Master 3', status: 'AVAILABLE', condition: 'GOOD', cost: 8500 },
      { type: 'Accessories', brand: 'Logitech', model: 'MX Keys', status: 'AVAILABLE', condition: 'NEW', cost: 12000 },
      { type: 'Accessories', brand: 'Logitech', model: 'MX Master 3', status: 'ASSIGNED', condition: 'GOOD', cost: 8500 },
      { type: 'Accessories', brand: 'Logitech', model: 'MX Keys', status: 'AVAILABLE', condition: 'GOOD', cost: 12000 },
      { type: 'Accessories', brand: 'Logitech', model: 'MX Master 3', status: 'RETIRED', condition: 'POOR', cost: 8500 },
      { type: 'Accessories', brand: 'Logitech', model: 'MX Keys', status: 'ASSIGNED', condition: 'FAIR', cost: 12000 },
      { type: 'Accessories', brand: 'Logitech', model: 'MX Master 3', status: 'AVAILABLE', condition: 'NEW', cost: 8500 },
      { type: 'Accessories', brand: 'Logitech', model: 'MX Keys', status: 'AVAILABLE', condition: 'GOOD', cost: 12000 },
      { type: 'Accessories', brand: 'Logitech', model: 'MX Master 3', status: 'ASSIGNED', condition: 'GOOD', cost: 8500 },
      { type: 'Accessories', brand: 'Logitech', model: 'MX Keys', status: 'IN_MAINTENANCE', condition: 'DAMAGED', cost: 12000 },
    ]

    let assetCounter = 6 // Start from 6 since we have AST-001 to AST-005 from simple seed
    for (const asset of assetData) {
      const assetId = `AST-${assetCounter.toString().padStart(3, '0')}`
      const modelData = createdModels.find(m => m.assetType === asset.type && createdBrands[asset.brand].id === m.brandId)
      
      if (modelData) {
        await prisma.asset.upsert({
          where: { assetId },
          update: {},
          create: {
            assetId,
            assetTypeId: createdAssetTypes[asset.type].id,
            brandId: createdBrands[asset.brand].id,
            modelId: modelData.id,
            serialNumber: `${asset.brand.substring(0, 2).toUpperCase()}${assetCounter.toString().padStart(6, '0')}`,
            purchaseDate: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
            purchaseCost: asset.cost,
            location: `Floor ${Math.floor(Math.random() * 3) + 1} - ${asset.type} ${assetCounter}`,
            condition: asset.condition as AssetCondition,
            status: asset.status as AssetStatus,
            createdBy: adminUser.id,
            updatedBy: adminUser.id,
          },
        })
      }
      assetCounter++
    }

    console.log('✅ Diverse assets created')

    // Create some asset issues for assigned assets
    const assignedAssets = await prisma.asset.findMany({
      where: { status: 'ASSIGNED' },
      take: 10
    })

    const employees = await prisma.employee.findMany({ take: 10 })

    for (let i = 0; i < Math.min(assignedAssets.length, employees.length); i++) {
      await prisma.assetIssue.create({
        data: {
          assetId: assignedAssets[i].id,
          employeeId: employees[i].id,
          issuedBy: adminUser.id,
          issueDate: new Date(2024, Math.floor(Math.random() * 6), Math.floor(Math.random() * 28) + 1),
          issueCondition: 'GOOD',
          issueReason: 'Work assignment',
          createdBy: adminUser.id,
          updatedBy: adminUser.id,
        },
      })
    }

    console.log('✅ Asset issues created for assigned assets')

    // Create additional maintenance schedules
    const maintenanceAssets = await prisma.asset.findMany({
      where: { status: { in: ['IN_MAINTENANCE', 'AVAILABLE'] } },
      take: 8
    })

    const vendors = await prisma.vendor.findMany()
    const maintenanceTypes = ['PREVENTIVE', 'CORRECTIVE', 'EMERGENCY', 'UPGRADE']
    const statuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED']

    for (let i = 0; i < maintenanceAssets.length; i++) {
      await prisma.maintenanceSchedule.create({
        data: {
          assetId: maintenanceAssets[i].id,
          maintenanceType: maintenanceTypes[i % maintenanceTypes.length] as any,
          scheduledDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
          description: `Maintenance for ${maintenanceAssets[i].assetId} - ${maintenanceTypes[i % maintenanceTypes.length].toLowerCase()}`,
          estimatedCost: 1500 + (Math.random() * 3000),
          status: statuses[i % statuses.length] as any,
          vendorId: vendors[i % vendors.length]?.id || null,
          createdBy: adminUser.id,
          updatedBy: adminUser.id,
        },
      })
    }

    console.log('✅ Additional maintenance schedules created')

    // Summary
    const totalAssets = await prisma.asset.count()
    const assetsByType = await prisma.asset.groupBy({
      by: ['assetTypeId'],
      _count: { id: true }
    })

    console.log('🎉 Enhanced database seeding completed successfully!')
    console.log(`📊 Summary:`)
    console.log(`   - Total Assets: ${totalAssets}`)
    console.log(`   - Asset Types: ${Object.keys(createdAssetTypes).length}`)
    console.log(`   - Brands: ${Object.keys(createdBrands).length}`)
    console.log(`   - Models: ${createdModels.length}`)
    console.log(`   - Vendors: ${vendors.length}`)
    console.log('')
    console.log('📈 Asset Distribution:')
    for (const group of assetsByType) {
      const assetType = await prisma.assetType.findUnique({ where: { id: group.assetTypeId } })
      console.log(`   - ${assetType?.name}: ${group._count.id} assets`)
    }

  } catch (error) {
    console.error('❌ Error during enhanced seeding:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error('❌ Enhanced seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 