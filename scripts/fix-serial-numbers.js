const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixSerialNumbers() {
  console.log('🔧 Starting serial number cleanup...');
  
  try {
    // Find all assets with serial numbers that have leading or trailing spaces
    const assetsWithSpaces = await prisma.asset.findMany({
      where: {
        serialNumber: {
          not: null,
          // Find serial numbers that don't match their trimmed version
        }
      },
      select: {
        id: true,
        assetId: true,
        serialNumber: true
      }
    });

    console.log(`📊 Found ${assetsWithSpaces.length} assets to check`);

    let fixedCount = 0;
    
    for (const asset of assetsWithSpaces) {
      if (asset.serialNumber) {
        const originalSerial = asset.serialNumber;
        const trimmedSerial = asset.serialNumber.trim();
        
        // If the serial number has leading/trailing spaces, fix it
        if (originalSerial !== trimmedSerial) {
          console.log(`🔍 Asset ${asset.assetId}: "${originalSerial}" -> "${trimmedSerial}"`);
          
          // Check if the trimmed version already exists
          const existingAsset = await prisma.asset.findFirst({
            where: {
              serialNumber: trimmedSerial,
              id: { not: asset.id }
            }
          });
          
          if (existingAsset) {
            console.log(`⚠️  Skipping ${asset.assetId}: trimmed serial "${trimmedSerial}" already exists in asset ${existingAsset.assetId}`);
          } else {
            // Update the serial number
            await prisma.asset.update({
              where: { id: asset.id },
              data: { serialNumber: trimmedSerial }
            });
            
            console.log(`✅ Fixed ${asset.assetId}: serial number updated`);
            fixedCount++;
          }
        }
      }
    }
    
    console.log(`🎉 Serial number cleanup completed! Fixed ${fixedCount} assets.`);
    
  } catch (error) {
    console.error('❌ Error during serial number cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSerialNumbers();
