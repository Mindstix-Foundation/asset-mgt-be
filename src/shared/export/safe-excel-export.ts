import * as ExcelJS from 'exceljs';
import type { Response } from 'express';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

export const EXPORT_MAX_ROWS = Number.parseInt(
  process.env.EXPORT_MAX_ROWS || '10000',
  10,
);
export const EXPORT_CHUNK_SIZE = Number.parseInt(
  process.env.EXPORT_CHUNK_SIZE || '500',
  10,
);

export type ExportErrorCode = 'EXPORT_TOO_LARGE' | 'EXPORT_IN_PROGRESS';

let exportBusy = false;

export function getExportMaxRows(): number {
  return Number.isFinite(EXPORT_MAX_ROWS) && EXPORT_MAX_ROWS > 0
    ? EXPORT_MAX_ROWS
    : 10000;
}

export function getExportChunkSize(): number {
  return Number.isFinite(EXPORT_CHUNK_SIZE) && EXPORT_CHUNK_SIZE > 0
    ? EXPORT_CHUNK_SIZE
    : 500;
}

export function assertExportRowLimit(count: number): void {
  const max = getExportMaxRows();
  if (count > max) {
    throw new BadRequestException({
      message: `Export too large (${count.toLocaleString()} rows). Maximum is ${max.toLocaleString()} rows. Narrow your filters and try again.`,
      code: 'EXPORT_TOO_LARGE' satisfies ExportErrorCode,
      count,
      max,
    });
  }
}

export async function withExportLock<T>(fn: () => Promise<T>): Promise<T> {
  if (exportBusy) {
    throw new HttpException(
      {
        message:
          'Another export is already in progress. Please wait for it to finish and try again.',
        code: 'EXPORT_IN_PROGRESS' satisfies ExportErrorCode,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  exportBusy = true;
  try {
    return await fn();
  } finally {
    exportBusy = false;
  }
}

export type ColumnDef = {
  header: string;
  key: string;
  width?: number;
};

export function setExcelDownloadHeaders(res: Response, filename: string): void {
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  // Avoid buffering the full file in reverse proxies where possible
  res.setHeader('Cache-Control', 'no-store');
}

export function createStreamingWorkbook(
  res: Response,
  filename: string,
): ExcelJS.stream.xlsx.WorkbookWriter {
  setExcelDownloadHeaders(res, filename);
  return new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: res,
    useStyles: false,
    useSharedStrings: false,
  });
}

export type StreamRowsOptions<T> = {
  res: Response;
  filename: string;
  sheetName: string;
  columns: ColumnDef[];
  countFn: () => Promise<number>;
  fetchChunk: (skip: number, take: number) => Promise<T[]>;
  mapRow: (item: T) => Record<string, unknown> | unknown[];
};

/**
 * Count → enforce cap → stream rows in chunks via ExcelJS WorkbookWriter.
 */
export async function streamRowsInChunks<T>(
  options: StreamRowsOptions<T>,
): Promise<{ count: number }> {
  const {
    res,
    filename,
    sheetName,
    columns,
    countFn,
    fetchChunk,
    mapRow,
  } = options;

  return withExportLock(async () => {
    const total = await countFn();
    assertExportRowLimit(total);

    const workbook = createStreamingWorkbook(res, filename);
    const worksheet = workbook.addWorksheet(sheetName);
    worksheet.columns = columns.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width ?? 15,
    }));

    const chunkSize = getExportChunkSize();
    let written = 0;

    for (let skip = 0; skip < total; skip += chunkSize) {
      const chunk = await fetchChunk(skip, chunkSize);
      for (const item of chunk) {
        const mapped = mapRow(item);
        const row = Array.isArray(mapped)
          ? mapped
          : columns.map((c) => (mapped as Record<string, unknown>)[c.key]);
        worksheet.addRow(row).commit();
        written += 1;
      }
    }

    await worksheet.commit();
    await workbook.commit();
    return { count: written };
  });
}

/**
 * Stream a pre-loaded (already capped) array. Still uses WorkbookWriter
 * so the HTTP response is not held as a full buffer.
 */
export async function streamPreloadedRows(
  res: Response,
  filename: string,
  sheetName: string,
  columns: ColumnDef[],
  rows: Array<Record<string, unknown> | unknown[]>,
): Promise<{ count: number }> {
  return withExportLock(async () => {
    assertExportRowLimit(rows.length);

    const workbook = createStreamingWorkbook(res, filename);
    const worksheet = workbook.addWorksheet(sheetName);
    worksheet.columns = columns.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width ?? 15,
    }));

    for (const mapped of rows) {
      const row = Array.isArray(mapped)
        ? mapped
        : columns.map((c) => mapped[c.key]);
      worksheet.addRow(row).commit();
    }

    await worksheet.commit();
    await workbook.commit();
    return { count: rows.length };
  });
}

/** Extract stable export error payload for controllers using @Res(). */
export function getExportErrorPayload(error: unknown): {
  status: number;
  body: { message: string; code?: string; error?: string };
} {
  if (error instanceof HttpException) {
    const status = error.getStatus();
    const response = error.getResponse();
    if (typeof response === 'object' && response !== null) {
      const r = response as Record<string, unknown>;
      return {
        status,
        body: {
          message: String(r.message ?? error.message),
          code: r.code ? String(r.code) : undefined,
        },
      };
    }
    return { status, body: { message: error.message } };
  }

  const message =
    error instanceof Error ? error.message : 'Export failed unexpectedly';
  return {
    status: HttpStatus.BAD_REQUEST,
    body: { message: 'Export failed', error: message },
  };
}
