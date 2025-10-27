# CSV Data Import Seed Files - Complete Summary

## 📋 Overview

Four seed files have been created to import employee and asset data from CSV files into the TrackStix asset management system database.

## 📁 Files Created

### Seed Files (in `/prisma` directory)

1. **seed-employees-from-csv.ts** - Creates 197 employees from CSV data
2. **seed-asset-categories.ts** - Creates asset categories, types, brands, and models
3. **seed-assets.ts** - Creates 600+ assets with serial numbers
4. **seed-asset-assignments.ts** - Assigns assets to employees

### Helper Scripts

5. **run-csv-seeds.sh** - Bash script to run all seeds in correct order
6. **README-SEED-FILES.md** - Detailed documentation

## 🎯 Data Processing Logic

### Employee Data Processing (from Sheet1.csv)

```
Input: Staff ID: 22, Name: "Hardik Patel"

Processing:
- Staff ID: 22 → 0022 (4 digits with leading zeros)
- Name: "Hardik Patel" → First Name: "Hardik", Last Name: "Patel"
- Email: Generated as "hardik.patel@mindstix.com" (firstname.lastname@mindstix.com)
- Phone: Generated as "+91 9000000022" (+91 9000000000 + staffId)
- Status: ACTIVE

Output:
{
  employeeId: "0022",
  firstName: "Hardik",
  lastName: "Patel",
  email: "hardik.patel@mindstix.com",
  phone: "+91 9000000022",
  status: "ACTIVE"
}
```

### Asset Type Extraction (from Laptop Type columns)

All unique device types were extracted from columns:
- Laptop Type
- Laptop Type.1
- Laptop Type.2
- ... (up to Laptop Type.7)

**20 Unique Asset Types Identified:**
1. iPhone
2. MacBook
3. Windows
4. iPad
5. Display
6. Apple Pencil
7. Pixel 2xl
8. POCO F4
9. Redmi Note 12 5G
10. Samsung M30
11. M12
12. Redmi Note 9 Pro Max
13. Samsung Galaxy A21s
14. Redmi Note 10S
15. Flip3
16. Redmi 11 Prime 5G
17. Pixel 2XL
18. Redmi
19. Samsung M35
20. Zemperium Windows

### Asset Creation Logic

```
Input: Serial Number: "FVFF80V7Q05Q", Type: "MacBook"

Processing:
- Asset ID: Auto-generated (AST + timestamp + random)
- Serial Number: "FVFF80V7Q05Q"
- Asset Type: "MacBook"
- Brand: "MacBook" (same as type)
- Model: "MacBook" (same as type)
- Location: "Pune" (hardcoded)
- Condition: "NEW" (hardcoded)
- Status: "AVAILABLE" (initially)

Output: Asset created with all these properties
```

### Asset Assignment Logic

```
Input: Staff ID: 1, Serial Numbers: ["F5MQWRWF6R", "FVFF80V7Q05Q", ...]

Processing:
1. Find employee with employeeId "0001"
2. For each serial number:
   - Find asset by serial number
   - Create AssetIssue record
   - Update asset status to "ASSIGNED"

Output: All assets assigned to employee with issue records created
```

## 🚀 Quick Start

### Option 1: Using the Bash Script (Recommended)

```bash
cd /home/mindstix/Documents/Mindstix-Foundation/asset-mgt-be
./run-csv-seeds.sh
```

This script will:
- Check if admin user exists (run main seed if not)
- Run all 4 seed files in the correct order
- Provide progress updates
- Show success/failure status for each step

### Option 2: Manual Execution

```bash
cd /home/mindstix/Documents/Mindstix-Foundation/asset-mgt-be

# Step 1: Ensure admin user exists
npm run seed

# Step 2: Seed employees
npx ts-node prisma/seed-employees-from-csv.ts

# Step 3: Seed asset categories
npx ts-node prisma/seed-asset-categories.ts

# Step 4: Seed assets
npx ts-node prisma/seed-assets.ts

# Step 5: Seed asset assignments
npx ts-node prisma/seed-asset-assignments.ts
```

## 📊 Expected Results

After successful execution:

| Data Type | Count | Description |
|-----------|-------|-------------|
| Employees | ~197 | From CSV data |
| Asset Categories | 1 | Electronics category |
| Asset Types | 20 | Unique device types |
| Brands | 20 | One per asset type |
| Models | 20 | One per asset type |
| Assets | 600+ | All devices from CSV |
| Asset Assignments | 600+ | All assets assigned to employees |

## 🔍 Data Verification

After running the seeds, verify the data:

```bash
# Open Prisma Studio
npx prisma studio
```

Or use SQL queries:

```sql
-- Check employee count
SELECT COUNT(*) FROM employees;

-- Check asset types
SELECT * FROM asset_types;

-- Check assets by type
SELECT at.name, COUNT(*) 
FROM assets a 
JOIN asset_types at ON a.asset_type_id = at.id 
GROUP BY at.name 
ORDER BY COUNT(*) DESC;

-- Check asset assignments
SELECT e.employee_id, e.first_name, e.last_name, COUNT(ai.id) as assigned_assets
FROM employees e
JOIN asset_issues ai ON e.id = ai.employee_id
WHERE ai.return_date IS NULL
GROUP BY e.id, e.employee_id, e.first_name, e.last_name
ORDER BY assigned_assets DESC;
```

## 🎨 Key Features

### ✅ Smart Data Processing

- **Employee ID Formatting**: Automatically pads staff IDs (22 → 0022)
- **Name Splitting**: Intelligently splits full names into first and last names
- **Email Generation**: Creates consistent email format (lastname@mindstix.com)
- **Unique Asset Types**: Automatically identifies and creates unique device types

### ✅ Error Handling

- **Duplicate Prevention**: Skips existing records using `skipDuplicates`
- **Missing Data**: Gracefully handles missing employees or assets
- **Validation**: Checks for required data before creating records
- **Progress Tracking**: Shows success/failure counts for each step

### ✅ Data Integrity

- **Foreign Key Relationships**: Properly links employees, assets, and assignments
- **Status Management**: Updates asset status when assigned
- **Audit Trail**: Records createdBy and updatedBy for all records
- **Timestamps**: Automatic timestamp tracking for all records

## 🛠️ Troubleshooting

### Issue: "Admin user not found"
**Solution**: Run the main seed file first:
```bash
npm run seed
```

### Issue: "Asset type not found"
**Solution**: Ensure seed-asset-categories.ts runs before seed-assets.ts

### Issue: "Employee not found"
**Solution**: Ensure seed-employees-from-csv.ts runs before seed-asset-assignments.ts

### Issue: "Duplicate serial number"
**Solution**: The seed files automatically skip duplicates. If you want to re-import:
```bash
npx prisma migrate reset
./run-csv-seeds.sh
```

## 📝 CSV File Locations

The seed files reference data from:
- `/home/mindstix/Documents/Mindstix-Foundation/asset-mgt-fe/sid asset files/sid asset file - Sheet1.csv`
- `/home/mindstix/Documents/Mindstix-Foundation/asset-mgt-fe/sid asset files/sid asset file - Inventory.csv`
- `/home/mindstix/Documents/Mindstix-Foundation/asset-mgt-fe/sid asset files/sid asset file - Maintenance.csv`

Note: The data is hardcoded in the seed files, so the CSV files are only needed for reference.

## 🔄 Re-running Seeds

To completely reset and re-import all data:

```bash
# WARNING: This will delete ALL data in the database
npx prisma migrate reset

# Re-run all seeds
./run-csv-seeds.sh
```

To update specific data:
- Run individual seed files as needed
- The seed files will skip duplicates automatically

## 📚 Additional Resources

- **Detailed Documentation**: See `prisma/README-SEED-FILES.md`
- **Schema Reference**: See `prisma/schema.prisma`
- **Main Seed File**: See `prisma/seed.ts`

## ✨ Summary

All four seed files are ready to use and will populate your database with:
- ✅ 197 employees from CSV (properly formatted)
- ✅ 20 asset types (iPhone, MacBook, Windows, etc.)
- ✅ 600+ assets with serial numbers
- ✅ Complete asset assignments to employees

Just run `./run-csv-seeds.sh` and you're done! 🎉

