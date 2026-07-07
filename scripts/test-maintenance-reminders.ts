/**
 * End-to-end test: maintenance due today → in-app notification + email.
 *
 * Run from project root:
 *   npm run test:maintenance-reminders
 */
import { NestFactory } from '@nestjs/core';
import {
  MaintenanceStatus,
  MaintenanceTypeEnum,
  NotificationType,
  PrismaClient,
} from '@prisma/client';
import { AppModule } from '../src/app.module';
import { NotificationService } from '../src/modules/notifications/notification.service';

const prisma = new PrismaClient();

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

async function ensureMaintenanceDueToday(adminUserId: number) {
  const { start, end } = todayRange();

  const existing = await prisma.maintenanceSchedule.findFirst({
    where: {
      isActive: true,
      status: MaintenanceStatus.SCHEDULED,
      scheduledDate: { gte: start, lte: end },
    },
    include: {
      asset: {
        select: {
          assetId: true,
          assetType: { select: { name: true } },
          brand: { select: { name: true } },
          model: { select: { name: true } },
        },
      },
      createdByUser: {
        select: {
          id: true,
          employee: { select: { email: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  if (existing) {
    console.log(`Using existing maintenance #${existing.id} due today.`);
    return existing;
  }

  const asset = await prisma.asset.findFirst({
    orderBy: { id: 'asc' },
    select: { id: true, assetId: true },
  });

  if (!asset) {
    throw new Error('No assets found. Run the main seed first.');
  }

  const scheduledDate = new Date();
  scheduledDate.setHours(12, 0, 0, 0);

  const created = await prisma.maintenanceSchedule.create({
    data: {
      assetId: asset.id,
      maintenanceType: MaintenanceTypeEnum.PREVENTIVE,
      scheduledDate,
      description: `Test maintenance reminder — ${new Date().toISOString()}`,
      status: MaintenanceStatus.SCHEDULED,
      isActive: true,
      createdBy: adminUserId,
      updatedBy: adminUserId,
    },
    include: {
      asset: {
        select: {
          assetId: true,
          assetType: { select: { name: true } },
          brand: { select: { name: true } },
          model: { select: { name: true } },
        },
      },
      createdByUser: {
        select: {
          id: true,
          employee: { select: { email: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  console.log(`Created maintenance #${created.id} for asset ${asset.assetId} due today.`);
  return created;
}

async function main() {
  const admin = await prisma.user.findUnique({
    where: { username: 'admin' },
    include: {
      employee: { select: { email: true, firstName: true, lastName: true } },
    },
  });

  if (!admin) {
    throw new Error('Admin user not found.');
  }

  const adminEmail = admin.employee?.email;
  console.log(`Admin user id=${admin.id}, email=${adminEmail ?? '(none)'}`);

  const maintenance = await ensureMaintenanceDueToday(admin.id);

  const notificationsBefore = await prisma.notification.count({
    where: {
      userId: admin.id,
      type: NotificationType.MAINTENANCE_REMINDER,
    },
  });

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const notificationService = app.get(NotificationService);

    console.log('\n--- Triggering createMaintenanceReminderNotifications() ---');
    await notificationService.createMaintenanceReminderNotifications();

    const notificationsAfter = await prisma.notification.count({
      where: {
        userId: admin.id,
        type: NotificationType.MAINTENANCE_REMINDER,
      },
    });

    const latestNotification = await prisma.notification.findFirst({
      where: {
        userId: admin.id,
        type: NotificationType.MAINTENANCE_REMINDER,
      },
      orderBy: { createdAt: 'desc' },
    });

    const notificationsCreated = notificationsAfter - notificationsBefore;

    console.log('\n=== NOTIFICATION RESULT ===');
    console.log(`Before: ${notificationsBefore}`);
    console.log(`After:  ${notificationsAfter}`);
    console.log(`New notifications: ${notificationsCreated}`);
    if (latestNotification) {
      console.log(`Latest: #${latestNotification.id} — ${latestNotification.title}`);
      console.log(`Message: ${latestNotification.message}`);
    }

    let emailSent = false;
    if (adminEmail) {
      console.log('\n--- Testing email send directly ---');
      emailSent = await notificationService.sendMaintenanceReminderEmail(adminEmail, {
        assetId: maintenance.asset.assetId,
        assetType: maintenance.asset.assetType.name,
        brand: maintenance.asset.brand.name,
        model: maintenance.asset.model.name,
        maintenanceType: maintenance.maintenanceType,
        scheduledDate: maintenance.scheduledDate.toISOString().split('T')[0],
      });
    } else {
      console.log('\n=== EMAIL RESULT ===');
      console.log('SKIP: Admin has no employee email on file.');
    }

    console.log('\n=== EMAIL RESULT ===');
    if (!adminEmail) {
      console.log('FAIL: No recipient email configured for admin.');
    } else {
      console.log(emailSent ? `PASS: Email sent to ${adminEmail}` : `FAIL: Email could not be sent to ${adminEmail}`);
    }

    const notificationPass = notificationsCreated > 0;
    console.log('\n=== SUMMARY ===');
    console.log(`Notifications triggered: ${notificationPass ? 'YES' : 'NO'}`);
    console.log(`Email triggered:       ${adminEmail && emailSent ? 'YES' : 'NO'}`);

    if (!notificationPass || (adminEmail && !emailSent)) {
      process.exitCode = 1;
    }
  } finally {
    await app.close();
  }
}

main()
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
