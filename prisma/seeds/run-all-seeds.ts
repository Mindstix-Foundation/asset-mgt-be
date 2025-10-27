/**
 * 🌱 MASTER SEED SCRIPT - Run All Seeds in Order
 * 
 * This script runs all seed files in the correct order:
 * 1. Clean database & create admin user
 * 2. Create asset structure (categories, types, brands, models)
 * 3. Create 325 assets with proper categorization
 * 4. Create 196 employees from data
 * 5. Assign all assets to employees
 * 
 * Usage:
 *   From project root: npx ts-node prisma/seeds/run-all-seeds.ts
 *   From prisma folder: npx ts-node seeds/run-all-seeds.ts
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const seedFiles = [
  {
    name: 'Clean Database & Create Admin',
    file: '01-clean-and-admin.seed.ts',
    description: 'Cleans all data and creates admin user',
  },
  {
    name: 'Asset Structure',
    file: '02-asset-structure.seed.ts',
    description: 'Creates categories, types, brands, and models',
  },
  {
    name: 'Assets',
    file: '03-assets.seed.ts',
    description: 'Creates 325 assets with proper categorization',
  },
  {
    name: 'Employees',
    file: '04-employees.seed.ts',
    description: 'Creates 196 employee records',
  },
  {
    name: 'Asset Assignments',
    file: '05-asset-assignments.seed.ts',
    description: 'Assigns 325 assets to employees',
  },
];

async function runSeedFile(seedFile: typeof seedFiles[0], index: number) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📋 Step ${index + 1}/${seedFiles.length}: ${seedFile.name}`);
  console.log(`📄 File: ${seedFile.file}`);
  console.log(`📝 ${seedFile.description}`);
  console.log('='.repeat(80));
  console.log();

  try {
    const { stdout, stderr } = await execAsync(
      `npx ts-node prisma/seeds/${seedFile.file}`,
      { maxBuffer: 10 * 1024 * 1024 } // 10MB buffer
    );

    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    console.log(`\n✅ ${seedFile.name} completed successfully!\n`);
    return true;
  } catch (error: any) {
    console.error(`\n❌ Error in ${seedFile.name}:`);
    console.error(error.message);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    return false;
  }
}

async function main() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    🌱 MASTER DATABASE SEEDING                             ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`📊 Total seed files: ${seedFiles.length}`);
  console.log('⏱️  Estimated time: 30-60 seconds');
  console.log();
  console.log('⚠️  WARNING: This will DELETE ALL existing data from the database!');
  console.log();

  const startTime = Date.now();
  let successCount = 0;
  let failedStep: string | null = null;

  for (let i = 0; i < seedFiles.length; i++) {
    const success = await runSeedFile(seedFiles[i], i);
    
    if (!success) {
      failedStep = seedFiles[i].name;
      break;
    }
    
    successCount++;
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                         📊 SEEDING SUMMARY                                ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
  console.log();

  if (failedStep) {
    console.log(`❌ Seeding FAILED at: ${failedStep}`);
    console.log(`✅ Completed: ${successCount}/${seedFiles.length} steps`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log();
    console.log('Please check the error messages above and fix the issues.');
    console.log('You can re-run individual seed files or run this script again.');
    process.exit(1);
  } else {
    console.log('🎉 All seed files completed successfully!');
    console.log(`✅ Completed: ${successCount}/${seedFiles.length} steps`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log();
    console.log('📦 Database State:');
    console.log('   ✓ Admin user created (username: admin, password: Admin@123)');
    console.log('   ✓ Asset structure created (categories, types, brands, models)');
    console.log('   ✓ 325 Assets created with proper categorization');
    console.log('   ✓ Employees created from CSV');
    console.log('   ✓ Assets assigned to employees');
    console.log();
    console.log('🔐 Admin Login Credentials:');
    console.log('   Username: admin');
    console.log('   Password: Admin@123');
    console.log();
    console.log('⚠️  Remember to change the admin password after first login!');
    console.log();
  }
}

main()
  .then(() => {
    console.log('✨ Master seeding completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error in master seeding:', error);
    process.exit(1);
  });

