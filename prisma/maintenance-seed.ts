import { PrismaClient, AssetStatus, MaintenanceStatus, MaintenanceTypeEnum } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Starting maintenance data seeding with historical records...')

  try {
    // Clear existing maintenance data
    await prisma.maintenanceSchedule.deleteMany({})
    console.log('🗑️  Cleared existing maintenance records')

    // Get admin user
    const adminUser = await prisma.user.findUnique({
      where: { username: 'admin' }
    })

    if (!adminUser) {
      throw new Error('Admin user not found. Please run simple-seed.ts first.')
    }

    // Get available assets (only AVAILABLE status can have maintenance scheduled)
    const availableAssets = await prisma.asset.findMany({
      where: { status: 'AVAILABLE' },
      include: {
        assetType: true,
        brand: true,
        model: true,
      },
      take: 10, // Limit to 10 assets for demo
    })

    if (availableAssets.length === 0) {
      console.log('⚠️  No available assets found. Creating some available assets...')
      
      // Update some assets to be available
      const assignedAssets = await prisma.asset.findMany({
        where: { status: 'ASSIGNED' },
        take: 5,
      })
      
      for (const asset of assignedAssets) {
        await prisma.asset.update({
          where: { id: asset.id },
          data: { status: 'AVAILABLE' },
        })
      }

      // Re-fetch available assets
      const updatedAssets = await prisma.asset.findMany({
        where: { status: 'AVAILABLE' },
        include: {
          assetType: true,
          brand: true,
          model: true,
        },
        take: 10,
      })
      availableAssets.push(...updatedAssets)
    }

    // Get vendors
    const vendors = await prisma.vendor.findMany({
      where: { status: 'ACTIVE' },
      take: 3,
    })

    // Create maintenance records with history for each asset
    const maintenanceHistories = [
      // Asset 1: Multiple maintenance records showing progression
      {
        assetIndex: 0,
        records: [
          {
            type: MaintenanceTypeEnum.PREVENTIVE,
            status: MaintenanceStatus.COMPLETED,
            scheduledDate: new Date('2024-08-15'),
            completedDate: new Date('2024-08-16'),
            description: 'Quarterly preventive maintenance - cleaning and inspection',
            estimatedCost: 150.00,
            actualCost: 145.00,
            completionNotes: 'All components cleaned and inspected. Minor dust removal performed.',
            vendorIndex: 0,
          },
          {
            type: MaintenanceTypeEnum.CORRECTIVE,
            status: MaintenanceStatus.COMPLETED,
            scheduledDate: new Date('2024-10-22'),
            completedDate: new Date('2024-10-23'),
            description: 'Fix display flickering issue',
            estimatedCost: 300.00,
            actualCost: 275.00,
            completionNotes: 'Replaced faulty display cable. Issue resolved.',
            vendorIndex: 1,
          },
          {
            type: MaintenanceTypeEnum.PREVENTIVE,
            status: MaintenanceStatus.SCHEDULED,
            scheduledDate: new Date('2024-12-15'),
            description: 'Year-end preventive maintenance and software updates',
            estimatedCost: 200.00,
            vendorIndex: 0,
          },
        ]
      },
      // Asset 2: Has a cancelled maintenance
      {
        assetIndex: 1,
        records: [
          {
            type: MaintenanceTypeEnum.PREVENTIVE,
            status: MaintenanceStatus.COMPLETED,
            scheduledDate: new Date('2024-09-10'),
            completedDate: new Date('2024-09-11'),
            description: 'Regular maintenance and system optimization',
            estimatedCost: 180.00,
            actualCost: 185.00,
            completionNotes: 'System optimized, temporary files cleared, performance improved.',
            vendorIndex: 2,
          },
          {
            type: MaintenanceTypeEnum.UPGRADE,
            status: MaintenanceStatus.CANCELLED,
            scheduledDate: new Date('2024-11-05'),
            cancellationDate: new Date('2024-11-03'),
            description: 'RAM upgrade to 32GB',
            estimatedCost: 500.00,
            cancellationReason: 'Budget constraints',
            cancellationNotes: 'Upgrade postponed to next quarter due to budget limitations.',
            vendorIndex: 1,
          },
        ]
      },
      // Asset 3: Currently in progress
      {
        assetIndex: 2,
        records: [
          {
            type: MaintenanceTypeEnum.CORRECTIVE,
            status: MaintenanceStatus.COMPLETED,
            scheduledDate: new Date('2024-07-20'),
            completedDate: new Date('2024-07-21'),
            description: 'Fix overheating issue',
            estimatedCost: 250.00,
            actualCost: 320.00,
            completionNotes: 'Replaced thermal paste and cleaned cooling fans. Added additional cooling.',
            vendorIndex: 0,
          },
          {
            type: MaintenanceTypeEnum.EMERGENCY,
            status: MaintenanceStatus.IN_PROGRESS,
            scheduledDate: new Date('2024-11-25'),
            actualStartDate: new Date('2024-11-25'),
            description: 'Critical security patch installation',
            estimatedCost: 100.00,
            vendorIndex: null, // Internal team
          },
        ]
      },
      // Asset 4: Simple completed maintenance
      {
        assetIndex: 3,
        records: [
          {
            type: MaintenanceTypeEnum.PREVENTIVE,
            status: MaintenanceStatus.COMPLETED,
            scheduledDate: new Date('2024-10-01'),
            completedDate: new Date('2024-10-01'),
            description: 'Monthly preventive maintenance',
            estimatedCost: 120.00,
            actualCost: 115.00,
            completionNotes: 'Routine maintenance completed successfully.',
            vendorIndex: 2,
          },
        ]
      },
      // Asset 5: Scheduled for future
      {
        assetIndex: 4,
        records: [
          {
            type: MaintenanceTypeEnum.PREVENTIVE,
            status: MaintenanceStatus.SCHEDULED,
            scheduledDate: new Date('2024-12-30'),
            description: 'End of year maintenance and backup verification',
            estimatedCost: 180.00,
            vendorIndex: 1,
          },
        ]
      },
    ]

    let totalCreated = 0

    for (const assetHistory of maintenanceHistories) {
      if (assetHistory.assetIndex >= availableAssets.length) continue

      const asset = availableAssets[assetHistory.assetIndex]

      for (const record of assetHistory.records) {
        const maintenanceData: any = {
          assetId: asset.id,
          maintenanceType: record.type,
          status: record.status,
          scheduledDate: record.scheduledDate,
          description: record.description,
          estimatedCost: record.estimatedCost,
          createdBy: adminUser.id,
          updatedBy: adminUser.id,
        }

        // Add vendor if specified
        if (record.vendorIndex !== null && record.vendorIndex < vendors.length) {
          maintenanceData.vendorId = vendors[record.vendorIndex].id
        }

        // Add status-specific fields
        if (record.status === MaintenanceStatus.COMPLETED) {
          maintenanceData.actualCompletionDate = record.completedDate
          maintenanceData.actualCost = record.actualCost
          maintenanceData.completionNotes = record.completionNotes
        } else if (record.status === MaintenanceStatus.IN_PROGRESS) {
          maintenanceData.actualStartDate = record.actualStartDate
        } else if (record.status === MaintenanceStatus.CANCELLED) {
          maintenanceData.cancellationDate = record.cancellationDate
          maintenanceData.cancellationReason = record.cancellationReason
          maintenanceData.cancellationNotes = record.cancellationNotes
        }

        await prisma.maintenanceSchedule.create({
          data: maintenanceData,
        })

        totalCreated++
        console.log(`✅ Created maintenance record for ${asset.assetId} - ${record.description}`)
      }
    }

    console.log(`🎉 Successfully created ${totalCreated} maintenance records with historical data`)
    console.log('📊 Maintenance data includes:')
    console.log('   - Assets with multiple maintenance history')
    console.log('   - Completed, scheduled, in-progress, and cancelled records')
    console.log('   - Various maintenance types (preventive, corrective, emergency, upgrade)')
    console.log('   - Both vendor and internal team assignments')

  } catch (error) {
    console.error('❌ Error seeding maintenance data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  }) 