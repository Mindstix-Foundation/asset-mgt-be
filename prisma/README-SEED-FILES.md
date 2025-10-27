# CSV Seed Files Documentation

This document explains the seed files created to import employee and asset data from CSV files into the database.

## Overview

Four seed files have been created to populate the database with employee and asset data from CSV files:

1. **seed-employees-from-csv.ts** - Creates employees
2. **seed-asset-categories.ts** - Creates asset categories, types, brands, and models
3. **seed-assets.ts** - Creates assets with serial numbers
4. **seed-asset-assignments.ts** - Assigns assets to employees

## Seed Files Execution Order

The seed files must be run in the following order:

1. **seed.ts** (main seed file - creates admin user)
2. **seed-employees-from-csv.ts**
3. **seed-asset-categories.ts**
4. **seed-assets.ts**
5. **seed-asset-assignments.ts**

## Running the Seed Files

### Step 1: Run the main seed file (if not already run)

```bash
cd /home/mindstix/Documents/Mindstix-Foundation/asset-mgt-be
npm run seed
```

This creates the admin user and basic system data.

### Step 2: Seed employees from CSV

```bash
npx ts-node prisma/seed-employees-from-csv.ts
```

This will:
- Format staff IDs with leading zeros (e.g., 22 → 0022)
- Split names into first name and last name (last word is last name)
- Generate emails as `lastname@mindstix.com`
- Create 197 employees from the CSV data

### Step 3: Seed asset categories and types

```bash
npx ts-node prisma/seed-asset-categories.ts
```

This will:
- Create the "Electronics" asset category
- Create 20 unique asset types extracted from CSV columns:
  - iPhone
  - MacBook
  - Windows
  - iPad
  - Display
  - Apple Pencil
  - Pixel 2xl
  - POCO F4
  - Redmi Note 12 5G
  - Samsung M30
  - M12
  - Redmi Note 9 Pro Max
  - Samsung Galaxy A21s
  - Redmi Note 10S
  - Flip3
  - Redmi 11 Prime 5G
  - Pixel 2XL
  - Redmi
  - Samsung M35
  - Zemperium Windows
- Create brands (same names as asset types)
- Create models (same names as asset types)

### Step 4: Seed assets

```bash
npx ts-node prisma/seed-assets.ts
```

This will:
- Create all assets with serial numbers from the CSV
- Set brand and model same as asset type
- Set location to "Pune"
- Set condition to "NEW"
- Set status to "AVAILABLE"
- Create approximately 600+ assets

### Step 5: Seed asset assignments

```bash
npx ts-node prisma/seed-asset-assignments.ts
```

This will:
- Assign assets to corresponding employees based on Sheet1 mapping
- Create asset issue records
- Update asset status to "ASSIGNED"

## Data Mapping Details

### Employee Data (from Sheet1.csv)

- **Staff ID**: Formatted to 4 digits with leading zeros (e.g., 1 → 0001, 22 → 0022)
- **Name**: Split into first name and last name
  - Last word = Last Name
  - Everything before last word = First Name
  - Example: "Roshan Kulkarni" → First Name: "Roshan", Last Name: "Kulkarni"
- **Email**: Generated as `firstname.lastname@mindstix.com`
  - Example: "Roshan Kulkarni" → "roshan.kulkarni@mindstix.com"
  - Multi-word first names are joined with dots: "Amogasiddha Vitthal Chougule" → "amogasiddha.vitthal.chougule@mindstix.com"
- **Phone**: Generated as `+91 9000000000 + staffId`

### Asset Types (from Laptop Type columns)

Extracted all unique values from:
- Laptop Type
- Laptop Type.1
- Laptop Type.2
- Laptop Type.3
- Laptop Type.4
- Laptop Type.5
- Laptop Type.6
- Laptop Type.7

### Asset Data

- **Serial Number**: Taken directly from CSV
- **Asset Type**: Taken from "Laptop Type" columns
- **Brand**: Same as asset type
- **Model**: Same as asset type
- **Location**: "Pune" (hardcoded)
- **Condition**: "NEW" (hardcoded)
- **Status**: "AVAILABLE" initially, then "ASSIGNED" after assignment

### Asset Assignments

Based on the mapping in Sheet1.csv:
- Each employee (Staff ID) has multiple serial numbers listed across columns (Laptop 1-8)
- The seed file maps these serial numbers to the corresponding employee
- Creates AssetIssue records with issueDate set to current date

## Notes

- All seed files check for existing data and skip duplicates
- Admin user is required for audit fields (createdBy, updatedBy)
- Asset assignments will only work for assets that exist and are AVAILABLE
- Error handling is included for missing employees, assets, or invalid data

## Verification

After running all seed files, you can verify the data:

```bash
# Check employee count
npx prisma studio
```

Expected results:
- ~197 employees (from CSV + 1 admin + 35 sample employees)
- 20 asset types
- 20 brands
- 20 models
- 600+ assets
- 600+ asset assignments

## Troubleshooting

### If admin user not found
Run the main seed file first:
```bash
npm run seed
```

### If asset types not found
Make sure to run seed-asset-categories.ts before seed-assets.ts

### If employees not found
Make sure to run seed-employees-from-csv.ts before seed-asset-assignments.ts

### If duplicate serial numbers
The seed files will skip duplicates automatically

## Clean Up

To reset and re-run all seeds:

```bash
# Reset database
npx prisma migrate reset

# Run all seeds in order
npm run seed
npx ts-node prisma/seed-employees-from-csv.ts
npx ts-node prisma/seed-asset-categories.ts
npx ts-node prisma/seed-assets.ts
npx ts-node prisma/seed-asset-assignments.ts
```

