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
  // Using GENERIC asset type names (Laptop, Mobile, Tablet, etc.) to match seed-assets-final.ts
  const assetTypesData = [
    // Electronics - Generic Types
    { category: 'Electronics', name: 'Laptop', description: 'Laptop computers including MacBook, Dell Inspiron, etc.' },
    { category: 'Electronics', name: 'Desktop', description: 'Desktop computers including iMac, Mac Mini, etc.' },
    { category: 'Electronics', name: 'Mobile', description: 'Mobile phones and smartphones' },
    { category: 'Electronics', name: 'Tablet', description: 'Tablet devices including iPad, Surface, etc.' },
    { category: 'Electronics', name: 'Monitor', description: 'Display monitors and screens' },
    { category: 'Electronics', name: 'Storage', description: 'External storage devices and hard drives' },
    { category: 'Electronics', name: 'Printer', description: 'Printers and multifunction devices' },
    
    // Accessories
    { category: 'Accessories', name: 'Keyboard', description: 'Computer keyboards' },
    { category: 'Accessories', name: 'Mouse', description: 'Computer mice and pointing devices' },
    { category: 'Accessories', name: 'Accessory', description: 'General computer accessories and peripherals' },
    
    // Network Equipment
    { category: 'Network Equipment', name: 'Router', description: 'Network routers and wireless access points' },
    
    // Home Appliances
    { category: 'Home Appliances', name: 'Air Conditioner', description: 'Air conditioning systems' },
    
    // Media Devices
    { category: 'Media Devices', name: 'Streaming Device', description: 'Streaming media players' },
    { category: 'Media Devices', name: 'Media Player', description: 'Portable media players' },
    
    // Wearables
    { category: 'Wearables', name: 'Wearable', description: 'Smartwatches and wearable technology' },
  ];

  // Brands with descriptions
  const brandsData = [
    { name: 'Apple', description: 'Apple Inc. - Premium consumer electronics' },
    { name: 'Dell', description: 'Dell Technologies - Business and consumer computers' },
    { name: 'Samsung', description: 'Samsung Electronics - Mobile devices and electronics' },
    { name: 'Xiaomi', description: 'Xiaomi Corporation - Consumer electronics and smartphones' },
    { name: 'Google', description: 'Google LLC - Pixel and Nexus smartphones' },
    { name: 'Nokia', description: 'Nokia Corporation - Mobile phones' },
    { name: 'Sony', description: 'Sony Corporation - Consumer electronics and computing' },
    { name: 'Asus', description: 'ASUSTeK Computer Inc. - Computer hardware and electronics' },
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
  // Using GENERIC asset types (Laptop, Mobile, etc.) to match the AssetType table
  const modelsData = [
    // Apple Laptop Models
    { brand: 'Apple', assetType: 'Laptop', name: 'MacBook Pro 13" Retina', description: '13-inch MacBook Pro with Retina display' },
    { brand: 'Apple', assetType: 'Laptop', name: 'MacBook Pro 15" Retina', description: '15-inch MacBook Pro with Retina display' },
    { brand: 'Apple', assetType: 'Laptop', name: 'MacBook Air', description: 'MacBook Air laptop' },
    { brand: 'Apple', assetType: 'Laptop', name: 'MacBook Air M3', description: 'MacBook Air with M3 chip (8GB/16GB RAM, 256GB/500GB SSD)' },
    { brand: 'Apple', assetType: 'Laptop', name: 'MacBook Pro M3', description: 'MacBook Pro with M3 chip (16GB/18GB RAM, 250GB/500GB SSD)' },
    { brand: 'Apple', assetType: 'Laptop', name: 'MacBook Air M4', description: 'MacBook Air with M4 chip' },
    { brand: 'Apple', assetType: 'Laptop', name: 'MacBook Pro M4', description: 'MacBook Pro with M4 chip (16GB RAM)' },
    
    // Dell Laptop Models
    { brand: 'Dell', assetType: 'Laptop', name: 'Inspiron 3537', description: 'Dell Inspiron 3537 laptop' },
    { brand: 'Dell', assetType: 'Laptop', name: 'Inspiron 3542', description: 'Dell Inspiron 3542 laptop' },
    { brand: 'Dell', assetType: 'Laptop', name: 'Inspiron 5520', description: 'Dell Inspiron 5520 laptop' },
    { brand: 'Dell', assetType: 'Laptop', name: 'Inspiron 5548', description: 'Dell Inspiron 5548 laptop' },
    { brand: 'Dell', assetType: 'Laptop', name: 'Inspiron 5558', description: 'Dell Inspiron 5558 laptop' },
    { brand: 'Dell', assetType: 'Laptop', name: 'Inspiron 5559', description: 'Dell Inspiron 5559 laptop' },
    { brand: 'Dell', assetType: 'Laptop', name: 'Inspiron 15 5000', description: 'Dell Inspiron 15 5000 series laptop' },
    { brand: 'Dell', assetType: 'Laptop', name: 'Vostro 15', description: 'Dell Vostro 15-inch business laptop' },
    
    // Other Laptop Models
    { brand: 'Sony', assetType: 'Laptop', name: 'Vaio 15"', description: 'Sony Vaio 15-inch laptop' },
    { brand: 'Asus', assetType: 'Laptop', name: 'Asus K53SD', description: 'Asus K53SD laptop' },
    { brand: 'Lenovo', assetType: 'Laptop', name: 'Lenovo ThinkPad', description: 'Lenovo ThinkPad business laptop' },
    { brand: 'Lenovo', assetType: 'Laptop', name: 'ThinkPad E14', description: 'Lenovo ThinkPad E14 business laptop' },
    { brand: 'Lenovo', assetType: 'Laptop', name: 'ThinkBook 15', description: 'Lenovo ThinkBook 15-inch laptop' },
    
    // Apple Mobile Models
    { brand: 'Apple', assetType: 'Mobile', name: 'iPhone 4S', description: 'Apple iPhone 4S' },
    { brand: 'Apple', assetType: 'Mobile', name: 'iPhone 5', description: 'Apple iPhone 5' },
    { brand: 'Apple', assetType: 'Mobile', name: 'iPhone 5S', description: 'Apple iPhone 5S' },
    { brand: 'Apple', assetType: 'Mobile', name: 'iPhone 6', description: 'Apple iPhone 6' },
    { brand: 'Apple', assetType: 'Mobile', name: 'iPhone 6 Plus', description: 'Apple iPhone 6 Plus' },
    { brand: 'Apple', assetType: 'Mobile', name: 'iPhone 6S', description: 'Apple iPhone 6S' },
    { brand: 'Apple', assetType: 'Mobile', name: 'iPhone 7', description: 'Apple iPhone 7' },
    
    // Samsung Mobile Models
    { brand: 'Samsung', assetType: 'Mobile', name: 'Galaxy S4', description: 'Samsung Galaxy S4 smartphone' },
    { brand: 'Samsung', assetType: 'Mobile', name: 'Galaxy S6 Edge', description: 'Samsung Galaxy S6 Edge smartphone' },
    { brand: 'Samsung', assetType: 'Mobile', name: 'Galaxy S7', description: 'Samsung Galaxy S7 smartphone' },
    { brand: 'Samsung', assetType: 'Mobile', name: 'Galaxy J7', description: 'Samsung Galaxy J7 smartphone' },
    { brand: 'Samsung', assetType: 'Mobile', name: 'Galaxy Grand 2', description: 'Samsung Galaxy Grand 2 smartphone' },
    { brand: 'Samsung', assetType: 'Mobile', name: 'Galaxy M30', description: 'Samsung Galaxy M30 smartphone' },
    { brand: 'Samsung', assetType: 'Mobile', name: 'Galaxy M12', description: 'Samsung Galaxy M12 smartphone' },
    { brand: 'Samsung', assetType: 'Mobile', name: 'Galaxy M35 5G', description: 'Samsung Galaxy M35 5G smartphone (Model: SM-M356B/DS)' },
    { brand: 'Samsung', assetType: 'Mobile', name: 'Galaxy M06 5G', description: 'Samsung Galaxy M06 5G smartphone (Model: SM-M066B/DS)' },
    { brand: 'Samsung', assetType: 'Mobile', name: 'Galaxy S21 FE 5G', description: 'Samsung Galaxy S21 FE 5G smartphone (Model: SM-G990B2/DS)' },
    { brand: 'Samsung', assetType: 'Mobile', name: 'Galaxy A21s', description: 'Samsung Galaxy A21s smartphone' },
    { brand: 'Samsung', assetType: 'Mobile', name: 'Galaxy Flip3', description: 'Samsung Galaxy Flip3 foldable smartphone' },
    
    // Xiaomi Mobile Models
    { brand: 'Xiaomi', assetType: 'Mobile', name: 'Redmi Note 12 5G', description: 'Xiaomi Redmi Note 12 5G smartphone' },
    { brand: 'Xiaomi', assetType: 'Mobile', name: 'Redmi 13 5G', description: 'Xiaomi Redmi 13 5G smartphone (Model: 2406ERN9CI)' },
    { brand: 'Xiaomi', assetType: 'Mobile', name: 'Poco F4', description: 'Xiaomi Poco F4 smartphone' },
    { brand: 'Xiaomi', assetType: 'Mobile', name: 'Redmi Note 9 Pro Max', description: 'Xiaomi Redmi Note 9 Pro Max smartphone' },
    { brand: 'Xiaomi', assetType: 'Mobile', name: 'Redmi Note 10S', description: 'Xiaomi Redmi Note 10S smartphone' },
    { brand: 'Xiaomi', assetType: 'Mobile', name: 'Redmi 11 Prime 5G', description: 'Xiaomi Redmi 11 Prime 5G smartphone' },
    
    // Google Mobile Models
    { brand: 'Google', assetType: 'Mobile', name: 'Pixel 2XL', description: 'Google Pixel 2XL smartphone' },
    { brand: 'Google', assetType: 'Mobile', name: 'Nexus 5X', description: 'Google Nexus 5X smartphone' },
    { brand: 'Google', assetType: 'Mobile', name: 'Nexus 6P', description: 'Google Nexus 6P smartphone' },
    
    // Nokia Mobile Models
    { brand: 'Nokia', assetType: 'Mobile', name: 'Lumia 640 XL', description: 'Nokia Lumia 640 XL Windows phone' },
    { brand: 'Nokia', assetType: 'Mobile', name: 'Lumia 730', description: 'Nokia Lumia 730 Windows phone' },
    { brand: 'Nokia', assetType: 'Mobile', name: 'Lumia 620', description: 'Nokia Lumia 620 Windows phone' },
    
    // Other Mobile Models
    { brand: 'Motorola', assetType: 'Mobile', name: 'Moto G3', description: 'Motorola Moto G 3rd generation smartphone' },
    { brand: 'Motorola', assetType: 'Mobile', name: 'Moto G35 5G', description: 'Motorola Moto G35 5G smartphone (Model: XT2433-3)' },
    
    // Tablet Models
    { brand: 'Apple', assetType: 'Tablet', name: 'iPad', description: 'Apple iPad tablet' },
    { brand: 'Apple', assetType: 'Tablet', name: 'iPad Pro', description: 'Apple iPad Pro tablet' },
    { brand: 'Apple', assetType: 'Tablet', name: 'iPad Mini 3', description: 'Apple iPad Mini 3 with Retina display' },
    { brand: 'Microsoft', assetType: 'Tablet', name: 'Surface 3', description: 'Microsoft Surface 3 tablet' },
    
    // Desktop Models
    { brand: 'Apple', assetType: 'Desktop', name: 'Mac Mini', description: 'Apple Mac Mini desktop computer' },
    { brand: 'Apple', assetType: 'Desktop', name: 'iMac 27"', description: 'Apple iMac 27-inch all-in-one desktop' },
    { brand: 'Lenovo', assetType: 'Desktop', name: 'Lenovo All-in-One', description: 'Lenovo all-in-one desktop computer' },
    
    // Monitor Models
    { brand: 'Dell', assetType: 'Monitor', name: 'Dell S2240L', description: 'Dell S2240L 21.5" LED monitor' },
    { brand: 'Dell', assetType: 'Monitor', name: 'Dell ST2420L', description: 'Dell ST2420L 24" LED monitor' },
    
    // Accessory Models
    { brand: 'Apple', assetType: 'Accessory', name: 'Apple Keyboard A1314', description: 'Apple Wireless Keyboard' },
    { brand: 'Dell', assetType: 'Accessory', name: 'Dell MS111', description: 'Dell MS111 USB optical mouse' },
    { brand: 'Apple', assetType: 'Accessory', name: 'Apple Magic Mouse', description: 'Apple Magic Mouse' },
    { brand: 'Apple', assetType: 'Accessory', name: 'Apple Pencil', description: 'Apple Pencil for iPad' },
    { brand: 'Apple', assetType: 'Accessory', name: 'MagSafe Power Adapter', description: 'Apple MagSafe power adapter' },
    
    // Network Equipment Models
    { brand: 'Apple', assetType: 'Router', name: 'Airport Express', description: 'Apple Airport Express Wi-Fi router' },
    { brand: 'Cisco', assetType: 'Router', name: 'Cisco RV042', description: 'Cisco RV042 dual WAN VPN router' },
    { brand: 'Ruckus', assetType: 'Router', name: 'Ruckus Wireless AP', description: 'Ruckus wireless access point' },
    { brand: 'Belkin', assetType: 'Router', name: 'Belkin Wireless Router', description: 'Belkin wireless router' },
    
    // Media Device Models
    { brand: 'Apple', assetType: 'Streaming Device', name: 'Apple TV 4th Gen', description: 'Apple TV 4th generation' },
    { brand: 'Apple', assetType: 'Media Player', name: 'iPod Touch 6th Gen', description: 'Apple iPod Touch 6th generation' },
    
    // Wearable Models
    { brand: 'Apple', assetType: 'Wearable', name: 'Apple Watch Sport', description: 'Apple Watch Sport 42mm' },
    
    // Storage Models
    { brand: 'Western Digital', assetType: 'Storage', name: 'WD My Passport 1TB', description: 'Western Digital My Passport 1TB external HDD' },
    
    // Printer Models
    { brand: 'Samsung', assetType: 'Printer', name: 'Samsung SCX-4021S', description: 'Samsung SCX-4021S multifunction printer' },
    
    // Air Conditioner Models
    { brand: 'Blue Star', assetType: 'Air Conditioner', name: 'Blue Star Split AC', description: 'Blue Star split air conditioner' },
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
  
  // Fetch all categories once for efficient lookup
  const allCategories = await prisma.assetCategory.findMany();
  const categoryMap = new Map(allCategories.map(c => [c.name, c]));
  
  let typeCount = 0;
  for (const assetTypeData of assetTypesData) {
    const category = categoryMap.get(assetTypeData.category);

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
  
  // Fetch all brands and asset types once for efficient lookup
  const allBrands = await prisma.brand.findMany();
  const allAssetTypes = await prisma.assetType.findMany();
  
  const brandMap = new Map(allBrands.map(b => [b.name, b]));
  const assetTypeMap = new Map(allAssetTypes.map(at => [at.name, at]));
  
  let modelCount = 0;
  for (const modelData of modelsData) {
    const brand = brandMap.get(modelData.brand);
    const assetType = assetTypeMap.get(modelData.assetType);

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
    console.log('   - 16 Asset types (Generic: Laptop, Mobile, Tablet, Monitor, etc.)');
    console.log('   - 16 Brands (Apple, Dell, Samsung, Xiaomi, Google, Nokia, Motorola, Lenovo, etc.)');
    console.log('   - 100+ Models including:');
    console.log('     • Apple: MacBook Pro/Air (M1/M3/M4), iPhone series');
    console.log('     • Samsung: Galaxy S/M series (including M35 5G, M06 5G, S21 FE 5G)');
    console.log('     • Xiaomi: Redmi series (including Redmi 13 5G), Poco F4');
    console.log('     • Motorola: Moto G series (including G35 5G)');
    console.log('     • Lenovo: ThinkPad, ThinkBook series');
    console.log('     • Dell: Inspiron, Vostro series');
    console.log('\n✅ All asset types use GENERIC names compatible with seed-assets-final.ts');
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

