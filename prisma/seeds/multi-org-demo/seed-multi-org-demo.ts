/**
 * Multi-org demo seed (additive / idempotent)
 *
 * Fills designations, catalogs, employees, and assets for the 3 business
 * organizations (Mindstix, Acme, testing 1). Skips the platform tenant.
 *
 * Safe to re-run: uses unique keys and skips rows that already exist.
 *
 * Run:
 *   npx ts-node prisma/seeds/multi-org-demo/seed-multi-org-demo.ts
 *   npm run db:seed:multi-org
 */

import {
  PrismaClient,
  EmployeeStatus,
  AssetStatus,
  AssetCondition,
  AssetLocation,
  VendorType,
  VendorStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

type OrgSeedPlan = {
  orgName: string;
  designations: { name: string; description: string }[];
  category: { name: string; description: string };
  assetType: { name: string; description: string };
  brand: { name: string; description: string };
  model: { name: string };
  vendor: { name: string; email: string };
  employees: {
    employeeId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    designationName: string;
  }[];
  assets: {
    assetId: string;
    serialNumber: string;
    assignToEmployeeId?: string;
  }[];
};

const ORG_PLANS: OrgSeedPlan[] = [
  {
    orgName: 'Mindstix',
    designations: [
      { name: 'Engineering Manager', description: 'Leads engineering teams' },
      { name: 'Product Designer', description: 'Owns UX and visual design' },
      { name: 'QA Lead', description: 'Owns quality and test strategy' },
      { name: 'DevOps Engineer', description: 'Platform and CI/CD' },
    ],
    category: {
      name: 'IT Hardware',
      description: 'Mindstix IT devices',
    },
    assetType: {
      name: 'Laptop',
      description: 'Employee laptops',
    },
    brand: { name: 'Dell', description: 'Dell business devices' },
    model: { name: 'Latitude 5440' },
    vendor: {
      name: 'Mindstix IT Supplies',
      email: 'vendor.it@mindstix-demo.local',
    },
    employees: [
      {
        employeeId: '9101',
        firstName: 'Riya',
        lastName: 'Sharma',
        email: 'riya.sharma.demo@mindstix.local',
        phone: '+91 9876501001',
        designationName: 'Engineering Manager',
      },
      {
        employeeId: '9102',
        firstName: 'Aarav',
        lastName: 'Patel',
        email: 'aarav.patel.demo@mindstix.local',
        phone: '+91 9876501002',
        designationName: 'Product Designer',
      },
      {
        employeeId: '9103',
        firstName: 'Neha',
        lastName: 'Kulkarni',
        email: 'neha.kulkarni.demo@mindstix.local',
        phone: '+91 9876501003',
        designationName: 'QA Lead',
      },
      {
        employeeId: '9104',
        firstName: 'Kabir',
        lastName: 'Mehta',
        email: 'kabir.mehta.demo@mindstix.local',
        phone: '+91 9876501004',
        designationName: 'DevOps Engineer',
      },
      {
        employeeId: '9105',
        firstName: 'Isha',
        lastName: 'Joshi',
        email: 'isha.joshi.demo@mindstix.local',
        phone: '+91 9876501005',
        designationName: 'Engineering Manager',
      },
    ],
    assets: [
      { assetId: 'MX-DEMO-001', serialNumber: 'MX-SN-001', assignToEmployeeId: '9101' },
      { assetId: 'MX-DEMO-002', serialNumber: 'MX-SN-002', assignToEmployeeId: '9102' },
      { assetId: 'MX-DEMO-003', serialNumber: 'MX-SN-003', assignToEmployeeId: '9103' },
      { assetId: 'MX-DEMO-004', serialNumber: 'MX-SN-004' },
      { assetId: 'MX-DEMO-005', serialNumber: 'MX-SN-005' },
    ],
  },
  {
    orgName: 'Acme Corp',
    designations: [
      { name: 'Sales Manager', description: 'Owns enterprise sales pipeline' },
      { name: 'Account Executive', description: 'Manages customer accounts' },
      { name: 'Ops Coordinator', description: 'Day-to-day operations' },
      { name: 'Finance Analyst', description: 'Budget and reporting' },
    ],
    category: {
      name: 'Office Equipment',
      description: 'Acme office devices',
    },
    assetType: {
      name: 'Desktop',
      description: 'Desktop workstations',
    },
    brand: { name: 'HP', description: 'HP business PCs' },
    model: { name: 'EliteDesk 800 G9' },
    vendor: {
      name: 'Acme Office Mart',
      email: 'vendor.office@acme-demo.local',
    },
    employees: [
      {
        employeeId: 'A0101',
        firstName: 'Jordan',
        lastName: 'Lee',
        email: 'jordan.lee.demo@acme.local',
        phone: '+91 9876502001',
        designationName: 'Sales Manager',
      },
      {
        employeeId: 'A0102',
        firstName: 'Priya',
        lastName: 'Nair',
        email: 'priya.nair.demo@acme.local',
        phone: '+91 9876502002',
        designationName: 'Account Executive',
      },
      {
        employeeId: 'A0103',
        firstName: 'Marcus',
        lastName: 'Chen',
        email: 'marcus.chen.demo@acme.local',
        phone: '+91 9876502003',
        designationName: 'Ops Coordinator',
      },
      {
        employeeId: 'A0104',
        firstName: 'Sofia',
        lastName: 'Garcia',
        email: 'sofia.garcia.demo@acme.local',
        phone: '+91 9876502004',
        designationName: 'Finance Analyst',
      },
      {
        employeeId: 'A0105',
        firstName: 'Dev',
        lastName: 'Banerjee',
        email: 'dev.banerjee.demo@acme.local',
        phone: '+91 9876502005',
        designationName: 'Account Executive',
      },
    ],
    assets: [
      { assetId: 'AC-DEMO-001', serialNumber: 'AC-SN-001', assignToEmployeeId: 'A0101' },
      { assetId: 'AC-DEMO-002', serialNumber: 'AC-SN-002', assignToEmployeeId: 'A0102' },
      { assetId: 'AC-DEMO-003', serialNumber: 'AC-SN-003', assignToEmployeeId: 'A0103' },
      { assetId: 'AC-DEMO-004', serialNumber: 'AC-SN-004' },
      { assetId: 'AC-DEMO-005', serialNumber: 'AC-SN-005' },
    ],
  },
  {
    orgName: 'testing 1',
    designations: [
      { name: 'Site Engineer', description: 'On-site technical delivery' },
      { name: 'Project Lead', description: 'Owns project timelines' },
      { name: 'Field Technician', description: 'Installs and supports field gear' },
      { name: 'Safety Officer', description: 'Site safety compliance' },
    ],
    category: {
      name: 'Field Gear',
      description: 'Testing org field devices',
    },
    assetType: {
      name: 'Tablet',
      description: 'Field tablets',
    },
    brand: { name: 'Samsung', description: 'Samsung tablets' },
    model: { name: 'Galaxy Tab S9' },
    vendor: {
      name: 'FieldTech Distributors',
      email: 'vendor.field@testing1-demo.local',
    },
    employees: [
      {
        employeeId: 'T0101',
        firstName: 'Ankit',
        lastName: 'Verma',
        email: 'ankit.verma.demo@testing1.local',
        phone: '+91 9876503001',
        designationName: 'Site Engineer',
      },
      {
        employeeId: 'T0102',
        firstName: 'Meera',
        lastName: 'Shah',
        email: 'meera.shah.demo@testing1.local',
        phone: '+91 9876503002',
        designationName: 'Project Lead',
      },
      {
        employeeId: 'T0103',
        firstName: 'Rohan',
        lastName: 'Desai',
        email: 'rohan.desai.demo@testing1.local',
        phone: '+91 9876503003',
        designationName: 'Field Technician',
      },
      {
        employeeId: 'T0104',
        firstName: 'Tara',
        lastName: 'Singh',
        email: 'tara.singh.demo@testing1.local',
        phone: '+91 9876503004',
        designationName: 'Safety Officer',
      },
      {
        employeeId: 'T0105',
        firstName: 'Vikram',
        lastName: 'Rao',
        email: 'vikram.rao.demo@testing1.local',
        phone: '+91 9876503005',
        designationName: 'Field Technician',
      },
    ],
    assets: [
      { assetId: 'T1-DEMO-001', serialNumber: 'T1-SN-001', assignToEmployeeId: 'T0101' },
      { assetId: 'T1-DEMO-002', serialNumber: 'T1-SN-002', assignToEmployeeId: 'T0102' },
      { assetId: 'T1-DEMO-003', serialNumber: 'T1-SN-003', assignToEmployeeId: 'T0103' },
      { assetId: 'T1-DEMO-004', serialNumber: 'T1-SN-004' },
      { assetId: 'T1-DEMO-005', serialNumber: 'T1-SN-005' },
    ],
  },
];

async function ensureDesignations(
  tenantId: number,
  userId: number,
  designations: OrgSeedPlan['designations'],
) {
  const map = new Map<string, number>();
  for (const d of designations) {
    const existing = await prisma.designation.findFirst({
      where: { tenantId, name: { equals: d.name, mode: 'insensitive' } },
    });
    if (existing) {
      map.set(d.name, existing.id);
      continue;
    }
    const created = await prisma.designation.create({
      data: {
        tenantId,
        name: d.name,
        description: d.description,
        createdBy: userId,
        updatedBy: userId,
      },
    });
    map.set(d.name, created.id);
    console.log(`  + designation: ${d.name}`);
  }
  return map;
}

async function ensureCatalog(
  tenantId: number,
  userId: number,
  plan: OrgSeedPlan,
) {
  let category = await prisma.assetCategory.findFirst({
    where: { tenantId, name: plan.category.name },
  });
  if (!category) {
    category = await prisma.assetCategory.create({
      data: {
        tenantId,
        name: plan.category.name,
        description: plan.category.description,
        createdBy: userId,
        updatedBy: userId,
      },
    });
    console.log(`  + category: ${category.name}`);
  }

  let assetType = await prisma.assetType.findFirst({
    where: {
      tenantId,
      name: plan.assetType.name,
      categoryId: category.id,
    },
  });
  if (!assetType) {
    assetType = await prisma.assetType.create({
      data: {
        tenantId,
        categoryId: category.id,
        name: plan.assetType.name,
        description: plan.assetType.description,
        createdBy: userId,
        updatedBy: userId,
      },
    });
    console.log(`  + asset type: ${assetType.name}`);
  }

  let brand = await prisma.brand.findFirst({
    where: { tenantId, name: plan.brand.name },
  });
  if (!brand) {
    brand = await prisma.brand.create({
      data: {
        tenantId,
        name: plan.brand.name,
        description: plan.brand.description,
        createdBy: userId,
        updatedBy: userId,
      },
    });
    console.log(`  + brand: ${brand.name}`);
  }

  let model = await prisma.model.findFirst({
    where: {
      tenantId,
      name: plan.model.name,
      brandId: brand.id,
      assetTypeId: assetType.id,
    },
  });
  if (!model) {
    model = await prisma.model.create({
      data: {
        tenantId,
        brandId: brand.id,
        assetTypeId: assetType.id,
        name: plan.model.name,
        createdBy: userId,
        updatedBy: userId,
      },
    });
    console.log(`  + model: ${model.name}`);
  }

  let vendor = await prisma.vendor.findFirst({
    where: { tenantId, name: plan.vendor.name },
  });
  if (!vendor) {
    vendor = await prisma.vendor.create({
      data: {
        tenantId,
        name: plan.vendor.name,
        email: plan.vendor.email,
        contactPerson: 'Demo Vendor Contact',
        phone: '+91 9000000000',
        vendorType: VendorType.SUPPLIER,
        status: VendorStatus.ACTIVE,
        createdBy: userId,
        updatedBy: userId,
      },
    });
    console.log(`  + vendor: ${vendor.name}`);
  }

  return { category, assetType, brand, model, vendor };
}

async function ensureEmployees(
  tenantId: number,
  userId: number,
  employees: OrgSeedPlan['employees'],
  designationMap: Map<string, number>,
) {
  const map = new Map<string, number>();
  for (const emp of employees) {
    const existing = await prisma.employee.findFirst({
      where: {
        OR: [
          { tenantId, employeeId: emp.employeeId },
          { email: emp.email },
        ],
      },
    });
    if (existing) {
      if (existing.tenantId === tenantId && !existing.designationId) {
        const designationId = designationMap.get(emp.designationName);
        if (designationId) {
          await prisma.employee.update({
            where: { id: existing.id },
            data: { designationId, updatedBy: userId },
          });
          console.log(`  ~ assigned designation to existing ${emp.employeeId}`);
        }
      }
      map.set(emp.employeeId, existing.id);
      continue;
    }

    const created = await prisma.employee.create({
      data: {
        tenantId,
        employeeId: emp.employeeId,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        phone: emp.phone,
        status: EmployeeStatus.ACTIVE,
        designationId: designationMap.get(emp.designationName) ?? null,
        address: 'Demo address',
        createdBy: userId,
        updatedBy: userId,
      },
    });
    map.set(emp.employeeId, created.id);
    console.log(
      `  + employee: ${emp.employeeId} ${emp.firstName} ${emp.lastName} (${emp.designationName})`,
    );
  }
  return map;
}

async function ensureAssets(
  tenantId: number,
  userId: number,
  plan: OrgSeedPlan,
  catalog: Awaited<ReturnType<typeof ensureCatalog>>,
  employeeMap: Map<string, number>,
) {
  for (const item of plan.assets) {
    const existing = await prisma.asset.findFirst({
      where: { tenantId, assetId: item.assetId },
    });
    if (existing) {
      continue;
    }

    const assignEmployeeId = item.assignToEmployeeId
      ? employeeMap.get(item.assignToEmployeeId)
      : undefined;

    const asset = await prisma.asset.create({
      data: {
        tenantId,
        assetId: item.assetId,
        assetTypeId: catalog.assetType.id,
        brandId: catalog.brand.id,
        modelId: catalog.model.id,
        vendorId: catalog.vendor.id,
        serialNumber: item.serialNumber,
        purchaseDate: new Date('2025-06-01'),
        purchaseCost: 65000,
        warrantyStartDate: new Date('2025-06-01'),
        warrantyEndDate: new Date('2028-06-01'),
        location: AssetLocation.PUNE_INVENTORY_CENTER,
        condition: AssetCondition.WORKING_CONDITION,
        status: assignEmployeeId
          ? AssetStatus.ASSIGNED
          : AssetStatus.NON_ASSIGNED,
        notes: `Demo asset for ${plan.orgName}`,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    if (assignEmployeeId) {
      await prisma.assetIssue.create({
        data: {
          tenantId,
          assetId: asset.id,
          employeeId: assignEmployeeId,
          issuedBy: userId,
          issueDate: new Date('2025-07-01'),
          createdBy: userId,
          updatedBy: userId,
        },
      });
    }

    console.log(
      `  + asset: ${item.assetId}${
        item.assignToEmployeeId ? ` → ${item.assignToEmployeeId}` : ' (stock)'
      }`,
    );
  }
}

async function assignDesignationsToExistingMindstix(
  tenantId: number,
  userId: number,
  designationMap: Map<string, number>,
) {
  const designationIds = [...designationMap.values()];
  if (designationIds.length === 0) return;

  const withoutDesignation = await prisma.employee.findMany({
    where: { tenantId, designationId: null },
    select: { id: true },
    take: 40,
    orderBy: { id: 'asc' },
  });

  let i = 0;
  for (const emp of withoutDesignation) {
    const designationId = designationIds[i % designationIds.length];
    await prisma.employee.update({
      where: { id: emp.id },
      data: { designationId, updatedBy: userId },
    });
    i += 1;
  }
  if (withoutDesignation.length > 0) {
    console.log(
      `  ~ backfilled designation on ${withoutDesignation.length} existing Mindstix employees`,
    );
  }
}

async function seedOrg(plan: OrgSeedPlan) {
  const tenant = await prisma.tenant.findFirst({
    where: { name: { equals: plan.orgName, mode: 'insensitive' } },
  });
  if (!tenant) {
    console.warn(`⚠ Skipping missing tenant name="${plan.orgName}"`);
    return;
  }
  if (tenant.isPlatform) {
    console.log(`⏭ Skipping platform tenant`);
    return;
  }

  const adminUser = await prisma.user.findFirst({
    where: { tenantId: tenant.id, isActive: true },
    orderBy: { id: 'asc' },
  });
  if (!adminUser) {
    console.warn(`⚠ No active user for ${tenant.name}; skipping`);
    return;
  }

  console.log(`\n── ${tenant.name} [tenant #${tenant.id}] ──`);

  const designationMap = await ensureDesignations(
    tenant.id,
    adminUser.id,
    plan.designations,
  );

  if (plan.orgName.toLowerCase() === 'mindstix') {
    await assignDesignationsToExistingMindstix(
      tenant.id,
      adminUser.id,
      designationMap,
    );
  }

  const catalog = await ensureCatalog(tenant.id, adminUser.id, plan);
  const employeeMap = await ensureEmployees(
    tenant.id,
    adminUser.id,
    plan.employees,
    designationMap,
  );
  await ensureAssets(tenant.id, adminUser.id, plan, catalog, employeeMap);

  const counts = {
    designations: await prisma.designation.count({ where: { tenantId: tenant.id } }),
    employees: await prisma.employee.count({ where: { tenantId: tenant.id } }),
    assets: await prisma.asset.count({ where: { tenantId: tenant.id } }),
  };
  console.log(`  totals → designations=${counts.designations}, employees=${counts.employees}, assets=${counts.assets}`);
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Multi-org demo seed (designations / employees / assets)');
  console.log('═══════════════════════════════════════════════════');

  const tenants = await prisma.tenant.findMany({
    where: { isPlatform: false },
    select: { id: true, name: true },
  });
  console.log(
    `Business orgs in DB: ${tenants.map((t) => t.name).join(', ') || '(none found)'}`,
  );

  for (const plan of ORG_PLANS) {
    await seedOrg(plan);
  }

  console.log('\n✅ Multi-org demo seed completed.\n');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
