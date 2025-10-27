# Database Seeding Guide

## Overview

This directory contains seed files to populate the database with initial data. The seed files must be run in a specific order to maintain data integrity and foreign key relationships.

## 📁 Seed Files (in execution order)

```
prisma/
├── seed.ts                              # 1️⃣ Main seed - Cleans DB + Creates Admin
├── seed-asset-categories-updated.ts     # 2️⃣ Asset Structure (Categories, Types, Brands, Models)
├── seed-assets-final.ts                 # 3️⃣ Assets (325 assets with proper categorization)
├── seed-employees-from-csv.ts           # 4️⃣ Employees (from CSV data)
└── seed-asset-assignments.ts            # 5️⃣ Asset Assignments (assigns assets to employees)
```

---

## 🚀 Complete Seeding Sequence

### Prerequisites
- PostgreSQL database running
- Database connection configured in `.env`
- All dependencies installed (`npm install`)

---

### Step 1: Clean Database & Create Admin
```bash
npx ts-node prisma/seed.ts
```

**What it does:**
- 🧹 **Cleans entire database** (deletes all existing data)
- 👤 Creates admin user
  - Username: `admin`
  - Password: `Admin@123`
  - Employee ID: `0001`
- 🔐 Creates ADMIN role
- ✅ Sets up audit trail

**⚠️ WARNING:** This deletes ALL existing data! Back up first if needed.

**Output:**
```
🧹 Cleaning database...
  🗑️  Deleting notifications...
  🗑️  Deleting users...
  ... (all tables)
✅ Database cleaned successfully!

🌱 Starting admin seed...
✅ Admin user created

🎉 Database seeding completed!
```

---

### Step 2: Create Asset Structure
```bash
npx ts-node prisma/seed-asset-categories-updated.ts
```

**What it does:**
- 📦 Creates 6 asset categories
  - Electronics, Furniture, Vehicles, Office Supplies, Software, Other
- 🏷️ Creates 30 asset types
  - Laptop, Desktop, Mobile, Monitor, Tablet, etc.
- 🏢 Creates 15 brands
  - Apple, Dell, Samsung, Google, Xiaomi, Nokia, etc.
- 📱 Creates 53 models
  - MacBook Pro 13" Retina, iPhone 6, Dell Inspiron 15 5000, etc.

**Output:**
```
🌱 Seeding asset categories, types, brands, and models...
✅ Seeded 6 asset categories
✅ Seeded 30 asset types
✅ Seeded 15 brands
✅ Seeded 53 models
```

---

### Step 3: Create Assets
```bash
npx ts-node prisma/seed-assets-final.ts
```

**What it does:**
- 💻 Creates 325 assets with proper categorization
  - 282 Laptops (Apple MacBooks, Dell Inspiron, etc.)
  - 27 Mobiles (iPhone, Samsung Galaxy, Xiaomi, Google Pixel, Nokia)
  - 13 Monitors (Dell displays)
  - 2 Tablets (iPad, iPad Pro)
  - 1 Accessory (Apple Pencil)
- 📝 Includes detailed notes/specifications
- 🔗 Links to proper asset types, brands, and models

**Asset Type Breakdown:**
```
Laptop:    282 (86.8%)
Mobile:     27 (8.3%)
Monitor:    13 (4.0%)
Tablet:      2 (0.6%)
Accessory:   1 (0.3%)
```

**Brand Breakdown:**
```
Apple:     211 (65.0%)
Dell:       99 (30.5%)
Xiaomi:      6 (1.8%)
Samsung:     6 (1.8%)
Google:      2 (0.6%)
Nokia:       1 (0.3%)
```

**Output:**
```
🚀 Starting comprehensive asset seeding...
✅ Processed 50 assets...
✅ Processed 100 assets...
... 
✅ Processed 325 assets
🎉 Asset seeding complete!
```

---

### Step 4: Create Employees
```bash
npx ts-node prisma/seed-employees-from-csv.ts
```

**What it does:**
- 👥 Creates employee records from CSV data
- 📧 Assigns unique email addresses
- 📱 Assigns phone numbers
- 🏢 Sets up employee profiles

**Note:** Ensure the employee CSV file is properly configured in the seed script.

---

### Step 5: Assign Assets to Employees
```bash
npx ts-node prisma/seed-asset-assignments.ts
```

**What it does:**
- 🔗 Assigns assets to employees
- 📋 Creates asset issue records
- 📅 Sets issue dates
- ✅ Updates asset status to 'ASSIGNED'

**Output:**
```
🌱 Starting asset assignments seed...
✅ Assigned asset AST-0001 to employee EMP-0001
...
🎉 Asset assignments completed!
```

---

## 🔄 Quick Start (All Steps)

Run all seed files in sequence:

```bash
# Step 1: Clean & Admin
npx ts-node prisma/seed.ts

# Step 2: Asset Structure
npx ts-node prisma/seed-asset-categories-updated.ts

# Step 3: Assets
npx ts-node prisma/seed-assets-final.ts

# Step 4: Employees
npx ts-node prisma/seed-employees-from-csv.ts

# Step 5: Assignments
npx ts-node prisma/seed-asset-assignments.ts
```

---

## 📊 Final Database State

After running all seed files, your database will contain:

```
✅ 1 Admin User (username: admin, password: Admin@123)
✅ 1 Admin Employee (ID: 0001)
✅ 1 Admin Role
✅ 6 Asset Categories
✅ 30 Asset Types
✅ 15 Brands
✅ 53 Models
✅ 325 Assets (with proper categorization)
✅ N Employees (from CSV)
✅ Asset Assignments (linking assets to employees)
```

---

## ⚠️ Important Notes

### Data Integrity
- **Always run in the specified order**
- Each seed file depends on data from previous steps
- Running out of order will cause foreign key errors

### Development vs Production
- The main seed file (`seed.ts`) **deletes all data**
- Use with caution in production environments
- Consider creating a separate production seed without cleanup

### Admin Credentials
```
Username: admin
Password: Admin@123
```
**⚠️ Change this password immediately after first login!**

### Re-seeding
To re-seed the database:
1. Run `npx ts-node prisma/seed.ts` (cleans everything)
2. Run all other seed files in order

### Troubleshooting

**Error: "Foreign key constraint failed"**
- Solution: Run seed files in the correct order

**Error: "Unique constraint violation"**
- Solution: Run `seed.ts` first to clean the database

**Error: "Admin user already exists"**
- Solution: This is now handled by cleanup in `seed.ts`

---

## 📝 Seed File Details

### 1. seed.ts
- **Purpose:** Database cleanup + Admin creation
- **Dependencies:** None
- **Creates:** Admin user, employee, role
- **Deletes:** All existing data
- **Run Time:** ~1-2 seconds

### 2. seed-asset-categories-updated.ts
- **Purpose:** Asset structure
- **Dependencies:** Admin user (from seed.ts)
- **Creates:** Categories, types, brands, models
- **Run Time:** ~2-3 seconds

### 3. seed-assets-final.ts
- **Purpose:** Asset records
- **Dependencies:** Admin user, asset types, brands, models
- **Creates:** 325 assets
- **Run Time:** ~10-15 seconds

### 4. seed-employees-from-csv.ts
- **Purpose:** Employee records
- **Dependencies:** Admin user
- **Creates:** Employee profiles
- **Run Time:** Varies by CSV size

### 5. seed-asset-assignments.ts
- **Purpose:** Asset-employee relationships
- **Dependencies:** Assets, employees
- **Creates:** Asset issues/assignments
- **Run Time:** Varies by number of assignments

---

## 🔧 Configuration

### Environment Variables
Ensure `.env` file contains:
```
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
```

### CSV Files
For employee seeding, ensure CSV file path is correct in:
- `seed-employees-from-csv.ts`

---

## 📚 Additional Resources

- [Prisma Seeding Documentation](https://www.prisma.io/docs/guides/database/seed-database)
- [Database Schema](./schema.prisma)
- [Migration Files](./migrations/)

---

**Last Updated:** October 2025  
**Maintained By:** TrackStix Development Team

