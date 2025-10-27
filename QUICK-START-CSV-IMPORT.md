# Quick Start - CSV Data Import

## ⚡ TL;DR

Import all employee and asset data from CSV files in one command:

```bash
cd /home/mindstix/Documents/Mindstix-Foundation/asset-mgt-be
./run-csv-seeds.sh
```

That's it! 🎉

## 📦 What Gets Imported

- **197 employees** with formatted IDs (0001, 0022, etc.)
- **20 asset types** (iPhone, MacBook, Windows, etc.)
- **600+ assets** with serial numbers
- **600+ asset assignments** to employees

## 🎯 What The Script Does

```
Step 1: Check for admin user (creates if needed)
Step 2: Import 197 employees from CSV
Step 3: Create asset categories and types
Step 4: Import 600+ assets
Step 5: Assign assets to employees
```

## ⏱️ Estimated Time

- **Total**: 2-5 minutes
- Each step takes ~30 seconds

## ✅ Verification

After import, check the data:

```bash
npx prisma studio
```

## 🔄 Need to Re-import?

Reset everything and start fresh:

```bash
npx prisma migrate reset
./run-csv-seeds.sh
```

## 🆘 Help

For detailed documentation, see:
- `CSV-SEED-SUMMARY.md` - Complete overview
- `prisma/README-SEED-FILES.md` - Technical details

## 📋 Manual Steps (if needed)

If the script doesn't work, run manually:

```bash
# 1. Create admin user
npm run seed

# 2. Import employees
npx ts-node prisma/seed-employees-from-csv.ts

# 3. Create asset types
npx ts-node prisma/seed-asset-categories.ts

# 4. Import assets
npx ts-node prisma/seed-assets.ts

# 5. Assign assets
npx ts-node prisma/seed-asset-assignments.ts
```

## 🎨 Data Examples

### Employee Format
```
CSV: Staff ID: 22, Name: "Hardik Patel"
↓
Database:
- employeeId: "0022"
- firstName: "Hardik"
- lastName: "Patel"  
- email: "hardik.patel@mindstix.com"
```

### Asset Format
```
CSV: Serial: "FVFF80V7Q05Q", Type: "MacBook"
↓
Database:
- serialNumber: "FVFF80V7Q05Q"
- type: "MacBook"
- brand: "MacBook"
- model: "MacBook"
- location: "Pune"
- status: "ASSIGNED"
```

---

**Questions?** Check the full documentation in `CSV-SEED-SUMMARY.md`

