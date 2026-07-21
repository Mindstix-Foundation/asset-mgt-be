import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import {
  AuditChange,
  buildFieldDiff,
  TABLE_DISPLAY_NAMES,
} from './audit.util';

export interface AuditLogInput {
  tableName: string;
  recordId: number;
  action: AuditAction;
  userId: number;
  tenantId?: number;
  entityLabel?: string;
  summary?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  trackedFields?: string[];
  fieldLabels?: Record<string, string>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  changes?: AuditChange[];
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput): Promise<void> {
    try {
      let changedFields: string[] = [];
      let oldValues: Record<string, unknown> | null = null;
      let newValues: Record<string, unknown> | null = null;
      let metadata: Record<string, unknown> = { ...(input.metadata ?? {}) };

      if (input.changes && input.changes.length > 0) {
        changedFields = input.changes.map((c) => c.field);
        oldValues = {};
        newValues = {};
        for (const change of input.changes) {
          oldValues[change.field] = change.oldValue;
          newValues[change.field] = change.newValue;
        }
        metadata.changes = input.changes;
      } else if (input.action === AuditAction.UPDATE) {
        const diff = buildFieldDiff(
          input.before,
          input.after,
          input.trackedFields,
          input.fieldLabels,
        );
        if (diff.changedFields.length === 0) return;
        changedFields = diff.changedFields;
        oldValues = diff.oldValues;
        newValues = diff.newValues;
        metadata.changes = diff.changes;
      } else if (input.action === AuditAction.INSERT) {
        newValues = input.after ?? null;
        if (newValues) {
          changedFields = Object.keys(newValues);
        }
      } else if (input.action === AuditAction.DELETE) {
        oldValues = input.before ?? null;
        if (oldValues) {
          changedFields = Object.keys(oldValues);
        }
      }

      await this.prisma.auditLog.create({
        data: {
          tableName: input.tableName,
          recordId: input.recordId,
          action: input.action,
          entityLabel: input.entityLabel,
          summary: input.summary,
          oldValues: oldValues as Prisma.InputJsonValue,
          newValues: newValues as Prisma.InputJsonValue,
          changedFields,
          metadata: metadata as Prisma.InputJsonValue,
          userId: input.userId,
          tenantId: input.tenantId!,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      });
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  async findAll(query: QueryAuditLogDto, tenantId: number) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = { tenantId };

    if (query.tableName) {
      where.tableName = query.tableName;
    }
    if (query.action) {
      where.action = query.action;
    }
    if (query.userId) {
      where.userId = query.userId;
    }
    if (query.search) {
      const q = query.search.trim();
      where.OR = [
        { summary: { contains: q, mode: 'insensitive' } },
        { entityLabel: { contains: q, mode: 'insensitive' } },
        {
          user: {
            employee: {
              OR: [
                { firstName: { contains: q, mode: 'insensitive' } },
                { lastName: { contains: q, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) {
        where.createdAt.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        const to = new Date(query.dateTo);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    const [totalCount, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              employee: {
                select: { firstName: true, lastName: true, employeeId: true },
              },
            },
          },
        },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    return {
      message: 'Audit logs retrieved successfully',
      data: {
        logs: logs.map((log) => this.mapAuditLog(log)),
        pagination: {
          totalCount,
          currentPage: page,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
      },
    };
  }

  private mapAuditLog(log: any) {
    const emp = log.user?.employee;
    const performedByName = emp
      ? `${emp.firstName} ${emp.lastName}`.trim()
      : log.user?.username ?? 'Unknown';

    const metadata = (log.metadata as Record<string, unknown>) ?? {};
    const changes = (metadata.changes as AuditChange[]) ?? [];

    return {
      id: log.id,
      tableName: log.tableName,
      tableDisplayName: TABLE_DISPLAY_NAMES[log.tableName] ?? log.tableName,
      recordId: log.recordId,
      action: log.action,
      entityLabel: log.entityLabel,
      summary: log.summary,
      oldValues: log.oldValues,
      newValues: log.newValues,
      changedFields: log.changedFields,
      changes,
      metadata,
      performedBy: {
        userId: log.userId,
        username: log.user?.username,
        name: performedByName,
        employeeId: emp?.employeeId,
      },
      createdAt: log.createdAt.toISOString(),
    };
  }
}
