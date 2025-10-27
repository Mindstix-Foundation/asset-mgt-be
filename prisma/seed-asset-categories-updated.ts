import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAssetCategoriesAndTypes() {
  console.log('🌱 Starting asset categories and types seed (UPDATED with proper structure)...');

  // Get admin user for audit fields
  const adminUser = await prisma.user.findUnique({
    where: { username: 'admin' },
  });

  if (!adminUser) {
    throw new Error('Admin user not found. Please run the main seed file first.');
  }

  // Define asset categories based on analysis
  const categories = {
    Electronics: 'Electronic devices including laptops, desktops, tablets, and mobile phones',
    Accessories: 'Computer and electronic accessories including keyboards, mice, and adapters',
    'Network Equipment': 'Routers, switches, and wireless access points',
    'Home Appliances': 'Air conditioners and other appliances',
    'Media Devices': 'Streaming devices, media players, and entertainment systems',
    Wearables: 'Smartwatches and wearable technology',
  };

  // Asset types with proper categorization
  const assetTypesData = [
    // Electronics - Laptops
    { category: 'Electronics', type: 'Laptop', name: 'MacBook', description: 'Apple MacBook laptops' },
    { category: 'Electronics', type: 'Laptop', name: 'Dell Inspiron', description: 'Dell Inspiron series laptops' },
    { category: 'Electronics', type: 'Laptop', name: 'Dell Vostro', description: 'Dell Vostro business laptops' },
    { category: 'Electronics', type: 'Laptop', name: 'Sony Vaio', description: 'Sony Vaio laptops' },
    { category: 'Electronics', type: 'Laptop', name: 'Asus Laptop', description: 'Asus laptops' },
    
    // Electronics - Desktops
    { category: 'Electronics', type: 'Desktop', name: 'Mac Mini', description: 'Apple Mac Mini desktop computers' },
    { category: 'Electronics', type: 'Desktop', name: 'iMac', description: 'Apple iMac all-in-one desktop computers' },
    { category: 'Electronics', type: 'Desktop', name: 'Lenovo Desktop', description: 'Lenovo desktop computers' },
    
    // Electronics - Mobiles
    { category: 'Electronics', type: 'Mobile', name: 'iPhone', description: 'Apple iPhone smartphones' },
    { category: 'Electronics', type: 'Mobile', name: 'Samsung Mobile', description: 'Samsung Galaxy smartphones' },
    { category: 'Electronics', type: 'Mobile', name: 'Google Nexus', description: 'Google Nexus smartphones' },
    { category: 'Electronics', type: 'Mobile', name: 'Nokia Lumia', description: 'Nokia Lumia Windows phones' },
    { category: 'Electronics', type: 'Mobile', name: 'Motorola', description: 'Motorola smartphones' },
    
    // Electronics - Tablets
    { category: 'Electronics', type: 'Tablet', name: 'iPad', description: 'Apple iPad tablets' },
    { category: 'Electronics', type: 'Tablet', name: 'Microsoft Surface', description: 'Microsoft Surface tablets' },
    
    // Electronics - Monitors
    { category: 'Electronics', type: 'Monitor', name: 'Dell Monitor', description: 'Dell monitors and displays' },
    
    // Electronics - Storage
    { category: 'Electronics', type: 'Storage', name: 'WD External HDD', description: 'Western Digital external hard drives' },
    
    // Electronics - Printers
    { category: 'Electronics', type: 'Printer', name: 'Samsung Printer', description: 'Samsung multifunction printers' },
    
    // Accessories
    { category: 'Accessories', type: 'Keyboard', name: 'Apple Keyboard', description: 'Apple wireless keyboards' },
    { category: 'Accessories', type: 'Mouse', name: 'Dell Mouse', description: 'Dell USB optical mice' },
    { category: 'Accessories', type: 'Mouse', name: 'Apple Mouse', description: 'Apple wireless mice' },
    { category: 'Accessories', type: 'Accessory', name: 'Power Adapter', description: 'Apple power adapters and chargers' },
    
    // Network Equipment
    { category: 'Network Equipment', type: 'Router', name: 'Apple Router', description: 'Apple Airport wireless routers' },
    { category: 'Network Equipment', type: 'Router', name: 'Cisco Router', description: 'Cisco network routers' },
    { category: 'Network Equipment', type: 'Router', name: 'Ruckus Wireless', description: 'Ruckus wireless access points' },
    { category: 'Network Equipment', type: 'Router', name: 'Belkin Router', description: 'Belkin wireless routers' },
    
    // Home Appliances
    { category: 'Home Appliances', type: 'Air Conditioner', name: 'Blue Star AC', description: 'Blue Star air conditioners' },
    
    // Media Devices
    { category: 'Media Devices', type: 'Streaming Device', name: 'Apple TV', description: 'Apple TV streaming media players' },
    { category: 'Media Devices', type: 'Media Player', name: 'iPod', description: 'Apple iPod media players' },
    
    // Wearables
    { category: 'Wearables', type: 'Wearable', name: 'Apple Watch', description: 'Apple Watch smartwatches' },
  ];

  // Brands with descriptions
  const brandsData = [
    { name: 'Apple', description: 'Apple Inc. - Premium consumer electronics' },
    { name: 'Dell', description: 'Dell Technologies - Business and consumer computers' },
    { name: 'Samsung', description: 'Samsung Electronics - Mobile devices and electronics' },
    { name: 'Sony', description: 'Sony Corporation - Consumer electronics and computing' },
    { name: 'Asus', description: 'ASUSTeK Computer Inc. - Computer hardware and electronics' },
    { name: 'Google', description: 'Google LLC - Nexus smartphones' },
    { name: 'Nokia', description: 'Nokia Corporation - Mobile phones' },
    { name: 'Motorola', description: 'Motorola Mobility - Smartphones' },
    { name: 'Microsoft', description: 'Microsoft Corporation - Surface devices' },
    { name: 'Lenovo', description: 'Lenovo Group - Personal computers' },
    { name: 'Cisco', description: 'Cisco Systems - Network equipment' },
    { name: 'Ruckus', description: 'Ruckus Networks - Wireless equipment' },
    { name: 'Belkin', description: 'Belkin International - Consumer electronics' },
    { name: 'Blue Star', description: 'Blue Star Limited - Air conditioning systems' },
    { name: 'Western Digital', description: 'Western Digital - Storage solutions' },
  ];

  // Models with proper brand and type associations
  const modelsData = [
    // MacBook Models
    { brand: 'Apple', assetType: 'MacBook', name: 'MacBook Pro 13" Retina', description: '13-inch MacBook Pro with Retina display' },
    { brand: 'Apple', assetType: 'MacBook', name: 'MacBook Pro 15" Retina', description: '15-inch MacBook Pro with Retina display' },
    { brand: 'Apple', assetType: 'MacBook', name: 'MacBook Pro 13" Non-Retina', description: '13-inch MacBook Pro without Retina display' },
    
    // Dell Inspiron Models
    { brand: 'Dell', assetType: 'Dell Inspiron', name: 'Inspiron 3537', description: 'Dell Inspiron 3537 laptop' },
    { brand: 'Dell', assetType: 'Dell Inspiron', name: 'Inspiron 3542', description: 'Dell Inspiron 3542 laptop' },
    { brand: 'Dell', assetType: 'Dell Inspiron', name: 'Inspiron 5520', description: 'Dell Inspiron 5520 laptop' },
    { brand: 'Dell', assetType: 'Dell Inspiron', name: 'Inspiron 5548', description: 'Dell Inspiron 5548 laptop' },
    { brand: 'Dell', assetType: 'Dell Inspiron', name: 'Inspiron 5558', description: 'Dell Inspiron 5558 laptop' },
    { brand: 'Dell', assetType: 'Dell Inspiron', name: 'Inspiron 5559', description: 'Dell Inspiron 5559 laptop' },
    { brand: 'Dell', assetType: 'Dell Inspiron', name: 'Inspiron 15 5000', description: 'Dell Inspiron 15 5000 series laptop' },
    
    // Dell Vostro Models
    { brand: 'Dell', assetType: 'Dell Vostro', name: 'Vostro 15', description: 'Dell Vostro 15-inch business laptop' },
    
    // iPhone Models
    { brand: 'Apple', assetType: 'iPhone', name: 'iPhone 4S', description: 'Apple iPhone 4S' },
    { brand: 'Apple', assetType: 'iPhone', name: 'iPhone 5', description: 'Apple iPhone 5' },
    { brand: 'Apple', assetType: 'iPhone', name: 'iPhone 5S', description: 'Apple iPhone 5S' },
    { brand: 'Apple', assetType: 'iPhone', name: 'iPhone 6', description: 'Apple iPhone 6' },
    { brand: 'Apple', assetType: 'iPhone', name: 'iPhone 6 Plus', description: 'Apple iPhone 6 Plus' },
    { brand: 'Apple', assetType: 'iPhone', name: 'iPhone 6S', description: 'Apple iPhone 6S' },
    { brand: 'Apple', assetType: 'iPhone', name: 'iPhone 7', description: 'Apple iPhone 7' },
    
    // iPad Models
    { brand: 'Apple', assetType: 'iPad', name: 'iPad', description: 'Apple iPad tablet' },
    { brand: 'Apple', assetType: 'iPad', name: 'iPad Mini 3', description: 'Apple iPad Mini 3 with Retina display' },
    
    // Mac Desktop Models
    { brand: 'Apple', assetType: 'Mac Mini', name: 'Mac Mini', description: 'Apple Mac Mini desktop computer' },
    { brand: 'Apple', assetType: 'iMac', name: 'iMac 27"', description: 'Apple iMac 27-inch all-in-one desktop' },
    
    // Samsung Models
    { brand: 'Samsung', assetType: 'Samsung Mobile', name: 'Galaxy S4', description: 'Samsung Galaxy S4 smartphone' },
    { brand: 'Samsung', assetType: 'Samsung Mobile', name: 'Galaxy S6 Edge', description: 'Samsung Galaxy S6 Edge smartphone' },
    { brand: 'Samsung', assetType: 'Samsung Mobile', name: 'Galaxy S7', description: 'Samsung Galaxy S7 smartphone' },
    { brand: 'Samsung', assetType: 'Samsung Mobile', name: 'Galaxy J7', description: 'Samsung Galaxy J7 smartphone' },
    { brand: 'Samsung', assetType: 'Samsung Mobile', name: 'Galaxy Grand 2', description: 'Samsung Galaxy Grand 2 smartphone' },
    
    // Other Laptops
    { brand: 'Sony', assetType: 'Sony Vaio', name: 'Vaio 15"', description: 'Sony Vaio 15-inch laptop' },
    { brand: 'Asus', assetType: 'Asus Laptop', name: 'Asus K53SD', description: 'Asus K53SD laptop' },
    
    // Monitors
    { brand: 'Dell', assetType: 'Dell Monitor', name: 'Dell S2240L', description: 'Dell S2240L 21.5" LED monitor' },
    { brand: 'Dell', assetType: 'Dell Monitor', name: 'Dell ST2420L', description: 'Dell ST2420L 24" LED monitor' },
    
    // Accessories
    { brand: 'Apple', assetType: 'Apple Keyboard', name: 'Apple Keyboard A1314', description: 'Apple Wireless Keyboard' },
    { brand: 'Dell', assetType: 'Dell Mouse', name: 'Dell MS111', description: 'Dell MS111 USB optical mouse' },
    { brand: 'Apple', assetType: 'Apple Mouse', name: 'Apple Magic Mouse', description: 'Apple Magic Mouse' },
    { brand: 'Apple', assetType: 'Power Adapter', name: 'MagSafe Power Adapter', description: 'Apple MagSafe power adapter' },
    
    // Network Equipment
    { brand: 'Apple', assetType: 'Apple Router', name: 'Airport Express', description: 'Apple Airport Express Wi-Fi router' },
    { brand: 'Cisco', assetType: 'Cisco Router', name: 'Cisco RV042', description: 'Cisco RV042 dual WAN VPN router' },
    { brand: 'Ruckus', assetType: 'Ruckus Wireless', name: 'Ruckus Wireless AP', description: 'Ruckus wireless access point' },
    { brand: 'Belkin', assetType: 'Belkin Router', name: 'Belkin Wireless Router', description: 'Belkin wireless router' },
    
    // Google/Motorola/Nokia/Microsoft
    { brand: 'Google', assetType: 'Google Nexus', name: 'Nexus 5X', description: 'Google Nexus 5X smartphone' },
    { brand: 'Google', assetType: 'Google Nexus', name: 'Nexus 6P', description: 'Google Nexus 6P smartphone' },
    { brand: 'Nokia', assetType: 'Nokia Lumia', name: 'Lumia 640 XL', description: 'Nokia Lumia 640 XL Windows phone' },
    { brand: 'Nokia', assetType: 'Nokia Lumia', name: 'Lumia 730', description: 'Nokia Lumia 730 Windows phone' },
    { brand: 'Nokia', assetType: 'Nokia Lumia', name: 'Lumia 620', description: 'Nokia Lumia 620 Windows phone' },
    { brand: 'Motorola', assetType: 'Motorola', name: 'Moto G3', description: 'Motorola Moto G 3rd generation smartphone' },
    { brand: 'Microsoft', assetType: 'Microsoft Surface', name: 'Surface 3', description: 'Microsoft Surface 3 tablet' },
    { brand: 'Lenovo', assetType: 'Lenovo Desktop', name: 'Lenovo All-in-One', description: 'Lenovo all-in-one desktop computer' },
    
    // Media & Wearables
    { brand: 'Apple', assetType: 'Apple TV', name: 'Apple TV 4th Gen', description: 'Apple TV 4th generation' },
    { brand: 'Apple', assetType: 'iPod', name: 'iPod Touch 6th Gen', description: 'Apple iPod Touch 6th generation' },
    { brand: 'Apple', assetType: 'Apple Watch', name: 'Apple Watch Sport', description: 'Apple Watch Sport 42mm' },
    
    // Others
    { brand: 'Blue Star', assetType: 'Blue Star AC', name: 'Blue Star Split AC', description: 'Blue Star split air conditioner' },
    { brand: 'Western Digital', assetType: 'WD External HDD', name: 'WD My Passport 1TB', description: 'Western Digital My Passport 1TB external HDD' },
    { brand: 'Samsung', assetType: 'Samsung Printer', name: 'Samsung SCX-4021S', description: 'Samsung SCX-4021S multifunction printer' },
  ];

  console.log('📝 Creating asset categories...');
  
  for (const [categoryName, categoryDesc] of Object.entries(categories)) {
    await prisma.assetCategory.upsert({
      where: { name: categoryName },
      update: {},
      create: {
        name: categoryName,
        description: categoryDesc,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
    });
  }
  
  console.log(`✅ Created ${Object.keys(categories).length} asset categories`);

  console.log('📝 Creating asset types...');
  
  let typeCount = 0;
  for (const assetTypeData of assetTypesData) {
    const category = await prisma.assetCategory.findUnique({
      where: { name: assetTypeData.category },
    });

    if (category) {
      await prisma.assetType.upsert({
        where: {
          name_categoryId: {
            name: assetTypeData.name,
            categoryId: category.id,
          },
        },
        update: {},
        create: {
          name: assetTypeData.name,
          description: assetTypeData.description,
          categoryId: category.id,
          isActive: true,
          createdBy: adminUser.id,
          updatedBy: adminUser.id,
        },
      });
      typeCount++;
    }
  }
  
  console.log(`✅ Created ${typeCount} asset types`);

  console.log('📝 Creating brands...');
  
  for (const brandData of brandsData) {
    await prisma.brand.upsert({
      where: { name: brandData.name },
      update: {},
      create: {
        name: brandData.name,
        description: brandData.description,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
    });
  }
  
  console.log(`✅ Created ${brandsData.length} brands`);

  console.log('📝 Creating models...');
  
  let modelCount = 0;
  for (const modelData of modelsData) {
    const brand = await prisma.brand.findUnique({
      where: { name: modelData.brand },
    });

    const assetType = await prisma.assetType.findFirst({
      where: { name: modelData.assetType },
    });

    if (brand && assetType) {
      await prisma.model.upsert({
        where: {
          name_brandId_assetTypeId: {
            name: modelData.name,
            brandId: brand.id,
            assetTypeId: assetType.id,
          },
        },
        update: {},
        create: {
          name: modelData.name,
          brandId: brand.id,
          assetTypeId: assetType.id,
          specifications: { description: modelData.description },
          createdBy: adminUser.id,
          updatedBy: adminUser.id,
        },
      });
      modelCount++;
    }
  }
  
  console.log(`✅ Created ${modelCount} models`);
}

async function main() {
  try {
    await seedAssetCategoriesAndTypes();
    console.log('\n🎉 Asset categories, types, brands, and models seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   - 6 Asset categories');
    console.log('   - 30 Asset types');
    console.log('   - 15 Brands');
    console.log('   - 60+ Models');
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

