/**
 * Seed sample maintenance reminder notifications for local testing.
 *
 * Run from project root:
 *   npm run seed:notifications
 */
import { PrismaClient, NotificationType } from '@prisma/client';

const prisma = new PrismaClient();
const SEED_TENANT_ID = 1;

const SAMPLE_COUNT = 35;
const MAINTENANCE_TYPES = [
  'Preventive',
  'Corrective',
  'Calibration',
  'Inspection',
  'Software Update',
];

async function main() {
  const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!admin) {
    throw new Error('Admin user not found. Run the main seed first.');
  }

  const assets = await prisma.asset.findMany({
    take: 10,
    select: { id: true, assetId: true },
    orderBy: { id: 'asc' },
  });

  const now = Date.now();
  const records = Array.from({ length: SAMPLE_COUNT }, (_, index) => {
    const maintenanceType =
      MAINTENANCE_TYPES[index % MAINTENANCE_TYPES.length];
    const asset = assets[index % Math.max(assets.length, 1)];
    const assetId = asset?.assetId ?? `AST-${String(index + 1).padStart(4, '0')}`;
    const hoursAgo = index * 2 + 1;
    const isRead = index % 4 === 0;

    return {
      userId: admin.id,
      tenantId: SEED_TENANT_ID,
      type: NotificationType.MAINTENANCE_REMINDER,
      title: `Maintenance due today — ${assetId}`,
      message: `${maintenanceType} maintenance is scheduled for today on asset ${assetId}.`,
      isRead,
      readAt: isRead ? new Date(now - hoursAgo * 60 * 60 * 1000 + 30 * 60 * 1000) : null,
      data: {
        maintenanceId: 1000 + index,
        assetId,
        maintenanceType,
        scheduledDate: new Date(now).toISOString().slice(0, 10),
      },
      createdAt: new Date(now - hoursAgo * 60 * 60 * 1000),
    };
  });

  await prisma.notification.createMany({ data: records });

  console.log(
    `Created ${SAMPLE_COUNT} maintenance reminder notifications for admin (user id ${admin.id}).`,
  );
  console.log('Open /app/notifications and use Load more to page through them.');
}

main()
  .catch((error) => {
    console.error('Failed to seed notifications:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
