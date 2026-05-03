/**
 * UPDATED APRIL 2026 SEED FILE
 *
 * Single self-contained seed file based on:
 *   "Copy of Updated Active Employees Asset Report 20th April 2026.xlsx - Emp Data.csv"
 *
 * This file:
 *   1. Cleans all existing data and creates admin user
 *   2. Seeds categories, asset types, brands, models (only those present in the CSV)
 *   3. Seeds employees from the CSV
 *   4. Seeds assets from the CSV
 *   5. Creates asset assignments (issues + events + status updates)
 *
 * Run from project root:
 *   npx ts-node prisma/seeds/updated-april-2026/seed-updated-april-2026.ts
 */

import {
  PrismaClient,
  Prisma,
  EmployeeStatus,
  AssetStatus,
  AssetCondition,
  AssetEventType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function pad(num: number, size: number): string {
  let s = String(num);
  while (s.length < size) s = '0' + s;
  return s;
}

// ─── STEP 1: CLEAN DB & CREATE ADMIN ────────────────────────────────────────

async function cleanAndCreateAdmin(): Promise<number> {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  STEP 1: Clean Database & Create Admin');
  console.log('═══════════════════════════════════════════════════\n');

  console.log('Cleaning database...');
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      notifications,
      refresh_sessions,
      blacklisted_tokens,
      password_resets,
      asset_events,
      maintenance_schedules,
      asset_issues,
      assets,
      models,
      brands,
      asset_types,
      asset_categories,
      user_roles,
      vendors,
      roles,
      users,
      employees
    RESTART IDENTITY CASCADE;
  `);
  console.log('Database cleaned.\n');

  const passwordHash = await bcrypt.hash('Admin@123', 10);

  const adminUserId = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`ALTER TABLE employees ALTER COLUMN created_by DROP NOT NULL`);
    await tx.$executeRawUnsafe(`ALTER TABLE employees ALTER COLUMN updated_by DROP NOT NULL`);
    await tx.$executeRawUnsafe(`ALTER TABLE users ALTER COLUMN created_by DROP NOT NULL`);
    await tx.$executeRawUnsafe(`ALTER TABLE users ALTER COLUMN updated_by DROP NOT NULL`);

    await tx.$executeRawUnsafe(`
      INSERT INTO employees (employee_id, first_name, last_name, email, phone, date_of_birth, address, status)
      VALUES ('9999', 'System', 'Administrator', 'admin@pebble-asset-tracker.com', '+91 9999999999', '1990-01-01', 'System', 'ACTIVE')
    `);
    const adminEmployee = await tx.employee.findUnique({ where: { employeeId: '9999' } });
    if (!adminEmployee) throw new Error('Failed to create admin employee');

    await tx.$executeRawUnsafe(`
      INSERT INTO users (employee_id, username, password_hash, roles, is_active)
      VALUES (${adminEmployee.id}, 'admin', '${passwordHash}', ARRAY['ADMIN']::text[], true)
    `);
    const adminUser = await tx.user.findUnique({ where: { username: 'admin' } });
    if (!adminUser) throw new Error('Failed to create admin user');

    await tx.$executeRawUnsafe(`
      INSERT INTO roles (role_name, is_active) VALUES ('ADMIN', true)
    `);
    const adminRole = await tx.role.findUnique({ where: { roleName: 'ADMIN' } });
    if (!adminRole) throw new Error('Failed to create admin role');

    await tx.$executeRawUnsafe(
      `UPDATE employees SET created_by = ${adminUser.id}, updated_by = ${adminUser.id} WHERE id = ${adminEmployee.id}`,
    );
    await tx.$executeRawUnsafe(
      `UPDATE users SET created_by = ${adminUser.id}, updated_by = ${adminUser.id} WHERE id = ${adminUser.id}`,
    );

    await tx.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: adminRole.id,
        assignedBy: adminUser.id,
        isActive: true,
      },
    });

    return adminUser.id;
  });

  console.log('Admin user created (username: admin, password: Admin@123)');
  return adminUserId;
}

// ─── STEP 2: CATEGORIES, ASSET TYPES, BRANDS, MODELS ────────────────────────

const categories: Record<string, string> = {
  Electronics: 'Electronic devices including laptops, desktops, tablets, and mobile phones',
};

// Specification dropdown option lists shared by Laptop and Mobile templates.
// Picked up by the AssetForm "Specification Builder" UI so when a user selects
// Laptop/Mobile while adding an asset, RAM / Processor / MAC Address fields
// appear automatically with the dropdown values below.
const RAM_OPTIONS_LAPTOP = ['4 GB', '8 GB', '12 GB', '16 GB', '24 GB', '32 GB', '64 GB'];
const RAM_OPTIONS_MOBILE = ['2 GB', '3 GB', '4 GB', '6 GB', '8 GB', '12 GB', '16 GB'];
const PROCESSOR_OPTIONS_LAPTOP = [
  // Apple Silicon
  'Apple M1', 'Apple M1 Pro', 'Apple M1 Max',
  'Apple M2', 'Apple M2 Pro', 'Apple M2 Max',
  'Apple M3', 'Apple M3 Pro', 'Apple M3 Max',
  'Apple M4', 'Apple M4 Pro', 'Apple M4 Max',
  // Intel
  'Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'Intel Core i9',
  'Intel Core Ultra 5', 'Intel Core Ultra 7', 'Intel Core Ultra 9',
  // AMD
  'AMD Ryzen 3', 'AMD Ryzen 5', 'AMD Ryzen 7', 'AMD Ryzen 9',
];
const PROCESSOR_OPTIONS_MOBILE = [
  // Apple
  'Apple A14 Bionic', 'Apple A15 Bionic', 'Apple A16 Bionic',
  'Apple A17 Pro', 'Apple A18', 'Apple A18 Pro',
  // Qualcomm Snapdragon
  'Snapdragon 7 Gen 3', 'Snapdragon 8 Gen 2', 'Snapdragon 8 Gen 3', 'Snapdragon 8 Elite',
  // MediaTek
  'MediaTek Dimensity 7300', 'MediaTek Dimensity 8300', 'MediaTek Dimensity 9300',
  // Samsung Exynos
  'Exynos 1380', 'Exynos 2400',
  // Google Tensor
  'Google Tensor G3', 'Google Tensor G4',
];

type SpecOption = { value: string; deprecated?: boolean };
type SpecField = {
  key?: string;
  label: string;
  required?: boolean;
  type?: string;
  options?: SpecOption[];
};
type SpecTemplate = { version: number; fields: SpecField[] };

const toOptions = (values: string[]): SpecOption[] => values.map((value) => ({ value }));

const LAPTOP_SPEC_TEMPLATE: SpecTemplate = {
  version: 1,
  fields: [
    {
      key: 'ram',
      label: 'RAM',
      required: true,
      type: 'dropdown',
      options: toOptions(RAM_OPTIONS_LAPTOP),
    },
    {
      key: 'processor',
      label: 'Processor',
      required: true,
      type: 'dropdown',
      options: toOptions(PROCESSOR_OPTIONS_LAPTOP),
    },
    {
      key: 'macAddress',
      label: 'MAC Address',
      required: false,
      type: 'text',
    },
  ],
};

const MOBILE_SPEC_TEMPLATE: SpecTemplate = {
  version: 1,
  fields: [
    {
      key: 'ram',
      label: 'RAM',
      required: true,
      type: 'dropdown',
      options: toOptions(RAM_OPTIONS_MOBILE),
    },
    {
      key: 'processor',
      label: 'Processor',
      required: true,
      type: 'dropdown',
      options: toOptions(PROCESSOR_OPTIONS_MOBILE),
    },
  ],
};

const assetTypesData: Array<{
  category: string;
  name: string;
  description: string;
  specificationTemplate?: SpecTemplate;
}> = [
  {
    category: 'Electronics',
    name: 'Laptop',
    description: 'Laptop computers',
    specificationTemplate: LAPTOP_SPEC_TEMPLATE,
  },
  {
    category: 'Electronics',
    name: 'Mobile',
    description: 'Mobile phones and smartphones',
    specificationTemplate: MOBILE_SPEC_TEMPLATE,
  },
  { category: 'Electronics', name: 'Tablet', description: 'Tablet devices' },
  { category: 'Electronics', name: 'Monitor', description: 'Display monitors and screens' },
];

const brandsData = [
  { name: 'Apple', description: 'Apple Inc.' },
  { name: 'Lenovo', description: 'Lenovo Group' },
  { name: 'Samsung', description: 'Samsung Electronics' },
  { name: 'Xiaomi', description: 'Xiaomi Corporation' },
];

const modelsData = [
  // Apple Laptops
  { brand: 'Apple', assetType: 'Laptop', name: 'MacBook Air' },
  { brand: 'Apple', assetType: 'Laptop', name: 'MacBook Pro' },

  // Lenovo Laptops
  { brand: 'Lenovo', assetType: 'Laptop', name: 'ThinkPad' },
  { brand: 'Lenovo', assetType: 'Laptop', name: 'ThinkBook' },
  { brand: 'Lenovo', assetType: 'Laptop', name: 'ThinkBook 14' },
  { brand: 'Lenovo', assetType: 'Laptop', name: 'ThinkBook 15' },
  { brand: 'Lenovo', assetType: 'Laptop', name: 'ThinkBook 15 G2 IT' },
  { brand: 'Lenovo', assetType: 'Laptop', name: 'ThinkBook 14 G2 ITL' },
  { brand: 'Lenovo', assetType: 'Laptop', name: 'Lenovo Ultra 7' },
  { brand: 'Lenovo', assetType: 'Laptop', name: '20LTS0MA00' },
  { brand: 'Lenovo', assetType: 'Laptop', name: '21G2S0D000' },
  { brand: 'Lenovo', assetType: 'Laptop', name: '20VE' },

  // Apple Mobiles
  { brand: 'Apple', assetType: 'Mobile', name: 'iPhone X' },
  { brand: 'Apple', assetType: 'Mobile', name: 'iPhone XR' },
  { brand: 'Apple', assetType: 'Mobile', name: 'iPhone 8' },
  { brand: 'Apple', assetType: 'Mobile', name: 'iPhone 11' },
  { brand: 'Apple', assetType: 'Mobile', name: 'iPhone 13' },
  { brand: 'Apple', assetType: 'Mobile', name: 'iPhone 13 Mini' },
  { brand: 'Apple', assetType: 'Mobile', name: 'iPhone 17 Pro Max' },

  // Samsung Mobiles
  { brand: 'Samsung', assetType: 'Mobile', name: 'Samsung Galaxy M06' },
  { brand: 'Samsung', assetType: 'Mobile', name: 'Samsung Galaxy S21 FE 5G' },
  { brand: 'Samsung', assetType: 'Mobile', name: 'Samsung Galaxy Z Fold 4' },
  { brand: 'Samsung', assetType: 'Mobile', name: 'Samsung Galaxy Zflip 3 5G' },
  { brand: 'Samsung', assetType: 'Mobile', name: 'Samsung Galaxy A14 5G' },
  { brand: 'Samsung', assetType: 'Mobile', name: 'Samsung M12' },

  // Xiaomi Mobiles
  { brand: 'Xiaomi', assetType: 'Mobile', name: 'Redmi Note 9 Pro Max' },
  { brand: 'Xiaomi', assetType: 'Mobile', name: 'Redmi 11' },
];

async function seedAssetStructure(adminUserId: number) {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  STEP 2: Asset Structure (Categories, Types, Brands, Models)');
  console.log('═══════════════════════════════════════════════════\n');

  for (const [name, description] of Object.entries(categories)) {
    await prisma.assetCategory.upsert({
      where: { name },
      update: {},
      create: { name, description, createdBy: adminUserId, updatedBy: adminUserId },
    });
  }
  console.log(`Created ${Object.keys(categories).length} categories`);

  const allCategories = await prisma.assetCategory.findMany();
  const categoryMap = new Map(allCategories.map((c) => [c.name, c]));

  for (const at of assetTypesData) {
    const cat = categoryMap.get(at.category);
    if (!cat) continue;
    await prisma.assetType.upsert({
      where: { name_categoryId: { name: at.name, categoryId: cat.id } },
      update: {
        description: at.description,
        specificationTemplate: at.specificationTemplate
          ? (at.specificationTemplate as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        updatedBy: adminUserId,
      },
      create: {
        name: at.name,
        description: at.description,
        categoryId: cat.id,
        isActive: true,
        specificationTemplate: at.specificationTemplate
          ? (at.specificationTemplate as unknown as Prisma.InputJsonValue)
          : undefined,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
    });
  }
  console.log(`Created ${assetTypesData.length} asset types`);

  for (const b of brandsData) {
    await prisma.brand.upsert({
      where: { name: b.name },
      update: {},
      create: { name: b.name, description: b.description, createdBy: adminUserId, updatedBy: adminUserId },
    });
  }
  console.log(`Created ${brandsData.length} brands`);

  const allBrands = await prisma.brand.findMany();
  const allAssetTypes = await prisma.assetType.findMany();
  const brandMap = new Map(allBrands.map((b) => [b.name, b]));
  const assetTypeMap = new Map(allAssetTypes.map((at) => [at.name, at]));

  for (const m of modelsData) {
    const brand = brandMap.get(m.brand);
    const assetType = assetTypeMap.get(m.assetType);
    if (!brand || !assetType) continue;
    await prisma.model.upsert({
      where: { name_brandId_assetTypeId: { name: m.name, brandId: brand.id, assetTypeId: assetType.id } },
      update: {},
      create: {
        name: m.name,
        brandId: brand.id,
        assetTypeId: assetType.id,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
    });
  }
  console.log(`Created ${modelsData.length} models`);
}

// ─── STEP 3: EMPLOYEES ──────────────────────────────────────────────────────

interface EmployeeRecord {
  staffId: number;
  name: string;
  email: string;
}

const employees: EmployeeRecord[] = [
  { staffId: 26, name: 'Ashish Bhargava', email: 'ashish.bhargava@mindstix.com' },
  { staffId: 67, name: 'Akash Salunkhe', email: 'akash.salunkhe@mindstix.com' },
  { staffId: 72, name: 'Varsha Mane', email: 'varsha.mane@mindstix.com' },
  { staffId: 89, name: 'Urmi Chawda', email: 'urmi.chawda@mindstix.com' },
  { staffId: 134, name: 'Yashvant Revandkar', email: 'yashvant.revandkar@mindstix.com' },
  { staffId: 177, name: 'Hitesh Wagh', email: 'hitesh.wagh@mindstix.com' },
  { staffId: 178, name: 'Asim Shah', email: 'asim.shah@mindstix.com' },
  { staffId: 182, name: 'Ranjan Verma', email: 'ranjan.verma@mindstix.com' },
  { staffId: 183, name: 'Sangram Jagtap', email: 'sangram.jagtap@mindstix.com' },
  { staffId: 185, name: 'Sherin Varghese', email: 'sherin.varghese@mindstix.com' },
  { staffId: 197, name: 'Niharika Katare', email: 'niharika.katare@mindstix.com' },
  { staffId: 216, name: 'Rahul Thakor', email: 'rahul.thakor@mindstix.com' },
  { staffId: 242, name: 'Pranay Raut', email: 'pranay.raut@mindstix.com' },
  { staffId: 254, name: 'Deepika Vinchurkar', email: 'deepika.vinchurkar@mindstix.com' },
  { staffId: 260, name: 'Abhishek Kumar Rohan', email: 'abhishek.kumar@mindstix.com' },
  { staffId: 283, name: 'Suruchi Garg', email: 'suruchi.garg@mindstix.com' },
  { staffId: 311, name: 'Shubham Marulkar', email: 'shubham.marulkar@mindstix.com' },
  { staffId: 315, name: 'Prajyot Kondekar', email: 'prajyot.kondekar@mindstix.com' },
  { staffId: 328, name: 'Pramod Konda', email: 'pramod.konda@mindstix.com' },
  { staffId: 332, name: 'Suraj Yadav', email: 'suraj.yadav@mindstix.com' },
  { staffId: 337, name: 'Kaivalya Bhale', email: 'kaivalya.bhale@mindstix.com' },
  { staffId: 338, name: 'Himanshu Advani', email: 'himanshu.advani@mindstix.com' },
  { staffId: 346, name: 'Abhishek Khutwad', email: 'abhishek.khutwad@mindstix.com' },
  { staffId: 349, name: 'Pratiksha Wagh', email: 'pratiksha.wagh@mindstix.com' },
  { staffId: 356, name: 'Abhijeet Kokane', email: 'abhijeet.kokane@mindstix.com' },
  { staffId: 357, name: 'Aditya Potdar', email: 'aditya.potdar@mindstix.com' },
  { staffId: 379, name: 'Jay Gandhi', email: 'jay.gandhi@mindstix.com' },
  { staffId: 386, name: 'Shubham Hadake', email: 'shubham.hadake@mindstix.com' },
  { staffId: 388, name: 'Ashwini Shinde', email: 'ashwini.shinde@mindstix.com' },
  { staffId: 389, name: 'Prathamesh Nagargoje', email: 'prathamesh.nagargoje@mindstix.com' },
  { staffId: 399, name: 'Saima Ansari', email: 'saima.ansari@mindstix.com' },
  { staffId: 408, name: 'Tanuj Abraham', email: 'tanuj.abraham@mindstix.com' },
  { staffId: 414, name: 'Arushi Kothari', email: 'arushi.kothari@mindstix.com' },
  { staffId: 419, name: 'Suyash Ukidve', email: 'suyash.ukidve@mindstix.com' },
  { staffId: 427, name: 'Mohan Mohadikar', email: 'mohan.mohadikar@mindstix.com' },
  { staffId: 434, name: 'Rohit Chauhan', email: 'rohit.chauhan@mindstix.com' },
  { staffId: 460, name: 'Pradip Phadatare', email: 'pradip.phadatare@mindstix.com' },
  { staffId: 464, name: 'Amruta Kulkarni', email: 'amruta.kulkarni@mindstix.com' },
  { staffId: 476, name: 'Vishal Pawar', email: 'vishal.pawar@mindstix.com' },
  { staffId: 506, name: 'Aditi Goyal', email: 'aditi.goyal@mindstix.com' },
  { staffId: 511, name: 'Panini Prabhukhanolkar', email: 'panini.prabhukhanolkar@mindstix.com' },
  { staffId: 522, name: 'Rahul Jadav', email: 'rahul.jadav@mindstix.com' },
  { staffId: 537, name: 'Anitha Bapna', email: 'anitha.bapna@mindstix.com' },
  { staffId: 545, name: 'Apoorv Gupta', email: 'apoorv.gupta@mindstix.com' },
  { staffId: 546, name: 'Anshul Amol Rokde', email: 'anshul.rokde@mindstix.com' },
  { staffId: 560, name: 'Pranav Hadawale', email: 'pranav.hadawale@mindstix.com' },
  { staffId: 561, name: 'Ashwini Kote', email: 'ashwini.kote@mindstix.com' },
  { staffId: 563, name: 'Chirag Shah', email: 'chirag.shah@mindstix.com' },
  { staffId: 576, name: 'Abhijeet Rahul Dhawale', email: 'abhijeet.dhawale@mindstix.com' },
  { staffId: 577, name: 'Amogasiddha Vitthal Chougule', email: 'amogasiddha.chougule@mindstix.com' },
  { staffId: 580, name: 'Swati Rayatuwar', email: 'swati.rayatuwar@mindstix.com' },
  { staffId: 582, name: 'Pranjalee Gadle', email: 'pranjalee.gadle@mindstix.com' },
  { staffId: 589, name: 'Abdul Khan', email: 'abdul.khan@mindstix.com' },
  { staffId: 599, name: 'Jayesh Dhanraj Jadhav', email: 'jayesh.jadhav@mindstix.com' },
  { staffId: 601, name: 'Vivek Sarjal', email: 'vivek.sarjal@mindstix.com' },
  { staffId: 603, name: 'Jitesh Chandrakant Dhumal', email: 'jitesh.dhumal@mindstix.com' },
  { staffId: 611, name: 'Neeraj Mahapatra', email: 'neeraj.mahapatra@mindstix.com' },
  { staffId: 615, name: 'Anirudha Kishor Welukar', email: 'anirudha.welukar@mindstix.com' },
  { staffId: 620, name: 'Amruta Joshi', email: 'amruta.joshi@mindstix.com' },
  { staffId: 626, name: 'Hitanshu Ramesh Machhi', email: 'hitanshu.machhi@mindstix.com' },
  { staffId: 629, name: 'Rahul Madan', email: 'rahul.madan@mindstix.com' },
  { staffId: 632, name: 'Shubham Khetre', email: 'shubham.khetre@mindstix.com' },
  { staffId: 644, name: 'Bhavana Mishra', email: 'bhavana.mishra@mindstix.com' },
  { staffId: 646, name: 'Abhaya Shahare', email: 'abhaya.shahare@mindstix.com' },
  { staffId: 649, name: 'Kartik Mohan Dabre', email: 'kartik.dabre@mindstix.com' },
  { staffId: 658, name: 'Vivek Dinesh Patel', email: 'vivek.patel@mindstix.com' },
  { staffId: 661, name: 'Abhishek Pradeep More', email: 'abhishek.more@mindstix.com' },
  { staffId: 663, name: 'Sameer Abhay Pardeshi', email: 'sameer.pardeshi@mindstix.com' },
  { staffId: 664, name: 'Badal Chaganlal Oza', email: 'badal.oza@mindstix.com' },
  { staffId: 675, name: 'Parth Kapadia', email: 'parth.kapadia@mindstix.com' },
  { staffId: 678, name: 'Deeplaxmi Patil', email: 'deeplaxmi.patil@mindstix.com' },
  { staffId: 679, name: 'Suraj Moon', email: 'suraj.moon@mindstix.com' },
  { staffId: 682, name: 'Kanika Rawal', email: 'kanika.rawal@mindstix.com' },
  { staffId: 683, name: 'Tushar Sharad Tomar', email: 'tushar.tomar@mindstix.com' },
  { staffId: 684, name: 'Alhaj Siddiqui', email: 'alhaj.siddiqui@mindstix.com' },
  { staffId: 687, name: 'Pranit Shirsath', email: 'pranit.shirsath@mindstix.com' },
  { staffId: 689, name: 'Anuja Deshpande', email: 'anuja.deshpande@mindstix.com' },
  { staffId: 692, name: 'Aditya Jadhav', email: 'aditya.jadhav@mindstix.com' },
  { staffId: 693, name: 'Dev Jindal', email: 'dev.jindal@mindstix.com' },
  { staffId: 696, name: 'Kartikey Singh', email: 'kartikey.singh@mindstix.com' },
  { staffId: 697, name: 'Sanket More', email: 'sanket.more@mindstix.com' },
  { staffId: 698, name: 'Vedant Sanjay Shejwal', email: 'vedant.shejwal@mindstix.com' },
  { staffId: 700, name: 'Geet Salame', email: 'geet.salame@mindstix.com' },
  { staffId: 701, name: 'Diya Kantilal Dhumal', email: 'diya.dhumal@mindstix.com' },
  { staffId: 703, name: 'Tejas Kohade', email: 'tejas.kohade@mindstix.com' },
  { staffId: 704, name: 'Atharva Ravikiran Dhoble', email: 'atharva.dhoble@mindstix.com' },
  { staffId: 707, name: 'Pranav More', email: 'pranav.more@mindstix.com' },
  { staffId: 708, name: 'Neeraj Chavan', email: 'neeraj.chavan@mindstix.com' },
  { staffId: 709, name: 'Yash Yadav', email: 'yash.yadav@mindstix.com' },
  { staffId: 711, name: 'Yash Shah', email: 'yash.shah@mindstix.com' },
  { staffId: 712, name: 'Himanshu Singh', email: 'himanshu.singh@mindstix.com' },
  { staffId: 713, name: 'Raghini Trivedi', email: 'raghini.trivedi@mindstix.com' },
  { staffId: 715, name: 'Roshan Jadhav', email: 'roshan.jadhav@mindstix.com' },
  { staffId: 716, name: 'Kartik Vora', email: 'kartik.vora@mindstix.com' },
  { staffId: 718, name: 'Shrey Nahar', email: 'shrey.nahar@mindstix.com' },
  { staffId: 719, name: 'Aakanksha Bhaltadak', email: 'aakanksha.bhaltadak@mindstix.com' },
  { staffId: 721, name: 'Varun Jaiswal', email: 'varun.jaiswal@mindstix.com' },
  { staffId: 722, name: 'Ruchita Chavan', email: 'ruchita.chavan@mindstix.com' },
  { staffId: 724, name: 'Bhavay Sehgal', email: 'bhavay.sehgal@mindstix.com' },
  { staffId: 725, name: 'Vaishnavi Bhujbal', email: 'vaishnavi.bhujbal@mindstix.com' },
  { staffId: 728, name: 'Madhu Harsha', email: 'madhu.harsha@mindstix.com' },
  { staffId: 730, name: 'Shreyash Adlinge', email: 'shreyash.adlinge@mindstix.com' },
  { staffId: 731, name: 'Sandeep Vishwakarma', email: 'sandeep.vishwakarma@mindstix.com' },
  { staffId: 732, name: 'Samarth Kanchan', email: 'samarth.kanchan@mindstix.com' },
  { staffId: 733, name: 'Rugvedi Ghule', email: 'rugvedi.ghule@mindstix.com' },
  { staffId: 737, name: 'Tanisha Agrawal', email: 'tanisha.agrawal@mindstix.com' },
  { staffId: 738, name: 'Ashish Sitaram Chakkar', email: 'ashish.chakkar@mindstix.com' },
  { staffId: 741, name: 'Shravani Tammewar', email: 'shravani.tammewar@mindstix.com' },
  { staffId: 742, name: 'Sarina Khatri', email: 'sarina.khatri@mindstix.com' },
  { staffId: 743, name: 'Palak Gupta', email: 'palak.gupta@mindstix.com' },
  { staffId: 744, name: 'Mayur Tingare', email: 'mayur.tingare@mindstix.com' },
  { staffId: 745, name: 'Tanishq Chavan', email: 'tanishq.chavan@mindstix.com' },
  { staffId: 746, name: 'Omkar Salunke', email: 'omkar.salunkhe@mindstix.com' },
  { staffId: 748, name: 'Palash Jamaiwar', email: 'palash.jamaiwar@mindstix.com' },
  { staffId: 749, name: 'Harshesh Pote', email: 'harshesh.pote@mindstix.com' },
  { staffId: 750, name: 'Anurag Kadu', email: 'anurag.kadu@mindstix.com' },
  { staffId: 752, name: 'Chiraag Pandey', email: 'chiraag.pandey@mindstix.com' },
  { staffId: 753, name: 'Apurva Kamshetty', email: 'apurva.kamshetty@mindstix.com' },
  { staffId: 757, name: 'Abhijit Pachpande', email: 'abhijit.pachpande@mindstix.com' },
  { staffId: 758, name: 'Harsh Kushwah', email: 'harsh.kushwah@mindstix.com' },
  { staffId: 759, name: 'Mugdha Jiwane', email: 'mugdha.jiwane@mindstix.com' },
  { staffId: 760, name: 'Bhagyashree Thakur', email: 'bhagyashree.thakur@mindstix.com' },
  { staffId: 761, name: 'Reshma Reddy', email: 'reshma.reddy@mindstix.com' },
  { staffId: 765, name: 'Rohit Owal', email: 'rohit.owal@mindstix.com' },
  { staffId: 767, name: 'Amitraj Jambure', email: 'amitraj.jambure@mindstix.com' },
  { staffId: 770, name: 'Mangesh Metkar', email: 'mangesh.metkar@mindstix.com' },
  { staffId: 771, name: 'Prasoon Mangal', email: 'prasoon.mangal@mindstix.com' },
  { staffId: 773, name: 'Harsh Raj', email: 'harsh.raj@mindstix.com' },
  { staffId: 774, name: 'Aroonay Anand', email: 'aroonay.anand@mindstix.com' },
  { staffId: 777, name: 'Ayush Kotwalla', email: 'ayush.kotwalla@mindstix.com' },
  { staffId: 778, name: 'Vishal Sadawarte', email: 'vishal.sadawarte@mindstix.com' },
  { staffId: 779, name: 'Sharan Shetty', email: 'sharan.shetty@mindstix.com' },
  { staffId: 780, name: 'Priyans Singh', email: 'priyans.singh@mindstix.com' },
  { staffId: 782, name: 'Adarsh Shrivastava', email: 'adarsh.shrivastava@mindstix.com' },
  { staffId: 784, name: 'Prajwal Nivangune', email: 'prajwal.nivangune@mindstix.com' },
  { staffId: 785, name: 'Siddhi Algude', email: 'siddhi.algude@mindstix.com' },
  { staffId: 786, name: 'Aamaan Sharma', email: 'aamaan.sharma@mindstix.com' },
  { staffId: 787, name: 'Vedant Gadekar', email: 'vedant.gadekar@mindstix.com' },
  { staffId: 788, name: 'Prathamesh Thorat', email: 'prathamesh.thorat@mindstix.com' },
  { staffId: 789, name: 'Atharva Prabhune', email: 'atharva.prabhune@mindstix.com' },
  { staffId: 790, name: 'Kaustubh Sharma', email: 'kaustubh.sharma@mindstix.com' },
  { staffId: 792, name: 'Omkar Raje', email: 'omkar.raje@mindstix.com' },
  { staffId: 793, name: 'Rashi Agarwal', email: 'rashi.agarwal@mindstix.com' },
  { staffId: 794, name: 'Kratika Sharma', email: 'kratika.sharma@mindstix.com' },
  { staffId: 796, name: 'Vaibhavi Wadje', email: 'vaibhavi.wadje@mindstix.com' },
  { staffId: 797, name: 'Deepak Kumar', email: 'deepak.kumar@mindstix.com' },
  { staffId: 799, name: 'Akshata Shirke', email: 'akshata.shirke@mindstix.com' },
  { staffId: 800, name: 'Rahul Mishra', email: 'rahul.mishra@mindstix.com' },
  { staffId: 801, name: 'Rakhi Khairnar', email: 'rakhi.khairnar@mindstix.com' },
  { staffId: 802, name: 'Sakshi Jaiswal', email: 'sakshi.jaiswal@mindstix.com' },
  { staffId: 803, name: 'Chaitraly Bhagyawant', email: 'chaitraly.bhagyawant@mindstix.com' },
  { staffId: 804, name: 'Sehar Sharma', email: 'sehar.sharma@mindstix.com' },
  { staffId: 806, name: 'Piyush Prakash Kundalkar', email: 'piyush.kundalkar@mindstix.com' },
  { staffId: 807, name: 'Ayman Ashfaq Ahmed Parkar', email: 'ayman.parkar@mindstix.com' },
  { staffId: 808, name: 'Karishma Shubham Khadge', email: 'karishma.khadge@mindstix.com' },
  { staffId: 811, name: 'Amaan Navaj Mulla', email: 'amaan.mulla@mindstix.com' },
  { staffId: 812, name: 'Herika Koshti', email: 'herika.koshti@mindstix.com' },
  { staffId: 813, name: 'Dheeraj Rapelli', email: 'dheeraj.rapelli@mindstix.com' },
  { staffId: 814, name: 'Ekta Kishore', email: 'ekta.kishore@mindstix.com' },
  { staffId: 815, name: 'Kaustubh Vaidya', email: 'kaustubh.vaidya@mindstix.com' },
  { staffId: 816, name: 'Yash Dubey', email: 'yash.dubey@mindstix.com' },
  { staffId: 817, name: 'Lakshmi Vishwakarma', email: 'lakshmi.vishwakarma@mindstix.com' },
  { staffId: 818, name: 'Prajwal Shinde', email: 'prajwal.shinde@mindstix.com' },
  { staffId: 819, name: 'Pornima Bharuka', email: 'pornima.bharuka@mindstix.com' },
  { staffId: 820, name: 'Sandesh Sahare', email: 'sandesh.sahare@mindstix.com' },
  { staffId: 821, name: 'Rahul Kedari', email: 'rahul.kedari@mindstix.com' },
  { staffId: 822, name: 'Vaibhav Sarswat', email: 'vaibhav.sarswat@mindstix.com' },
  { staffId: 823, name: 'Rushikesh Nimkar', email: 'rushikesh.nimkar@mindstix.com' },
  { staffId: 824, name: 'Advait Patil', email: 'advait.patil@mindstix.com' },
  { staffId: 825, name: 'Prathmesh Patil', email: 'prathamesh.patil@mindstix.com' },
  { staffId: 826, name: 'Manan Devani', email: 'manan.devani@mindstix.com' },
];

async function seedEmployees(adminUserId: number) {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  STEP 3: Employees');
  console.log('═══════════════════════════════════════════════════\n');

  const employeeData = employees.map((emp) => {
    const nameParts = emp.name.trim().split(' ');
    const lastName = nameParts[nameParts.length - 1];
    const firstName = nameParts.slice(0, -1).join(' ') || lastName;
    return {
      employeeId: pad(emp.staffId, 4),
      firstName,
      lastName,
      email: emp.email,
      status: EmployeeStatus.ACTIVE,
      createdBy: adminUserId,
      updatedBy: adminUserId,
    };
  });

  const result = await prisma.employee.createMany({ data: employeeData, skipDuplicates: true });
  console.log(`Created ${result.count} employees`);
}

// ─── STEP 4 & 5: ASSETS & ASSIGNMENTS ───────────────────────────────────────

interface AssetEntry {
  serialNumber: string;
  assetType: string;
  brand: string;
  model: string;
  notes: string;
  staffId: number;
  ram?: string;
  processor?: string;
  macAddress?: string;
}

/**
 * All assets parsed from the CSV.
 * Each row in the CSV can have multiple asset columns (IOS laptop, IOS laptop #2, Windows laptop, Android mobile, etc.)
 * We flatten them here into individual asset entries with their staff assignment.
 */
const assetsData: AssetEntry[] = [
  // Row 1: 0026 Ashish Bhargava - 1 IOS laptop
  { serialNumber: 'L73J7LC253', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M3 8GB', staffId: 26, ram: '8GB', processor: 'M3', macAddress: '50:A6:D8:A1:DB:A3' },

  // Row 2: 0067 Akash Salunkhe - 2 IOS laptops
  { serialNumber: 'FVFJ4TX9Q6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 Pro 8GB', staffId: 67, ram: '8 GB', processor: 'M1 Pro', macAddress: 'd0:88:0c:7d:ef:be' },
  { serialNumber: 'RYW7CTP69Q', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M2 Pro 8GB', staffId: 67, ram: '8 GB', processor: 'M2 Pro', macAddress: 'a4:cf:99:7b:ba:f8' },

  // Row 3: 0072 Varsha Mane - 1 IOS laptop
  { serialNumber: 'C6DMXMGHHD', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M4 16GB', staffId: 72, ram: '16GB', processor: 'M4', macAddress: 'A0:9A:8E:08:1E:0B' },

  // Row 4: 0089 Urmi Chawda - 1 Windows + 1 Android
  { serialNumber: 'PF3RKDCS', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', notes: 'Lenovo Thinkpad i5 11th Gen 16GB', staffId: 89, ram: '16 GB', processor: 'i5 - 11th Gen Intel', macAddress: 'F8:9E:94:7A:B7:87' },
  { serialNumber: 'R9ZY30G0X2T', assetType: 'Mobile', brand: 'Samsung', model: 'Samsung Galaxy M06', notes: 'Samsung Galaxy M06', staffId: 89 },

  // Row 5: 0134 Yashvant Revandkar - 1 IOS laptop (2nd column)
  { serialNumber: 'FVFFRJT7Q05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 8GB', staffId: 134, ram: '8 GB', processor: 'M1', macAddress: '3c:06:30:0d:7b:c4' },

  // Row 6: 0177 Hitesh Wagh - 2 IOS laptops
  { serialNumber: 'M7PVXLGJ2G', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M3 Pro 8GB', staffId: 177, ram: '8 GB', processor: 'M3 Pro', macAddress: '50:a6:d8:a5:1e:db' },
  { serialNumber: 'FVFFM3P2Q05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 Pro 8GB', staffId: 177, ram: '8 GB', processor: 'M1 Pro', macAddress: 'a0:78:17:b4:71:27' },

  // Row 7: 0178 Asim Shah
  { serialNumber: 'JR20PWKLGV', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M2 16GB', staffId: 178, ram: '16GB', processor: 'M2', macAddress: '6C:7E:67:CA:4C:57' },

  // Row 8: 0182 Ranjan Verma
  { serialNumber: 'H9FFXP4DWN', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 Pro 16GB', staffId: 182, ram: '16 GB', processor: 'M1 Pro', macAddress: 'f8:4d:89:81:f5:3d' },

  // Row 9: 0183 Sangram Jagtap
  { serialNumber: 'C02JMBPJQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 Pro 8GB', staffId: 183, ram: '8 GB', processor: 'M1 Pro', macAddress: 'c0:95:6d:3b:29:21' },

  // Row 10: 0185 Sherin Varghese
  { serialNumber: 'FVFXKB6DHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro Intel 8GB', staffId: 185, ram: '8GB', processor: 'intel', macAddress: 'f0:18:98:41:6d:c1' },

  // Row 11: 0197 Niharika Katare
  { serialNumber: 'FVFKC54K1WFV', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 Pro 8GB', staffId: 197, ram: '8 GB', processor: 'M1 Pro', macAddress: '70:ae:d5:54:3c:37' },

  // Row 12: 0216 Rahul Thakor
  { serialNumber: 'RR447QKV3X', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 Pro 16GB', staffId: 216, ram: '16GB', processor: 'M1 Pro', macAddress: 'bc:d0:74:f2:55:73' },

  // Row 13: 0242 Pranay Raut
  { serialNumber: 'QGLQJ41CW0', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 Pro 16GB', staffId: 242, ram: '16GB', processor: 'M1 Pro', macAddress: '6e:33:75:3c:68:99' },

  // Row 14: 0254 Deepika Vinchurkar
  { serialNumber: 'FVFG19XXQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 Pro 8GB', staffId: 254, ram: '8 GB', processor: 'M1 Pro', macAddress: '3c:06:30:1a:96:9d' },

  // Row 15: 0260 Abhishek Kumar Rohan
  { serialNumber: 'FVHFW1GYQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 8GB', staffId: 260, ram: '8GB', processor: 'M1', macAddress: '3c:06:30:1a:8f:32' },

  // Row 16: 0283 Suruchi Garg - IOS + Windows
  { serialNumber: 'C02G8M8KQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 Pro 8GB', staffId: 283, ram: '8 GB', processor: 'M1 Pro', macAddress: '3c:a6:f6:3c:20:2b' },
  { serialNumber: 'MP27HQ3H', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: 'Lenovo ThinkBook i5 11th Gen 16GB', staffId: 283, ram: '16 GB', processor: 'i5 - 11th Gen Intel', macAddress: '20-C1-9B-83-A0-22' },

  // Row 17: 0311 Shubham Marulkar
  { serialNumber: 'C02KC2CWQ6L7', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 Pro 8GB', staffId: 311, ram: '8 GB', processor: 'M1 Pro', macAddress: '10:B5:88:4C:DC:41' },

  // Row 18: 0315 Prajyot Kondekar
  { serialNumber: 'FVHFW1HFQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 8GB', staffId: 315, ram: '8GB', processor: 'M1', macAddress: '3c:06:30:16:e8:b2' },

  // Row 19: 0328 Pramod Konda
  { serialNumber: 'MHG94T6HPH', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M3 Pro 18GB', staffId: 328, ram: '18 GB', processor: 'M3 Pro', macAddress: '92:ff:c6:01:bc:44' },

  // Row 20: 0332 Suraj Yadav
  { serialNumber: 'MP263CAC', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: 'Lenovo ThinkBook i5 11th Gen 16GB', staffId: 332, ram: '16 GB', processor: 'i5 - 11th Gen Intel', macAddress: 'E4:A8:DF:B3:9C:C0' },

  // Row 21: 0337 Kaivalya Bhale
  { serialNumber: 'C02G8M3NQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 Pro 8GB', staffId: 337, ram: '8 GB', processor: 'M1 Pro', macAddress: 'ba:e1:81:ea:b7:3c' },

  // Row 22: 0338 Himanshu Advani
  { serialNumber: 'C02G8M5VQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 Pro 8GB', staffId: 338, ram: '8 GB', processor: 'M1 Pro', macAddress: '3c:a6:f6:35:25:af' },

  // Row 23: 0346 Abhishek Khutwad
  { serialNumber: 'MVDWFYVNV9', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M3 Pro 18GB', staffId: 346, ram: '18 GB', processor: 'M3 Pro', macAddress: '50:A6:D8:D0:6F:47' },

  // Row 24: 0349 Pratiksha Wagh
  { serialNumber: 'GTX2P6HDW5', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M4 16GB', staffId: 349, ram: '16 GB', processor: 'M4', macAddress: '9a:8c:2c:69:3a:ab' },

  // Row 25: 0356 Abhijeet Kokane
  { serialNumber: 'L2DN7C14DW', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M3 Pro 16GB', staffId: 356, ram: '16 GB', processor: 'M3 Pro', macAddress: '80:a9:97:3e:2f:67' },

  // Row 26: 0357 Aditya Potdar
  { serialNumber: 'FVFFRJV7Q05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 Pro 8GB', staffId: 357, ram: '8 GB', processor: 'M1 Pro', macAddress: '3c:06:30:0a:2d:d8' },

  // Row 27: 0379 Jay Gandhi
  { serialNumber: 'C5772C93VN', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M2 Pro 8GB', staffId: 379, ram: '8 GB', processor: 'M2 Pro', macAddress: 'a4:cf:99:89:1f:ef' },

  // Row 28: 0386 Shubham Hadake
  { serialNumber: 'FVFKNS3T1WFV', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 Pro 8GB', staffId: 386, ram: '8 GB', processor: 'M1 Pro', macAddress: '10:b5:88:6d:04:cb' },

  // Row 29: 0388 Ashwini Shinde
  { serialNumber: 'FVFKT6PN1WFV', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 Pro 8GB', staffId: 388, ram: '8 GB', processor: 'M1 Pro', macAddress: '10:b5:88:78:eb:2d' },

  // Row 30: 0389 Prathamesh Nagargoje
  { serialNumber: 'TXQ7W2M26R', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro 8GB', staffId: 389, ram: '8 GB', processor: '8 GB', macAddress: 'aa:c8:c6:dc:eb:ad' },

  // Row 31: 0399 Saima Ansari - 2 IOS laptops
  { serialNumber: 'C02JM9UFQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 Pro 8GB', staffId: 399, ram: '8 GB', processor: 'M1 Pro', macAddress: 'c0:95:6d:3a:9f:15' },
  { serialNumber: 'C02JMBQ7Q6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 Pro 8GB', staffId: 399, ram: '8 GB', processor: 'M1 Pro', macAddress: 'C0:95:6D:3C:E9:66' },

  // Row 32: 0408 Tanuj Abraham
  { serialNumber: 'V2TQ0HL49W', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 Pro 16GB', staffId: 408, ram: '16 GB', processor: 'M1 Pro', macAddress: 'f8:4d:89:82:ef:6a' },

  // Row 33: 0414 Arushi Kothari - IOS + Windows
  { serialNumber: 'C02FFCW5Q6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 Pro 8GB', staffId: 414, ram: '8 GB', processor: 'M1 Pro', macAddress: '50:ed:3c:45:87:22' },
  { serialNumber: 'MP28J2Z8', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 15', notes: 'Lenovo ThinkBook 15 i5 11th Gen 16GB', staffId: 414, ram: '16 GB', processor: 'i5 - 11th Gen Intel', macAddress: 'b0:3c:dc:a7:be:4e' },

  // Row 34: 0427 Mohan Mohadikar - 2 IOS
  { serialNumber: 'HYXQ72MX19', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M3 18GB', staffId: 427, ram: '18 GB', processor: 'M3', macAddress: '80:a9:97:44:2c:fe' },
  { serialNumber: 'FVFF80VFQ05Q', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 16GB', staffId: 427, ram: '16 GB', processor: 'M1', macAddress: 'A0:78:17:85:90:5D' },

  // Row 35: 0434 Rohit Chauhan
  { serialNumber: 'FVFFRJW4Q05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 Pro 8GB', staffId: 434, ram: '8 GB', processor: 'M1 Pro', macAddress: '3c:06:30:02:b2:10' },

  // Row 36: 0464 Amruta Kulkarni - IOS + Android + IOS Mobile
  { serialNumber: 'FVFJ54JV1WFV', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 8GB', staffId: 464, ram: '8 GB', processor: 'M1', macAddress: 'd0:88:0c:76:92:19' },
  { serialNumber: 'RZCX71MB8AH', assetType: 'Mobile', brand: 'Samsung', model: 'Samsung Galaxy S21 FE 5G', notes: 'Samsung Galaxy S21 FE 5G', staffId: 464 },
  { serialNumber: 'F18XLMJNKXKN', assetType: 'Mobile', brand: 'Apple', model: 'iPhone XR', notes: 'iPhone XR', staffId: 464 },

  // Row 37: 0476 Vishal Pawar
  { serialNumber: 'R7MFDQVXW3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M2 8GB', staffId: 476, ram: '8 GB', processor: 'M2 ', macAddress: 'a4:cf:99:85:93:77' },

  // Row 38: 0506 Aditi Goyal
  { serialNumber: 'MP2637S2', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 14', notes: 'Lenovo ThinkBook 14 i5 11th Gen 40GB', staffId: 506, ram: '40 GB', processor: 'i5 - 11th Gen Intel', macAddress: '70:1A:B8:00:4E:A2' },

  // Row 39: 0511 Panini Prabhukhanolkar
  { serialNumber: 'C02JJ9JKQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 Pro 8GB', staffId: 511, ram: '8 GB', processor: 'M1 Pro', macAddress: 'c0:95:6d:2d:94:a7' },

  // Row 40: 0522 Rahul Jadav
  { serialNumber: 'C02G8VX9Q6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 8GB', staffId: 522, ram: '8 GB', processor: 'M1', macAddress: '3C:A6:F6:2F:83:8E' },

  // Row 42: 0545 Apoorv Gupta
  { serialNumber: 'KWPXPP6WPX', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M3 Pro 16GB', staffId: 545, ram: '16 GB', processor: 'M3 Pro', macAddress: 'c4:84:fc:0e:23:60' },

  // Row 43: 0546 Anshul Amol Rokde - IOS + IOS2 + IOS Mobile x2
  { serialNumber: 'RYY4DXRD4H', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 Pro 16GB', staffId: 546, ram: '16 GB', processor: 'M1 Pro', macAddress: 'c8:89:f3:ee:a4:06' },
  { serialNumber: 'C02G8W2LQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 Pro 8GB', staffId: 546, ram: '8 GB', processor: 'M1 Pro', macAddress: '3c:a6:f6:32:32:9e' },
  { serialNumber: 'FK2VT393JCLF', assetType: 'Mobile', brand: 'Apple', model: 'iPhone X', notes: 'iPhone X', staffId: 546 },
  { serialNumber: 'DX3H53XRN735', assetType: 'Mobile', brand: 'Apple', model: 'iPhone 11', notes: 'iPhone 11', staffId: 546 },

  // Row 44: 0560 Pranav Hadawale - IOS + IOS2 + Android
  { serialNumber: 'HXVPY74729', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M2 Pro 16GB', staffId: 560, ram: '16 GB', processor: 'M2 Pro', macAddress: '6c:7e:67:c8:84:6d' },
  { serialNumber: 'KJ2096H79W', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M3 16GB', staffId: 560, ram: '16 GB', processor: 'M3 ', macAddress: '50:a6:d8:d8:37:6d' },
  { serialNumber: 'RZCW30M6QCA', assetType: 'Mobile', brand: 'Samsung', model: 'Samsung Galaxy Z Fold 4', notes: 'Samsung Galaxy Z Fold 4', staffId: 560 },

  // Row 45: 0563 Chirag Shah - IOS + Windows
  { serialNumber: 'C02KC2FNQ6L7', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 Pro 8GB', staffId: 563, ram: '8 GB', processor: 'M1 Pro', macAddress: '10:B5:88:4E:63:8F' },
  { serialNumber: '2EB33E0E', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', notes: 'Lenovo Thinkpad i5 16GB', staffId: 563, ram: '16 GB', processor: 'i5', macAddress: '34-E1-2D-58-DE-37' },

  // Row 46: 0576 Abhijeet Rahul Dhawale
  { serialNumber: 'FVFF9BF4Q05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 8GB', staffId: 576, ram: '8 GB', processor: 'M1', macAddress: 'a0:78:17:88:59:9c' },

  // Row 47: 0577 Amogasiddha - IOS + Windows
  { serialNumber: 'C02JMATAQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 Pro 8GB', staffId: 577, ram: '8 GB', processor: 'M1 Pro', macAddress: 'C0:95:6D:3F:54:E8' },
  { serialNumber: 'PF1PL6HR', assetType: 'Laptop', brand: 'Lenovo', model: '20LTS0MA00', notes: 'Lenovo 20LTS0MA00 i5 11th Gen 32GB', staffId: 577, ram: '32 GB', processor: 'i5 - 11th Gen Intel', macAddress: 'A0-51-0B-0D-FC-B4' },

  // Row 48: 0580 Swati Rayatuwar - IOS + IOS Mobile
  { serialNumber: 'C02JMA0RQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 Pro 8GB', staffId: 580, ram: '8 GB', processor: 'M1 Pro', macAddress: 'c0:95:6d:41:cf:a9' },
  { serialNumber: 'Q9HTMHCFCG', assetType: 'Mobile', brand: 'Apple', model: 'iPhone 13', notes: 'iPhone 13', staffId: 580 },

  // Row 49: 0582 Pranjalee Gadle
  { serialNumber: 'FVFJQJGN1WFV', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 Pro 8GB', staffId: 582, ram: '8 GB', processor: 'M1 Pro', macAddress: 'c0:95:6d:48:41:63' },

  // Row 50: 0589 Abdul Khan - 2 IOS
  { serialNumber: 'MN27X43JHQ', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M3 16GB', staffId: 589, ram: '16 GB', processor: 'M3 ', macAddress: '50:a6:d8:d0:ab:e6' },
  { serialNumber: 'R4KJXD39H3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 Pro 16GB', staffId: 589, ram: '16 GB', processor: 'M1 Pro', macAddress: 'f8:4d:89:80:5a:f4' },

  // Row 51: 0599 Jayesh Dhanraj Jadhav
  { serialNumber: 'R62FHPH0JN', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M2 Pro 8GB', staffId: 599, ram: '8 GB', processor: 'M2 Pro', macAddress: '2e:87:81:91:f5:d8' },

  // Row 52: 0601 Vivek Sarjal
  { serialNumber: 'C02JGR1YQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 8GB', staffId: 601, ram: '8 GB', processor: 'M1', macAddress: '52:6c:23:72:ea:e8' },

  // Row 53: 0603 Jitesh Dhumal - IOS + IOS Mobile x2
  { serialNumber: 'C02JMBNKQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 8GB', staffId: 603, ram: '8 GB', processor: 'M1', macAddress: 'C0:95:6D:41:3C:AD' },
  { serialNumber: 'GV4FM449N735', assetType: 'Mobile', brand: 'Apple', model: 'iPhone 11', notes: 'iPhone 11', staffId: 603 },
  { serialNumber: 'F4GVRDE6JC6D', assetType: 'Mobile', brand: 'Apple', model: 'iPhone 8', notes: 'iPhone 8', staffId: 603 },

  // Row 54: 0611 Neeraj Mahapatra
  { serialNumber: 'D9DJJYCVWX', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M4 16GB', staffId: 611, ram: '16GB', processor: 'M4', macAddress: 'f8:73:df:04:f0:11' },

  // Row 55: 0615 Anirudha Kishor Welukar - Windows
  { serialNumber: 'PF58K4XS', assetType: 'Laptop', brand: 'Lenovo', model: '21G2S0D000', notes: 'Lenovo 21G2S0D000 Intel Ultra 7 155H 16GB', staffId: 615, ram: '16 GB', processor: 'Intel(R) Core(TM) Ultra 7 155H (1.40 GHz)' },

  // Row 56: 0620 Amruta Joshi
  { serialNumber: 'C02JMBPFQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 8GB', staffId: 620, ram: '8 GB', processor: 'M1' },

  // Row 57: 0626 Hitanshu Ramesh Machhi
  { serialNumber: 'C02JMBPAQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 8GB', staffId: 626, ram: '8 GB', processor: 'M1', macAddress: '50:ED:3C:40:5E:AC' },

  // Row 58: 0629 Rahul Madan
  { serialNumber: 'FVFJ6J511WFV', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 8GB', staffId: 629, ram: '8 GB', processor: 'M1', macAddress: 'd0:88:0c:71:ec:9e' },

  // Row 59: 0632 Shubham Khetre - Windows
  { serialNumber: 'PF3Q9B36', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', notes: 'Lenovo ThinkPad I7 48GB', staffId: 632, ram: '48 GB', processor: 'I7', macAddress: '20:C1:9B:D6:43:1D' },

  // Row 60: 0644 Bhavana Mishra - Windows + Android
  { serialNumber: 'MP28J31Y', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 15', notes: 'Lenovo Thinkbook 15 i5 11th Gen 16GB', staffId: 644, ram: '16 GB', processor: 'i5 - 11th Gen Intel', macAddress: 'B0:3C:DC:A1:37:BD' },
  { serialNumber: 'REDMI11_644', assetType: 'Mobile', brand: 'Xiaomi', model: 'Redmi 11', notes: 'Redmi 11', staffId: 644 },

  // Row 61: 0646 Abhaya Shahare
  { serialNumber: 'LY74GQXWJ1', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M3 8GB', staffId: 646, ram: '8 GB', processor: 'M3', macAddress: '50:a6:d8:9d:14:09' },

  // Row 62: 0649 Kartik Mohan Dabre
  { serialNumber: 'C02JM9EEQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'Macbook Air M1 Pro 8GB', staffId: 649, ram: '8 GB', processor: 'M1 Pro', macAddress: 'c0:95:6d:3d:16:53' },

  // Row 63: 0658 Vivek Dinesh Patel - Windows
  { serialNumber: 'MP2637NP', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 14', notes: 'Lenovo ThinkBook 14 i5 11th Gen 16GB', staffId: 658, ram: '16 GB', processor: 'i5 - 11th Gen Intel', macAddress: '8C:B8:7E:BF:BF:F3' },

  // Row 64: 0661 Abhishek Pradeep More - IOS + Windows
  { serialNumber: 'T9XHJ6VJKH', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M2 Pro 8GB', staffId: 661, ram: '8 GB', processor: 'M2 Pro', macAddress: 'A4:CF:99:86:02:42' },
  { serialNumber: 'MP22CSK8', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 14', notes: 'Lenovo ThinkBook 14 i5 11th Gen 16GB', staffId: 661, ram: '16 GB', processor: 'i5 - 11th Gen Intel', macAddress: '38-87-D5-37-CC-88' },

  // Row 65: 0663 Sameer Abhay Pardeshi
  { serialNumber: 'MY9WH1W9K7', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M4 16GB', staffId: 663, ram: '16GB', processor: 'M4', macAddress: 'ac:07:75:24:81:3b' },

  // Row 66: 0664 Badal Chaganlal Oza
  { serialNumber: 'FVFFM0CNQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 8GB', staffId: 664, ram: '8 GB', processor: 'M1', macAddress: '64:D2:C4:F3:2E:D6' },

  // Row 67: 0675 Parth Kapadia - 2 IOS
  { serialNumber: 'FVFFLPFBQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 8GB', staffId: 675, ram: '8 GB', processor: 'M1', macAddress: 'A0:78:17:B0:2D:B3' },
  { serialNumber: 'C02JMA1DQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'Macbook Air M1 8GB', staffId: 675, ram: '8 GB', processor: 'M1', macAddress: 'c0:95:6d:35:12:82' },

  // Row 68: 0678 Deeplaxmi Patil - Windows
  { serialNumber: 'PG02KF8V', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: 'Lenovo Thinkbook i5 11th Gen 16GB', staffId: 678, ram: '16 GB', processor: 'i5 - 11th Gen Intel' },

  // Row 69: 0679 Suraj Moon - IOS + IOS2
  { serialNumber: 'C02G8ME8Q6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 8GB', staffId: 679, ram: '8 GB', processor: 'M1', macAddress: '3c:a6:f6:3b:d2:bc' },
  { serialNumber: 'C02G8AQ6ML7H', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro i5 16GB', staffId: 679, ram: '16GB', processor: 'i5', macAddress: '68:2f:67:91:93:2b' },

  // Row 70: 0682 Kanika Rawal
  { serialNumber: 'FVFY84XLHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro i5 8GB', staffId: 682, ram: '8 GB', processor: 'i5', macAddress: '38:f9:d3:6e:10:46' },

  // Row 71: 0683 Tushar Sharad Tomar - Windows
  { serialNumber: 'MP263A0H', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: 'Lenovo Thinkbook i5 11th Gen 16GB', staffId: 683, ram: '16 GB', processor: 'i5 - 11th Gen Intel', macAddress: 'E4-A8-DF-B3-50-2A' },

  // Row 72: 0684 Alhaj Siddiqui
  { serialNumber: 'MK2NLXLJ60', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M2 Pro 16GB', staffId: 684, ram: '16GB', processor: 'M2 Pro', macAddress: '6C:7E:67:BE:82:FB' },

  // Row 73: 0460 Pradip Phadatare - IOS + Android + IOS Mobile
  { serialNumber: 'FVFF8FE7Q05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 8GB', staffId: 460, ram: '8 GB', processor: 'M1 ', macAddress: 'a0:78:17:87:2e:9f' },
  { serialNumber: '4465aec8', assetType: 'Mobile', brand: 'Xiaomi', model: 'Redmi Note 9 Pro Max', notes: 'Redmi Note 9 Pro Max', staffId: 460 },
  { serialNumber: 'F4DWJ7RQ0Q', assetType: 'Mobile', brand: 'Apple', model: 'iPhone 13 Mini', notes: 'iPhone 13 Mini', staffId: 460 },

  // Row 74: 0687 Pranit Shirsath - IOS + IOS2 + Windows + Android
  { serialNumber: 'HFRJPFP4F9', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 16GB', staffId: 687, ram: '16GB', processor: 'M1', macAddress: 'f8:4d:89:61:20:1f' },
  { serialNumber: 'C02JMBQWQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 8GB', staffId: 687, ram: '8 GB', processor: 'M1', macAddress: 'C0:95:6D:41:0A:C0' },
  { serialNumber: '20LTS0MA00', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', notes: 'Lenovo Thinkpad i5 11th Gen 16GB', staffId: 687, ram: '16 GB', processor: 'i5 - 11th Gen Intel', macAddress: '8C:16:45:88:1F:4F' },
  { serialNumber: 'RZCW21E4KWV', assetType: 'Mobile', brand: 'Samsung', model: 'Samsung Galaxy A14 5G', notes: 'Samsung Galaxy A14 5G', staffId: 687 },

  // Row 75: 0689 Anuja Deshpande
  { serialNumber: 'C02F50TUML7H', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro i5 16GB', staffId: 689, ram: '16GB', processor: 'i5', macAddress: '88:66:5a:0e:c2:0d' },

  // Row 76: 0692 Aditya Jadhav
  { serialNumber: 'C02DVDBPML7H', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro i5 16GB', staffId: 692, ram: '16GB', processor: 'i5', macAddress: '90:9c:4a:ce:30:31' },

  // Row 77: 0693 Dev Jindal
  { serialNumber: 'FVHFW1CUQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 8GB', staffId: 693, ram: '8 GB', processor: 'M1 ' },

  // Row 78: 0696 Kartikey Singh
  { serialNumber: 'FVFFF56JQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 8GB', staffId: 696, ram: '8 GB', processor: 'M1 ', macAddress: 'a0:78:17:89:a4:a8' },

  // Row 79: 0697 Sanket More - 2 IOS
  { serialNumber: 'FVFX6BM0HV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro i5 8GB', staffId: 697, ram: '8 GB', processor: 'i5', macAddress: '88:09:fe:88:36:51' },
  { serialNumber: 'C02F2KPSML7H', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro i5 16GB', staffId: 697, ram: '16GB', processor: 'i5', macAddress: '88:66:5a:06:e6:26' },

  // Row 80: 0698 Vedant Sanjay Shejwal - 2 IOS
  { serialNumber: 'C02V2HTHHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro i5 8GB', staffId: 698, ram: '8 GB', processor: 'i5', macAddress: '8c:85:90:15:25:23' },
  { serialNumber: 'FVFFRJXFQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 8GB', staffId: 698, ram: '8 GB', processor: 'M1 ', macAddress: '3c:06:30:09:4f:76' },

  // Row 81: 0700 Geet Salame - Windows
  { serialNumber: 'PG02KES7', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 14 G2 ITL', notes: 'ThinkBook 14 G2 ITL i5 11th Gen 40GB', staffId: 700, ram: '40 GB', processor: 'i5 - 11th Gen Intel', macAddress: '40:1C:83:D8:D3:30' },

  // Row 82: 0701 Diya Kantilal Dhumal
  { serialNumber: 'X307064YGW', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 16GB', staffId: 701, ram: '16GB', processor: 'M1 ', macAddress: 'f0:ee:7a:00:37:72' },

  // Row 83: 0703 Tejas Kohade
  { serialNumber: 'J930JFJJTC', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 16GB', staffId: 703, ram: '16GB', processor: 'M1 ', macAddress: 'c8:89:f3:ab:9d:bd' },

  // Row 84: 0704 Atharva Ravikiran Dhoble - Windows
  { serialNumber: 'MP2639X9', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', notes: 'Lenovo Thinkpad i5 11th Gen 16GB', staffId: 704, ram: '16 GB', processor: 'i5 - 11th Gen Intel', macAddress: 'E4:A8:DF:B3:50:B8' },

  // Row 85: 0707 Pranav More - 2 IOS
  { serialNumber: 'FVFXQGFMJ1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air i5 8GB', staffId: 707, ram: '8 GB', processor: 'i5', macAddress: '24:1b:7a:d4:88:40' },
  { serialNumber: 'C02F8DSFQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 8GB', staffId: 707, ram: '8 GB', processor: 'M1 ', macAddress: '50:ED:3C:24:57:89' },

  // Row 86: 0708 Neeraj Chavan
  { serialNumber: 'C02F8DS4Q6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 8GB', staffId: 708, ram: '8 GB', processor: 'M1 ', macAddress: '50:ed:3c:2c:01:6f' },

  // Row 87: 0709 Yash Yadav
  { serialNumber: 'FVFJ564NQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 8GB', staffId: 709, ram: '8 GB', processor: 'M1 ', macAddress: 'd0:88:0c:7c:ca:d3' },

  // Row 88: 0711 Yash Shah
  { serialNumber: 'C02JMBQXQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'Macbook Air M1 8GB', staffId: 711, ram: '8 GB', processor: 'M1 ', macAddress: 'C0:95:6D:33:DD:09' },

  // Row 89: 0712 Himanshu Singh
  { serialNumber: 'FVFFRJWFQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 8GB', staffId: 712, ram: '8 GB', processor: 'M1 ', macAddress: '3c:06:30:09:cd:1c' },

  // Row 90: 0713 Raghini Trivedi
  { serialNumber: 'FVHFW1M2Q05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 8GB', staffId: 713, ram: '8 GB', processor: 'M1 ', macAddress: '3c:06:30:1b:50:c4' },

  // Row 91: 0715 Roshan Jadhav
  { serialNumber: 'C02G8M3VQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'Macbook Air M1 8GB', staffId: 715, ram: '8 GB', processor: 'M1 ', macAddress: '3c:a6:f6:37:6b:e7' },

  // Row 92: 0716 Kartik Vora
  { serialNumber: 'C17G59KAQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'Macbook Air M1 8GB', staffId: 716, ram: '8 GB', processor: 'M1 ', macAddress: '3c:a6:f6:24:94:73' },

  // Row 93: 0718 Shrey Nahar
  { serialNumber: 'N4W7FNJKW7', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M2 Pro 8GB', staffId: 718, ram: '8 GB', processor: 'M2 Pro', macAddress: 'a4:cf:99:58:12:3a' },

  // Row 95: 0721 Varun Jaiswal - IOS + Windows
  { serialNumber: 'FVFXDAJQHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro 8GB', staffId: 721, ram: '8 GB', processor: '2133 MHz LPDDR3', macAddress: 'f0:18:98:67:9e:26' },
  { serialNumber: 'PG02KF4Z', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: 'Lenovo ThinkBook i5 11th Gen 16GB', staffId: 721, ram: '16 GB', processor: 'i5 - 11th Gen Intel', macAddress: '7C-8A-E1-91-0A-76' },

  // Row 96: 0722 Ruchita Chavan
  { serialNumber: 'C02G1ALFQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'Macbook Air M1 8GB', staffId: 722, ram: '8 GB', processor: 'M1 ', macAddress: 'b4:fa:48:e2:37:78' },

  // Row 97: 0724 Bhavay Sehgal - Windows
  { serialNumber: 'MP28PT9Q', assetType: 'Laptop', brand: 'Lenovo', model: '20VE', notes: 'Lenovo 20VE 16GB', staffId: 724, ram: '16 GB', macAddress: 'e4:a8:df:cf:a3:74' },

  // Row 98: 0725 Vaishnavi Bhujbal - IOS + IOS2 + Android
  { serialNumber: 'TFXWR630H4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M2 Pro 8GB', staffId: 725, ram: '8 GB', processor: 'M2 Pro', macAddress: 'a4:cf:99:85:42:88' },
  { serialNumber: 'PNRWQ747X1', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 16GB', staffId: 725, ram: '16GB', processor: 'M1 ', macAddress: 'c8:89:f3:bb:6f:a2' },
  { serialNumber: 'R3CRC0195VZ', assetType: 'Mobile', brand: 'Samsung', model: 'Samsung Galaxy Zflip 3 5G', notes: 'Samsung Zflip 3 5g', staffId: 725 },

  // Row 99: 0728 Madhu Harsha
  { serialNumber: 'RC2CM94TF3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 16GB', staffId: 728, ram: '16GB', processor: 'M1 ', macAddress: 'bc:d0:74:ec:d4:6a' },

  // Row 100: 0730 Shreyash Adlinge
  { serialNumber: 'C02G8M27Q6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'Macbook Air M1 8GB', staffId: 730, ram: '8 GB', processor: 'M1 ', macAddress: '3c:a6:f6:31:98:bb' },

  // Row 101: 0731 Sandeep Vishwakarma
  { serialNumber: 'KW7HQVX5M7', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'Macbook Air M3', staffId: 731, processor: 'M3', macAddress: 'C4:84:FC:05:E8:B8' },

  // Row 102: 0732 Samarth Kanchan - 2 IOS
  { serialNumber: 'FVHXG6ESHV29', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro i5', staffId: 732, processor: 'i5', macAddress: 'f0:18:98::1c:0e:6a' },
  { serialNumber: 'C023JJ9K5Q6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'Macbook Air M1 8GB', staffId: 732, ram: '8 GB', processor: 'M1', macAddress: 'C0:95:6D:2B:51:5B' },

  // Row 103: 0733 Rugvedi Ghule - Windows
  { serialNumber: 'MP263FGV', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: 'Lenovo ThinkBook i5 11th Gen 16GB', staffId: 733, ram: '16 GB', processor: 'i5 - 11th Gen Intel', macAddress: '8c:b8:7e:bf:bf:71' },

  // Row 104: 0737 Tanisha Agrawal - IOS + IOS2
  { serialNumber: 'C02KCDVHQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'Macbook Air M1 8GB', staffId: 737, ram: '8 GB', processor: 'M1', macAddress: '70:ae:d5:53:b2:b7' },
  { serialNumber: 'K90T4P070T', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M4 Pro 24GB', staffId: 737, ram: '24 GB', processor: 'M4 Pro', macAddress: 'da:7f:93:c1:a5:61' },

  // Row 105: 0738 Ashish Sitaram Chakkar - Windows
  { serialNumber: 'PF3W96XX', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', notes: 'Lenovo Thinkpad i5 11th Gen 16GB', staffId: 738, ram: '16 GB', processor: 'i5 - 11th Gen Intel', macAddress: 'C4:75:AB:CE:B4:13' },

  // Row 106: 0741 Shravani Tammewar - IOS + Windows
  { serialNumber: 'Q2YF2R6W2M', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M2 Pro 8GB', staffId: 741, ram: '8 GB', processor: 'M2 Pro', macAddress: 'A4:CF:99:7A:E8:F7' },
  { serialNumber: 'MP27HVQ9', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', notes: 'Lenovo Thinkpad i5 11th Gen 16GB', staffId: 741, ram: '16 GB', processor: 'i5 - 11th Gen Intel', macAddress: '20:C1:9B:7C:D4:6D' },

  // Row 107: 0742 Sarina Khatri - Windows
  { serialNumber: 'PF1ES933', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', notes: 'Lenovo Thinkpad i5 11th Gen 16GB', staffId: 742, ram: '16 GB', processor: 'i5 - 11th Gen Intel', macAddress: '18:1D:EA:AA:CA:C1' },

  // Row 108: 0743 Palak Gupta - Windows
  { serialNumber: 'MP28J30E', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: 'Lenovo ThinkBook i5 11th Gen 16GB', staffId: 743, ram: '16 GB', processor: 'i5 - 11th Gen Intel', macAddress: 'B0-3C-DC-A1-3B-3C' },

  // Row 109: 0744 Mayur Tingare - Windows
  { serialNumber: 'PG01GMWA', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', notes: 'Lenovo Thinkpad i5 11th Gen 16GB', staffId: 744, ram: '16 GB', processor: 'i5 - 11th Gen Intel', macAddress: '18:1D:EA:3B:0B:D2' },

  // Row 110: 0745 Tanishq Chavan - Windows
  { serialNumber: 'PG02KF7E', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: 'Lenovo ThinkBook i5 11th Gen 40GB', staffId: 745, ram: '40 GB', processor: 'i5 - 11th Gen Intel', macAddress: '40-1C-83-BC-D8-79' },

  // Row 111: 0746 Omkar Salunke - Windows
  { serialNumber: 'MP263CFL', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: 'Lenovo ThinkBook i5 11th Gen 24GB', staffId: 746, ram: '24 GB', processor: 'i5 - 11th Gen Intel', macAddress: '70-1A-B8-72-2D-9C' },

  // Row 112: 0748 Palash Jamaiwar - 2 IOS
  { serialNumber: 'C02D97TDML7L', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 8GB', staffId: 748, ram: '8 GB', processor: 'M1', macAddress: '14:7D:DA:5B:77:68' },
  { serialNumber: 'C02JMBPZQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 8GB', staffId: 748, ram: '8 GB', processor: 'M1', macAddress: 'c0:95:6d:33:e4:64' },

  // Row 113: 0749 Harshesh Pote - IOS + IOS Mobile
  { serialNumber: 'FVFJ6GN21WFV', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 8GB', staffId: 749, ram: '8 GB', processor: 'M1', macAddress: 'D0:88:0C:7D:D7:3C' },
  { serialNumber: 'F7J0FG9VG6', assetType: 'Mobile', brand: 'Apple', model: 'iPhone 17 Pro Max', notes: 'iPhone 17 Pro Max', staffId: 749 },

  // Row 114: 0750 Anurag Kadu
  { serialNumber: 'FVFJ6AP81WFV', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 8GB', staffId: 750, ram: '8 GB', processor: 'M1', macAddress: 'd0:88:0c:75:ca:60' },

  // Row 115: 0752 Chiraag Pandey
  { serialNumber: 'FVFF9BXPQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 8GB', staffId: 752, ram: '8 GB', processor: 'M1', macAddress: 'a0:78:17:84:23:2a' },

  // Row 116: 0753 Apurva Kamshetty - IOS + Windows
  { serialNumber: 'FVFFMBBZQ05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 8GB', staffId: 753, ram: '8 GB', processor: 'M1', macAddress: 'a0:78:17:b6:04:05' },
  { serialNumber: 'PF58WS4Z', assetType: 'Laptop', brand: 'Lenovo', model: 'Lenovo Ultra 7', notes: 'Lenovo Ultra 7 16GB', staffId: 753, ram: '16 GB', macAddress: 'C8:53:09:47:94:C7' },

  // Row 117: 0757 Abhijit Pachpande
  { serialNumber: 'C02DM29CML7H', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro i5 16GB', staffId: 757, ram: '16 GB', processor: 'i5', macAddress: '90:9c:4a:cb:d9:7b' },

  // Row 118: 0758 Harsh Kushwah - 2 Windows
  { serialNumber: '909D7AE0', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', notes: 'Lenovo Thinkpad i5 8th Gen 16GB', staffId: 758, ram: '16 GB', processor: 'i5 - 8th Gen Intel' },
  { serialNumber: '8333CD1D', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: 'Lenovo Thinkbook i5 11th Gen 16GB', staffId: 758 },

  // Row 119: 0759 Mugdha Jiwane
  { serialNumber: 'C02JM9CSQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 8GB', staffId: 759, ram: '8 GB', processor: 'M1', macAddress: 'c0:95:6d:3a:a5:64' },

  // Row 120: 0760 Bhagyashree Thakur
  { serialNumber: 'HKGH2WG147', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M4 16GB', staffId: 760, ram: '16 GB', processor: 'M4', macAddress: '22:10:5c:ef:8a:4a' },

  // Row 121: 0761 Reshma Reddy - Windows + Android
  { serialNumber: 'PG01FY2G', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', notes: 'Lenovo Thinkpad M1 16GB', staffId: 761, ram: '16 GB', processor: 'M1' },
  { serialNumber: 'RZ8T61E82BJ', assetType: 'Mobile', brand: 'Samsung', model: 'Samsung M12', notes: 'Samsung M12', staffId: 761 },

  // Row 122: 0765 Rohit Owal - IOS + Windows
  { serialNumber: 'C02T7D9JGVC1', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro i5 8GB', staffId: 765, ram: '8 GB', processor: 'i5', macAddress: '78:4f:43:4d:87:eb' },
  { serialNumber: 'PG-027306', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', notes: 'Lenovo Thinkpad i5 16GB', staffId: 765, ram: '16 GB', processor: 'i5', macAddress: '34:CF:F6:67:7D:F7' },

  // Row 123: 0767 Amitraj Jambure
  { serialNumber: 'FVFXP0S7HV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro Intel 8GB', staffId: 767, ram: '8 GB', processor: 'Intel', macAddress: 'f0:18:98:9e:e6:c7' },

  // Row 124: 0561 Ashwini Kote
  { serialNumber: 'C02JJ9EWQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 8GB', staffId: 561, ram: '8 GB', processor: 'M1', macAddress: 'c0:95:6d:24:c2:ec' },

  // Row 125: 0770 Mangesh Metkar - Windows
  { serialNumber: 'METKAR_THINKBOOK', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 15 G2 IT', notes: 'ThinkBook 15 G2 IT i5 11th Gen 16GB', staffId: 770, ram: '16 GB', processor: 'i5 11th Gen', macAddress: 'E4-A8-DF-B8-06-E8' },

  // Row 126: 0771 Prasoon Mangal - IOS + IOS2 (2nd has no serial)
  { serialNumber: 'MMQ4JJJ4D6', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 16GB', staffId: 771, ram: '16 GB', processor: 'M1', macAddress: 'f8:4d:89:7e:26:be' },

  // Row 127: 0773 Harsh Raj - Windows
  { serialNumber: 'MP263A0P', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: 'Lenovo ThinkBook i5 11th Gen 16GB', staffId: 773, ram: '16 GB', processor: 'i5 11th Gen', macAddress: '70:1A:B8:00:2C:48' },

  // Row 128: 0774 Aroonay Anand - IOS2
  { serialNumber: 'FVFFRJZ2Q05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 8GB', staffId: 774, ram: '8 GB', processor: 'M1', macAddress: '3c:06:30:f2:dc:07' },

  // Row 129: 0777 Ayush Kotwalla
  { serialNumber: 'LV4P56XRY0', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M3 16GB', staffId: 777, ram: '16 GB', processor: 'M3', macAddress: '6e:a6:a0:f9:32:26' },

  // Row 130: 0778 Vishal Sadawarte - IOS + Windows
  { serialNumber: 'FVFJ6JFE1WFV', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 8GB', staffId: 778, ram: '8 GB', processor: 'M1', macAddress: 'aa:67:65:29:ff:0f' },
  { serialNumber: 'MP263CCV', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: 'Lenovo Thinkbook i5 11th Gen 16GB', staffId: 778, ram: '16 GB', processor: 'i5 11th Gen', macAddress: '8C:B8:7E:BF:BE:B3' },

  // Row 131: 0779 Sharan Shetty - IOS2
  { serialNumber: 'C02G8MA1Q6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 8GB', staffId: 779, ram: '8 GB', processor: 'M1', macAddress: '3c:a6:f6:2f:1d:12' },

  // Row 132: 0780 Priyans Singh - Windows
  { serialNumber: 'MP2639XH', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: 'Lenovo Thinkbook i5 11th Gen 16GB', staffId: 780, ram: '16 GB', processor: 'i5 11th Gen', macAddress: '8C:B8:7E:B4:0D:66' },

  // Row 133: 0782 Adarsh Shrivastava - Windows (IOS has no serial)
  { serialNumber: 'MP28PT90', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: 'Lenovo Thinkbook i5 11th Gen 16GB', staffId: 782, ram: '16 GB', processor: 'i5 11th Gen', macAddress: '08:8E:90:DE:9E:0F' },

  // Row 134: 0784 Prajwal Nivangune - Windows
  { serialNumber: 'MP263C98', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: 'Lenovo Thinkbook i5 11th Gen 16GB', staffId: 784, ram: '16 GB', processor: 'i5 11th Gen', macAddress: '8C:B8:7E:BF:BF:8F' },

  // Row 135: 0785 Siddhi Algude
  { serialNumber: 'C02T3KLVFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 8GB', staffId: 785, ram: '8 GB', processor: 'M1', macAddress: '18:65:90:cb:1b:25' },

  // Row 136: 0786 Aamaan Sharma
  { serialNumber: 'C02G8W1CQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 8GB', staffId: 786, ram: '8 GB', processor: 'M1', macAddress: '3C:A6:F6:39:86:45' },

  // Row 137: 0787 Vedant Gadekar
  { serialNumber: 'MCXR2YG66T', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M2 Pro 16GB', staffId: 787, ram: '16 GB', processor: 'M2 Pro', macAddress: '6C:7E:67:C0:C2:BF' },

  // Row 138: 0788 Prathamesh Thorat
  { serialNumber: 'C02JH7TYQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 8GB', staffId: 788, ram: '8 GB', processor: 'M1', macAddress: 'C0:95:6D:2B:70:22' },

  // Row 139: 0789 Atharva Prabhune
  { serialNumber: 'FVFXN1RHHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro i5 8GB', staffId: 789, ram: '8 GB', processor: 'i5', macAddress: 'f0:18:98:56:17:fe' },

  // Row 140: 0790 Kaustubh Sharma
  { serialNumber: 'FVFKT6HT1WFV', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 8GB', staffId: 790, ram: '8 GB', processor: 'M1', macAddress: '10:b5:88:76:04:34' },

  // Row 141: 0792 Omkar Raje
  { serialNumber: 'C02FD237ML7H', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro i5 16GB', staffId: 792, ram: '16 GB', processor: 'i5', macAddress: '90:9c:4a:d3:09:3b' },

  // Row 142: 0793 Rashi Agarwal
  { serialNumber: 'NH4HKX9LM', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M2 Pro 8GB', staffId: 793, ram: '8 GB', processor: 'M2 Pro', macAddress: 'a4:cf:99: 50:8e:e6' },

  // Row 143: 0794 Kratika Sharma
  { serialNumber: 'C02HK45QJR9V', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro i5 8GB', staffId: 794, ram: '8 GB', processor: 'i5', macAddress: '68:2f:67:81:2e:5b' },

  // Row 144: 0796 Vaibhavi Wadje - IOS + Windows
  { serialNumber: 'FVFXP23UJK78', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air i5 8GB', staffId: 796, ram: '8 GB', processor: 'i5', macAddress: '38:f9:d3:2c:63:4b' },
  { serialNumber: 'PF1M6BT7', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', notes: 'Lenovo Thinkpad i5 16GB', staffId: 796, ram: '16 GB', processor: 'i5', macAddress: '98-3B-8F-FB-4F-55' },

  // Row 145: 0797 Deepak Kumar - IOS + Windows
  { serialNumber: 'C02JJ9K3Q6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 8GB', staffId: 797, ram: '8 GB', processor: 'M1', macAddress: 'C0:95:6D:32:C4:C7' },
  { serialNumber: 'MJ0FPFXE', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', notes: 'Lenovo Thinkpad i7 11th Gen 16GB', staffId: 797, ram: '16 GB', processor: 'i7 11th Gen', macAddress: '08-6A-C5-4A-EA-A2' },

  // Row 146: 0799 Akshata Shirke
  { serialNumber: 'C02JMBPLQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 8GB', staffId: 799, ram: '8 GB', processor: 'M1', macAddress: 'c0:95:6d:35:81:ac' },

  // Row 147: 0800 Rahul Mishra - Windows
  { serialNumber: 'MP26A47W', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 14', notes: 'Lenovo ThinkBook 14 i5 11th Gen 16GB', staffId: 800, ram: '16 GB', processor: 'i5 - 11th Gen Intel', macAddress: '8C:B8:7E:BF: BE:59' },

  // Row 148: 0801 Rakhi Khairnar - IOS + Windows
  { serialNumber: 'C02KC2EUQ6L7', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 8GB', staffId: 801, ram: '8 GB', processor: 'M1', macAddress: '10:b5:88:51:7c:55' },
  { serialNumber: 'PF4099BF', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', notes: 'Lenovo ThinkPad 12th Gen Intel 32GB', staffId: 801, ram: '32 GB', processor: '12th Gen Intel', macAddress: '02:93:37:9c:14:90' },

  // Row 149: 0802 Sakshi Jaiswal
  { serialNumber: 'LY04WH9JFC', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M3 Pro 8GB', staffId: 802, ram: '8 GB', processor: 'M3 Pro', macAddress: '50:a6:d8:a5:5b:70' },

  // Row 150: 0803 Chaitraly Bhagyawant
  { serialNumber: 'C02G1UV8Q6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 8GB', staffId: 803, ram: '8 GB', processor: 'M1', macAddress: '3c:a6:f6:02:13:32' },

  // Row 151: 0804 Sehar Sharma - Windows
  { serialNumber: 'MP263C6R', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 14', notes: 'Lenovo ThinkBook 14 i5 11th Gen 16GB', staffId: 804, ram: '16 GB', processor: 'i5 - 11th Gen Intel', macAddress: '8C:B8:7E:B4:0C:3F' },

  // Row 152: 0419 Suyash Ukidve
  { serialNumber: 'XJ0K62H6GF', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 Pro 16GB', staffId: 419, ram: '16 GB', processor: 'M1 Pro', macAddress: 'f8:4d:89:90:2e:11' },

  // Row 153: 0806 Piyush Prakash Kundalkar - Windows
  { serialNumber: 'MP22F48C', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 15', notes: 'Lenovo ThinkBook 15 i5 11th Gen 16GB', staffId: 806, ram: '16 GB', processor: 'i5 - 11th Gen Intel', macAddress: '80:B6:55:F8:30:1D' },

  // Row 154: 0807 Ayman Ashfaq Ahmed Parkar
  { serialNumber: 'C02G8M5MQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 8GB', staffId: 807, ram: '8 GB', processor: 'M1', macAddress: 'ce:f4:02:06:6a:a7' },

  // Row 155: 0808 Karishma Shubham Khadge
  { serialNumber: 'C02JMBS7Q6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 8GB', staffId: 808, ram: '8 GB', processor: 'M1', macAddress: 'da:6a:b9:ea:08:9b' },

  // Row 156: 0811 Amaan Navaj Mulla
  { serialNumber: 'C02KC2EWQ6L7', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 8GB', staffId: 811, ram: '8 GB', processor: 'M1', macAddress: '10:b5:88:4c:b2:9a' },

  // Row 157: 0812 Herika Koshti - 2 IOS
  { serialNumber: 'C02FW7QGMD6M', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro Intel i7 16GB', staffId: 812, ram: '16 GB', processor: 'Intel i7', macAddress: '88:66:5a:43:c0:69' },
  { serialNumber: 'NCQ0HJ75LQ', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M2 Pro 8GB', staffId: 812, ram: '8 GB', processor: 'M2 Pro', macAddress: '04:9d:05:d8:bd:cf' },

  // Row 158: 0813 Dheeraj Rapelli
  { serialNumber: 'FVFF9BJ9Q05D', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M1 8GB', staffId: 813, ram: '8 GB', processor: 'M1', macAddress: 'a0:78:17:88:76:63' },

  // Row 159: 0814 Ekta Kishore - IOS + Windows
  { serialNumber: 'G62X90NL71', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro M2 Pro 16GB', staffId: 814, ram: '16 GB', processor: 'M2 Pro', macAddress: '6C:7E:67:BE:77:49' },
  { serialNumber: 'MP263A6K', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 14', notes: 'Lenovo ThinkBook 14 i5 11th Gen 16GB', staffId: 814, ram: '16 GB', processor: 'i5 - 11th Gen Intel', macAddress: '70:1A:B8:7D:D7:19' },

  // Row 160: 0815 Kaustubh Vaidya - Windows
  { serialNumber: 'MP25X01S', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook 14', notes: 'Lenovo Thinkbook 14 i5 11th Gen 16GB', staffId: 815, ram: '16 GB', processor: 'i5 - 11th Gen Intel', macAddress: '70:1A:B8:00:2C:01' },

  // Row 161: 0816 Yash Dubey - Windows
  { serialNumber: 'B75346BB', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: 'Lenovo ThinkBook i5 11th Gen 8GB', staffId: 816, ram: '8 GB', processor: 'i5 - 11th Gen Intel', macAddress: '40:1C:83:DA:D1:67' },

  // Row 162: 0817 Lakshmi Vishwakarma
  { serialNumber: 'C02G7BRCML7H', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro i5 16GB', staffId: 817, ram: '16 GB', processor: 'i5', macAddress: '68:2f:67:91:83:9f' },

  // Row 163: 0818 Prajwal Shinde
  { serialNumber: 'FVFX6UVHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro i5 8GB', staffId: 818, ram: '8 GB', processor: 'i5', macAddress: 'f0:18:98:2c:58:84' },

  // Row 164: 0819 Pornima Bharuka
  { serialNumber: 'FVFXN1QTHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro i5 8GB', staffId: 819, ram: '8 GB', processor: 'i5', macAddress: 'f0:18:98:97:8d:ca' },

  // Row 165: 0820 Sandesh Sahare - IOS2
  { serialNumber: 'M2JMGGJ46R', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M3 16GB', staffId: 820, ram: '16 GB', processor: 'M3', macAddress: 'C4:84:FC:0D:E2:3C' },

  // Row 166: 0821 Rahul Kedari
  { serialNumber: 'FVFXB6GHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro i5 8GB', staffId: 821, ram: '8 GB', processor: 'i5', macAddress: 'f0:18:98:42:31:e9' },

  // Row 167: 0822 Vaibhav Sarswat
  { serialNumber: 'FVWKFL9HV22', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro i5 8GB', staffId: 822, ram: '8 GB', processor: 'i5', macAddress: '88:e9:fe:52:d1:0f' },

  // Row 168: 0823 Rushikesh Nimkar
  { serialNumber: 'FVFXN1PEHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro i5 8GB', staffId: 823, ram: '8 GB', processor: 'i5', macAddress: 'f0:18:98:4f:ea:2f' },

  // Row 169: 0824 Advait Patil
  { serialNumber: 'FVFX0P0R0HV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro i5 8GB', staffId: 824, ram: '8 GB', processor: 'i5', macAddress: 'f0:18:98:a1:9f:00' },

  // Row 170: 0825 Prathmesh Patil - IOS2
  { serialNumber: 'FVFXN1QCHV27', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'MacBook Pro i5 8GB', staffId: 825, ram: '8 GB', processor: 'i5', macAddress: 'F0:18:98:9D:4C:04' },

  // Row 171: 0826 Manan Devani
  { serialNumber: 'C02KC2E9Q6L7', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'MacBook Air M1 8GB', staffId: 826, ram: '8 GB', processor: 'M1', macAddress: '70:ae:d5:59:90:bf' },

  // ═══════════════════════════════════════════════════════════
  // SPARE / UNASSIGNED IOS LAPTOPS (staffId: 0 = no assignment, stays AVAILABLE)
  // ═══════════════════════════════════════════════════════════
  { serialNumber: 'FVFXQG04J1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'Spare MacBook Air i5 8GB', staffId: 0, ram: '8 GB', processor: 'i5', macAddress: '24:1B:7A:D4:53:A2' },
  { serialNumber: 'FVFWKRWZJ1WL', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'Spare MacBook Air i5 8GB - Battery Issue', staffId: 0, ram: '8 GB', processor: 'i5', macAddress: '10:94:BB:DD:FE:6C' },
  { serialNumber: 'C02G1ASMQ6L4', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'Spare MacBook Air M1 8GB', staffId: 0, ram: '8 GB', processor: 'M1', macAddress: '3C:A6:F6:04:F2:C1' },
  { serialNumber: 'C02Q4X2BFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'Spare MacBook Air i5 8GB', staffId: 0, ram: '8 GB', processor: 'i5', macAddress: 'A0:99:9B:1E:76:9F' },
  { serialNumber: 'C02TP8VFFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'Spare MacBook Pro i5 8GB', staffId: 0, ram: '8 GB', processor: 'i5', macAddress: '18:65:90:DF:1C:19' },
  { serialNumber: 'FVFZ87CGJ1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'Spare MacBook Air i5 8GB', staffId: 0, ram: '8 GB', processor: 'i5', macAddress: '98:46:0A:A0:74:C6' },
  { serialNumber: 'C02T7C4YFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'Spare MacBook Pro i5 8GB', staffId: 0, ram: '8 GB', processor: 'i5', macAddress: 'F4:5C:89:94:85:8B' },
  { serialNumber: 'FVHXJCF5J1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'Spare MacBook Air i5 8GB', staffId: 0, ram: '8 GB', processor: 'i5', macAddress: '14:C2:13:0F:C7:EC' },
  { serialNumber: 'C02Q4KXWFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'Spare MacBook Pro i5 8GB', staffId: 0, ram: '8 GB', processor: 'i5', macAddress: 'A0:99:9B:1C:EC:E5' },
  { serialNumber: 'FVFVV6T66J1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'Spare MacBook Air i5 8GB', staffId: 0, ram: '8 GB', processor: 'i5', macAddress: 'D0:81:7A:C8:CC:E4' },
  { serialNumber: 'FVFXJ7DXJ1WK', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Air', notes: 'Spare MacBook Air i5 8GB', staffId: 0, ram: '8 GB', processor: 'i5', macAddress: '14:C2:13:0C:F5:16' },
  { serialNumber: 'C17R00QNFVH3', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro', notes: 'Spare MacBook Pro i5 8GB', staffId: 0, ram: '8 GB', processor: 'i5', macAddress: 'C4:B3:01:C9:81:1F' },

  // ═══════════════════════════════════════════════════════════
  // SPARE / UNASSIGNED WINDOWS LAPTOPS (staffId: 0 = no assignment, stays AVAILABLE)
  // ═══════════════════════════════════════════════════════════
  { serialNumber: 'PF58WMLA', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', notes: 'Spare Thinkpad Win 11 Pro Ultra 7 16GB 477GB', staffId: 0, ram: '16 GB', processor: 'Ultra 7', macAddress: '70:15:FB:1E:1E:64' },
  { serialNumber: 'PF58YTLG', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', notes: 'Spare Thinkpad Win 11 Pro Ultra 7 16GB 477GB', staffId: 0, ram: '16 GB', processor: 'Ultra 7', macAddress: '30:E3:A4:9D:87:E' },
  { serialNumber: 'PF58GNC7', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', notes: 'Spare Thinkpad Win 11 Pro Ultra 7 16GB 477GB', staffId: 0, ram: '16 GB', processor: 'Ultra 7', macAddress: '70:15:FB:1D:9A:6B' },
  { serialNumber: 'PG01F5CR20', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', notes: 'Spare Thinkpad Win 10 i5 8GB 237GB', staffId: 0, ram: '8 GB', processor: 'i5', macAddress: '18:1D:EA:5D6B:EA' },
  { serialNumber: '20U1S05Y00', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', notes: 'Spare Thinkpad Win 11 Pro i5 16GB 477GB', staffId: 0, ram: '16 GB', processor: 'i5', macAddress: '34:CF:FC:69:51:F9' },
  { serialNumber: '20lts0ma00_spare', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', notes: 'Spare Thinkpad Win 10 Pro i5 16GB 237GB', staffId: 0, ram: '16 GB', processor: 'i5', macAddress: '8C:16:45:88:1F:4F' },
  { serialNumber: '20KNSODL00', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', notes: 'Spare Thinkpad Win 11 i5 16GB 1TB', staffId: 0, ram: '16 GB', processor: 'i5', macAddress: '34:E1:2D:60:1E:90' },
  { serialNumber: '20KNA02QIG', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', notes: 'Spare Thinkpad Win 10 Pro i5 16GB 237GB', staffId: 0, ram: '16 GB', processor: 'i5', macAddress: 'E8:6A:64:33:7A:40' },
  { serialNumber: 'MP24BPDC', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: 'Spare ThinkBook Win 10 Pro i5 16GB 1TB', staffId: 0, ram: '16 GB', processor: 'i5', macAddress: '8C:1D:96:E7:5D:92' },
  { serialNumber: 'MP263CG4', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: 'Spare ThinkBook Win 11 i5 40GB 477GB', staffId: 0, ram: '40 GB', processor: 'i5', macAddress: '70:1A:B8:72:8A:F3' },
  { serialNumber: 'MP263A1J', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: 'Spare ThinkBook Win 11 i5 40GB 477GB', staffId: 0, ram: '40 GB', processor: 'i5', macAddress: '8C:B8:7E:FC:2F:AC' },
  { serialNumber: '20KNA02QIG_2', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', notes: 'Spare Thinkpad Win 11 Pro i5 32GB 237GB', staffId: 0, ram: '32 GB', processor: 'i5', macAddress: '18:1B:EA:3C:D5:B6' },
  { serialNumber: 'MP24BWTM', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: 'Spare ThinkBook Win 11 Pro i5 40GB 466GB', staffId: 0, ram: '40 GB', processor: 'i5', macAddress: 'F4:A4:75:00:47:C2' },
  { serialNumber: 'SPARE_WIN_14', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', notes: 'Spare Thinkpad Win 10 Pro i5 8GB', staffId: 0, ram: '8 GB', processor: 'i5', macAddress: '54:E1:AD:61:BC:90' },
  { serialNumber: 'SPARE_WIN_15', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: 'Spare ThinkBook Win 11 Pro i5 40GB 477GB', staffId: 0, ram: '40 GB', processor: 'i5', macAddress: 'E8:84:15:44:E4:E0' },
  { serialNumber: 'SPARE_WIN_16', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkBook', notes: 'Spare ThinkBook Win 11 Pro i5 40GB 477GB', staffId: 0, ram: '40 GB', processor: 'i5', macAddress: 'E8:84:15:44:E5:2B' },
  { serialNumber: 'SPARE_WIN_17', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', notes: 'Spare Thinkpad Win 10 Pro i5 16GB', staffId: 0, ram: '16 GB', processor: 'i5', macAddress: 'E8:6A:64:33:71:3B' },
  { serialNumber: 'PF3TVT5N', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', notes: 'Spare Thinkpad Win 11 Pro i7 48GB', staffId: 0, ram: '48 GB', processor: 'i7', macAddress: 'F4:A4:75:A1:8F:D3' },
  { serialNumber: 'PG011WG9', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', notes: 'Spare Thinkpad Win 10 Pro i5 16GB 122GB', staffId: 0, ram: '16 GB', processor: 'i5', macAddress: '1C:4D:70:64:1F:54' },
  { serialNumber: 'SPARE_WIN_20', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', notes: 'Spare Thinkpad Win 10 Pro i5 16GB 338GB', staffId: 0, ram: '16 GB', processor: 'i5', macAddress: 'E8:6A:64:57:C9:C3' },
  { serialNumber: 'SPARE_WIN_21', assetType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad', notes: 'Spare Thinkpad Win 10 Pro i5 32GB 447GB', staffId: 0, ram: '32 GB', processor: 'i5', macAddress: '0C:54:15:61:7D:18' },
];

async function seedAssetsAndAssignments(adminUserId: number) {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  STEP 4 & 5: Assets + Assignments');
  console.log('═══════════════════════════════════════════════════\n');

  const electronicsCategory = await prisma.assetCategory.findFirst({ where: { name: 'Electronics' } });
  if (!electronicsCategory) throw new Error('Electronics category not found');

  const stats = { assetsCreated: 0, assignmentsCreated: 0, failed: 0 };

  for (const entry of assetsData) {
    try {
      let assetType = await prisma.assetType.findFirst({ where: { name: entry.assetType } });
      if (!assetType) {
        const fallbackTemplate =
          entry.assetType === 'Laptop'
            ? LAPTOP_SPEC_TEMPLATE
            : entry.assetType === 'Mobile'
              ? MOBILE_SPEC_TEMPLATE
              : undefined;
        assetType = await prisma.assetType.create({
          data: {
            name: entry.assetType,
            categoryId: electronicsCategory.id,
            specificationTemplate: fallbackTemplate
              ? (fallbackTemplate as unknown as Prisma.InputJsonValue)
              : undefined,
            createdBy: adminUserId,
            updatedBy: adminUserId,
          },
        });
      }

      let brand = await prisma.brand.findFirst({ where: { name: entry.brand } });
      if (!brand) {
        brand = await prisma.brand.create({
          data: { name: entry.brand, createdBy: adminUserId, updatedBy: adminUserId },
        });
      }

      let model = await prisma.model.findFirst({ where: { name: entry.model, brandId: brand.id } });
      if (!model) {
        model = await prisma.model.create({
          data: { name: entry.model, brandId: brand.id, assetTypeId: assetType.id, createdBy: adminUserId, updatedBy: adminUserId },
        });
      }

      const existing = await prisma.asset.findUnique({ where: { serialNumber: entry.serialNumber } });
      if (existing) {
        console.log(`  Skipping existing asset: ${entry.serialNumber}`);
        continue;
      }

      const maxAsset = await prisma.asset.findFirst({ orderBy: { id: 'desc' }, select: { assetId: true } });
      let nextNum = 1;
      if (maxAsset?.assetId) {
        const m = maxAsset.assetId.match(/AST-(\d+)/);
        if (m) nextNum = parseInt(m[1]) + 1;
      }
      const assetId = `AST-${String(nextNum).padStart(4, '0')}`;

      const specifications: Record<string, string> = {};
      if (entry.ram) specifications.ram = entry.ram;
      if (entry.processor) specifications.processor = entry.processor;
      if (entry.macAddress) specifications.macAddress = entry.macAddress;

      const asset = await prisma.asset.create({
        data: {
          assetId,
          serialNumber: entry.serialNumber,
          assetTypeId: assetType.id,
          brandId: brand.id,
          modelId: model.id,
          status: 'NON_ASSIGNED',
          condition: 'WORKING_CONDITION',
          location: 'PUNE_INVENTORY_CENTER',
          notes: entry.notes || null,
          specifications: Object.keys(specifications).length > 0 ? specifications : undefined,
          createdBy: adminUserId,
          updatedBy: adminUserId,
        },
      });
      stats.assetsCreated++;

      // Assign to employee
      const employeeId = pad(entry.staffId, 4);
      const employee = await prisma.employee.findUnique({ where: { employeeId } });

      if (employee) {
        const issueDate = new Date();
        issueDate.setHours(0, 0, 0, 0);
        const issueTimestamp = new Date();

        const issue = await prisma.assetIssue.create({
          data: {
            assetId: asset.id,
            employeeId: employee.id,
            issuedBy: adminUserId,
            issueDate,
            issueTimestamp,
            issueCondition: AssetCondition.NEW,
            issueReason: 'Initial Assignment',
            notes: 'Assigned via updated April 2026 seed',
            createdBy: adminUserId,
            updatedBy: adminUserId,
          },
        });

        await prisma.assetEvent.create({
          data: {
            assetId: asset.id,
            eventType: AssetEventType.ASSET_ISSUED,
            eventDate: issueTimestamp,
            performedBy: adminUserId,
            metadata: {
              assignmentId: issue.id,
              employeeId: employee.employeeId,
              employeeName: `${employee.firstName} ${employee.lastName}`,
              issuedBy: 'admin',
              issueDate: issueDate.toISOString().split('T')[0],
              issueCondition: AssetCondition.NEW,
              issueReason: 'Initial Assignment',
              previousStatus: 'NON_ASSIGNED',
              newStatus: 'ASSIGNED',
              issuedVia: 'SeedData',
            },
          },
        });

        await prisma.asset.update({
          where: { id: asset.id },
          data: { status: AssetStatus.ASSIGNED, updatedBy: adminUserId },
        });

        stats.assignmentsCreated++;
      }

      if (stats.assetsCreated % 50 === 0) {
        console.log(`  Processed ${stats.assetsCreated} assets...`);
      }
    } catch (error: any) {
      stats.failed++;
      console.error(`  Failed: ${entry.serialNumber} - ${error.message}`);
    }
  }

  console.log(`\nAssets created: ${stats.assetsCreated}`);
  console.log(`Assignments created: ${stats.assignmentsCreated}`);
  console.log(`Failed: ${stats.failed}`);
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  UPDATED APRIL 2026 - COMPLETE DATABASE SEED          ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  console.log('WARNING: This will DELETE ALL existing data!\n');

  try {
    const adminUserId = await cleanAndCreateAdmin();
    await seedAssetStructure(adminUserId);
    await seedEmployees(adminUserId);
    await seedAssetsAndAssignments(adminUserId);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  SEEDING COMPLETE                                     ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`\nDuration: ${duration}s`);
    console.log('\nAdmin Login: username=admin, password=Admin@123');
  } catch (error) {
    console.error('\nSeeding FAILED:', error);
    process.exit(1);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('Fatal error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
