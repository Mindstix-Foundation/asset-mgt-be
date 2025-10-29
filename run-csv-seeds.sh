#!/bin/bash

# Script to run all CSV seed files in the correct order
# This script will populate the database with employee and asset data from CSV files

echo "🚀 Starting CSV seed process..."
echo ""

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the asset-mgt-be directory."
    exit 1
fi

# Check if admin user exists
echo "📋 Step 1/5: Checking for admin user..."
ADMIN_EXISTS=$(npx ts-node -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.user.findUnique({ where: { username: 'admin' } })
  .then(user => {
    if (user) {
      console.log('exists');
    } else {
      console.log('not-exists');
    }
  })
  .catch(() => console.log('error'))
  .finally(() => prisma.\$disconnect());
")

if [ "$ADMIN_EXISTS" = "not-exists" ] || [ "$ADMIN_EXISTS" = "error" ]; then
    echo "⚠️  Admin user not found. Running main seed file first..."
    npm run seed
    if [ $? -ne 0 ]; then
        echo "❌ Main seed failed. Exiting."
        exit 1
    fi
    echo ""
else
    echo "✅ Admin user found. Skipping main seed."
    echo ""
fi

# Step 2: Seed employees
echo "📋 Step 2/5: Seeding employees from CSV..."
npx ts-node prisma/seed-employees-from-csv.ts
if [ $? -ne 0 ]; then
    echo "❌ Employee seeding failed. Exiting."
    exit 1
fi
echo ""

# Step 3: Seed asset categories and types
echo "📋 Step 3/5: Seeding asset categories, types, brands, and models..."
npx ts-node prisma/seed-asset-categories.ts
if [ $? -ne 0 ]; then
    echo "❌ Asset categories seeding failed. Exiting."
    exit 1
fi
echo ""

# Step 4: Seed assets
echo "📋 Step 4/5: Seeding assets from CSV..."
npx ts-node prisma/seed-assets.ts
if [ $? -ne 0 ]; then
    echo "❌ Assets seeding failed. Exiting."
    exit 1
fi
echo ""

# Step 5: Seed asset assignments
echo "📋 Step 5/5: Seeding asset assignments..."
npx ts-node prisma/seed-asset-assignments.ts
if [ $? -ne 0 ]; then
    echo "❌ Asset assignments seeding failed. Exiting."
    exit 1
fi
echo ""

echo "🎉 All CSV seeds completed successfully!"
echo ""
echo "📊 Summary:"
echo "   ✅ Employees seeded"
echo "   ✅ Asset categories, types, brands, and models seeded"
echo "   ✅ Assets seeded"
echo "   ✅ Asset assignments seeded"
echo ""
echo "🔍 You can verify the data using: npx prisma studio"

