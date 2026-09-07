/**
 * Live API test: categories / types / brands / models isolation across tenants.
 *
 * Prerequisites:
 * - API running on PORT (default 3000)
 * - Users: admin / Admin@123 (Mindstix), acme-admin / Admin@123 (Acme Corp)
 *
 * Usage:
 *   npx ts-node scripts/test-tenant-catalog-isolation.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const BASE = process.env.API_BASE_URL || 'http://127.0.0.1:3000/api';
const SUFFIX = randomBytes(4).toString('hex');
const prisma = new PrismaClient();

type Json = Record<string, any>;

async function ensureAcmeAdmin() {
  let tenant = await prisma.tenant.findFirst({
    where: { name: { equals: 'Acme Corp', mode: 'insensitive' } },
  });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { name: 'Acme Corp', isActive: true, isPlatform: false },
    });
  }

  let user = await prisma.user.findUnique({ where: { username: 'acme-admin' } });
  if (!user) {
    const passwordHash = await bcrypt.hash('Admin@123', 10);
    const employee = await prisma.employee.create({
      data: {
        tenantId: tenant.id,
        employeeId: 'A0001',
        firstName: 'Acme',
        lastName: 'Admin',
        email: 'admin@acme.example.com',
        status: 'ACTIVE',
      },
    });
    user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        employeeId: employee.id,
        username: 'acme-admin',
        passwordHash,
        roles: ['ADMIN'],
        isActive: true,
      },
    });
    const adminRole = await prisma.role.findUnique({ where: { roleName: 'ADMIN' } });
    if (adminRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: adminRole.id,
          assignedBy: user.id,
          isActive: true,
        },
      });
    }
  }

  return tenant;
}

async function api(
  method: string,
  path: string,
  token?: string,
  body?: Json,
): Promise<{ status: number; data: Json }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: Json = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data };
}

async function login(username: string, password: string) {
  const { status, data } = await api('POST', '/auth/login', undefined, {
    username,
    password,
  });
  if (status !== 200 || !data.access_token) {
    throw new Error(`Login failed for ${username}: ${status} ${JSON.stringify(data)}`);
  }
  return {
    token: data.access_token as string,
    tenantId: data.user?.tenantId as number | undefined,
    username: data.user?.username as string,
  };
}

/** Create responses nest as data.assetCategory / data.brand / data.assetType / data.model */
function unwrapEntity(data: Json, key: string): Json {
  const nested = data?.data?.[key];
  if (nested && typeof nested === 'object') return nested as Json;
  if (data?.data && typeof data.data === 'object' && data.data.id) return data.data as Json;
  return (data?.id ? data : {}) as Json;
}

/** List responses nest as data.assetCategories / data.brands / data.assetTypes / data.models */
function listItems(data: Json, key: string): Json[] {
  const nested = data?.data?.[key];
  if (Array.isArray(nested)) return nested;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
}

function assert(name: string, ok: boolean, detail = '') {
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ''}`);
  return ok;
}

async function main() {
  console.log(`API base: ${BASE}`);
  console.log(`Test suffix: ${SUFFIX}\n`);

  await ensureAcmeAdmin();

  const mindstix = await login('admin', 'Admin@123');
  const acme = await login('acme-admin', 'Admin@123');

  let passed = 0;
  let total = 0;
  const check = (name: string, ok: boolean, detail = '') => {
    total += 1;
    if (assert(name, ok, detail)) passed += 1;
  };

  check(
    'Tenants differ',
    !!mindstix.tenantId &&
      !!acme.tenantId &&
      mindstix.tenantId !== acme.tenantId,
    `mindstix=${mindstix.tenantId} acme=${acme.tenantId}`,
  );

  const mCatName = `IsoMindCat-${SUFFIX}`;
  const aCatName = `IsoAcmeCat-${SUFFIX}`;
  const mCatRes = await api('POST', '/asset-categories', mindstix.token, {
    name: mCatName,
    description: 'mindstix isolation',
  });
  const aCatRes = await api('POST', '/asset-categories', acme.token, {
    name: aCatName,
    description: 'acme isolation',
  });
  const mCat = unwrapEntity(mCatRes.data, 'assetCategory');
  const aCat = unwrapEntity(aCatRes.data, 'assetCategory');
  check('Create Mindstix category', [200, 201].includes(mCatRes.status), String(mCatRes.status));
  check('Create Acme category', [200, 201].includes(aCatRes.status), String(aCatRes.status));

  const mCats = listItems(
    (await api('GET', `/asset-categories?search=${encodeURIComponent(mCatName)}&limit=100`, mindstix.token)).data,
    'assetCategories',
  );
  const aCats = listItems(
    (await api('GET', `/asset-categories?search=${encodeURIComponent(aCatName)}&limit=100`, acme.token)).data,
    'assetCategories',
  );
  const mCatNames = mCats.map((c) => c.name);
  const aCatNames = aCats.map((c) => c.name);
  check('Mindstix sees own category', mCatNames.includes(mCatName), `found=${mCatNames.join(',')}`);
  check('Acme sees own category', aCatNames.includes(aCatName), `found=${aCatNames.join(',')}`);

  const mCatsAll = listItems(
    (await api('GET', `/asset-categories?search=${encodeURIComponent(aCatName)}&limit=100`, mindstix.token)).data,
    'assetCategories',
  ).map((c) => c.name);
  const aCatsAll = listItems(
    (await api('GET', `/asset-categories?search=${encodeURIComponent(mCatName)}&limit=100`, acme.token)).data,
    'assetCategories',
  ).map((c) => c.name);
  check('Mindstix does not see Acme category', !mCatsAll.includes(aCatName));
  check('Acme does not see Mindstix category', !aCatsAll.includes(mCatName));

  if (aCat.id) {
    const cross = await api('GET', `/asset-categories/${aCat.id}`, mindstix.token);
    check(
      'Mindstix cannot GET Acme category by id',
      [401, 403, 404].includes(cross.status),
      `status=${cross.status}`,
    );
  }

  const mBrandName = `IsoMindBrand-${SUFFIX}`;
  const aBrandName = `IsoAcmeBrand-${SUFFIX}`;
  const mBrandRes = await api('POST', '/brands', mindstix.token, { name: mBrandName });
  const aBrandRes = await api('POST', '/brands', acme.token, { name: aBrandName });
  const mBrand = unwrapEntity(mBrandRes.data, 'brand');
  const aBrand = unwrapEntity(aBrandRes.data, 'brand');
  check('Create Mindstix brand', [200, 201].includes(mBrandRes.status));
  check('Create Acme brand', [200, 201].includes(aBrandRes.status));

  // API may normalize casing; use persisted names for assertions
  const mBrandStored = String(mBrand.name || mBrandName);
  const aBrandStored = String(aBrand.name || aBrandName);

  const mBrandGet = await api('GET', `/brands/${mBrand.id}`, mindstix.token);
  const aBrandGet = await api('GET', `/brands/${aBrand.id}`, acme.token);
  const mBrandCross = await api('GET', `/brands/${aBrand.id}`, mindstix.token);
  const aBrandCross = await api('GET', `/brands/${mBrand.id}`, acme.token);
  check(
    'Brand lists isolated',
    mBrandGet.status === 200 &&
      aBrandGet.status === 200 &&
      [401, 403, 404].includes(mBrandCross.status) &&
      [401, 403, 404].includes(aBrandCross.status) &&
      unwrapEntity(mBrandGet.data, 'brand').name === mBrandStored &&
      unwrapEntity(aBrandGet.data, 'brand').name === aBrandStored,
    `m=${mBrandGet.status} a=${aBrandGet.status} m_cross=${mBrandCross.status} a_cross=${aBrandCross.status}`,
  );

  const mTypeName = `IsoMindType-${SUFFIX}`;
  const aTypeName = `IsoAcmeType-${SUFFIX}`;
  const mTypeRes = await api('POST', '/asset-types', mindstix.token, {
    categoryId: mCat.id,
    name: mTypeName,
  });
  const aTypeRes = await api('POST', '/asset-types', acme.token, {
    categoryId: aCat.id,
    name: aTypeName,
  });
  const mType = unwrapEntity(mTypeRes.data, 'assetType');
  const aType = unwrapEntity(aTypeRes.data, 'assetType');
  check('Create Mindstix asset type', [200, 201].includes(mTypeRes.status), String(mTypeRes.status));
  check('Create Acme asset type', [200, 201].includes(aTypeRes.status), String(aTypeRes.status));

  const fkAbuse = await api('POST', '/asset-types', acme.token, {
    categoryId: mCat.id,
    name: `HackType-${SUFFIX}`,
  });
  check(
    'Acme cannot attach type to Mindstix category',
    [400, 403, 404].includes(fkAbuse.status),
    `status=${fkAbuse.status}`,
  );

  const mModelName = `IsoMindModel-${SUFFIX}`;
  const aModelName = `IsoAcmeModel-${SUFFIX}`;
  const mModelRes = await api('POST', '/models', mindstix.token, {
    brandId: mBrand.id,
    assetTypeId: mType.id,
    name: mModelName,
  });
  const aModelRes = await api('POST', '/models', acme.token, {
    brandId: aBrand.id,
    assetTypeId: aType.id,
    name: aModelName,
  });
  const mModel = unwrapEntity(mModelRes.data, 'model');
  const aModel = unwrapEntity(aModelRes.data, 'model');
  check('Create Mindstix model', [200, 201].includes(mModelRes.status), String(mModelRes.status));
  check('Create Acme model', [200, 201].includes(aModelRes.status), String(aModelRes.status));

  const brandAbuse = await api('POST', '/models', acme.token, {
    brandId: mBrand.id,
    assetTypeId: aType.id,
    name: `HackModel-${SUFFIX}`,
  });
  check(
    'Acme cannot use Mindstix brand on model',
    [400, 403, 404].includes(brandAbuse.status),
    `status=${brandAbuse.status}`,
  );

  const mModels = listItems(
    (await api('GET', `/models?search=${encodeURIComponent(mModelName)}&limit=100`, mindstix.token)).data,
    'models',
  ).map((m) => m.name);
  const aModels = listItems(
    (await api('GET', `/models?search=${encodeURIComponent(aModelName)}&limit=100`, acme.token)).data,
    'models',
  ).map((m) => m.name);
  const mModelLeak = listItems(
    (await api('GET', `/models?search=${encodeURIComponent(aModelName)}&limit=100`, mindstix.token)).data,
    'models',
  ).map((m) => m.name);
  const aModelLeak = listItems(
    (await api('GET', `/models?search=${encodeURIComponent(mModelName)}&limit=100`, acme.token)).data,
    'models',
  ).map((m) => m.name);
  check(
    'Model lists isolated',
    mModels.includes(mModelName) &&
      aModels.includes(aModelName) &&
      !mModelLeak.includes(aModelName) &&
      !aModelLeak.includes(mModelName),
    `m_own=${mModels.includes(mModelName)} a_own=${aModels.includes(aModelName)} leaks=${mModelLeak.includes(aModelName)||aModelLeak.includes(mModelName)}`,
  );

  const mAssets = await api('GET', '/assets?limit=5', mindstix.token);
  const aAssets = await api('GET', '/assets?limit=5', acme.token);
  check(
    'Assets list works per tenant',
    mAssets.status === 200 && aAssets.status === 200,
    `mindstix=${mAssets.status} acme=${aAssets.status}`,
  );

  // Cleanup (best effort)
  for (const [token, id] of [
    [mindstix.token, mModel.id],
    [acme.token, aModel.id],
  ] as const) {
    if (id) await api('DELETE', `/models/${id}`, token);
  }
  for (const [token, id] of [
    [mindstix.token, mType.id],
    [acme.token, aType.id],
  ] as const) {
    if (id) await api('DELETE', `/asset-types/${id}`, token);
  }
  for (const [token, id] of [
    [mindstix.token, mBrand.id],
    [acme.token, aBrand.id],
  ] as const) {
    if (id) await api('DELETE', `/brands/${id}`, token);
  }
  for (const [token, id] of [
    [mindstix.token, mCat.id],
    [acme.token, aCat.id],
  ] as const) {
    if (id) await api('DELETE', `/asset-categories/${id}`, token);
  }

  console.log(`\n${passed}/${total} passed`);
  if (passed !== total) {
    process.exitCode = 1;
  } else {
    console.log('\n✅ Tenant catalog isolation verified via API');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
