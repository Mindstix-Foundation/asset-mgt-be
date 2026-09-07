export type DepreciationMethodValue =
  | 'STRAIGHT_LINE'
  | 'REDUCING_BALANCE'
  | 'INITIAL_HIGH_REDUCING';

export type DepreciationInput = {
  purchaseCost?: number | string | null;
  purchaseDate?: Date | string | null;
  depreciationMethod?: string | null;
  usefulLifeMonths?: number | null;
  salvageValue?: number | string | null;
  /** Annual % for REDUCING_BALANCE, or ongoing % after year 1 for INITIAL_HIGH_REDUCING */
  depreciationRatePercent?: number | string | null;
  /** Year-1 % for INITIAL_HIGH_REDUCING */
  firstYearDepreciationRatePercent?: number | string | null;
  asOf?: Date;
};

export type DepreciationYearRow = {
  year: number;
  openingValue: number;
  ratePercent: number;
  depreciation: number;
  closingValue: number;
  isPartialYear: boolean;
};

export type DepreciationSummary = {
  method: DepreciationMethodValue;
  purchaseCost: number;
  salvageValue: number;
  usefulLifeMonths: number | null;
  depreciationRatePercent: number | null;
  firstYearDepreciationRatePercent: number | null;
  yearsElapsed: number;
  monthsElapsed: number;
  monthlyDepreciation: number | null;
  accumulatedDepreciation: number;
  bookValue: number;
  depreciationPercent: number;
  isFullyDepreciated: boolean;
  schedule: DepreciationYearRow[];
};

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function monthsBetween(start: Date, end: Date): number {
  const years = end.getFullYear() - start.getFullYear();
  const months = end.getMonth() - start.getMonth();
  let total = years * 12 + months;
  if (end.getDate() < start.getDate()) {
    total -= 1;
  }
  return Math.max(0, total);
}

function parsePurchaseDate(raw: Date | string): Date | null {
  const purchaseDate = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(purchaseDate.getTime()) ? null : purchaseDate;
}

function round2(n: number): number {
  return Number(n.toFixed(2));
}

function baseSummaryFields(input: {
  method: DepreciationMethodValue;
  purchaseCost: number;
  salvageValue: number;
  usefulLifeMonths: number | null;
  depreciationRatePercent: number | null;
  firstYearDepreciationRatePercent: number | null;
  monthsElapsed: number;
  bookValue: number;
  monthlyDepreciation: number | null;
  schedule: DepreciationYearRow[];
  isFullyDepreciated: boolean;
}): DepreciationSummary {
  const accumulatedDepreciation = round2(
    Math.max(0, input.purchaseCost - input.bookValue),
  );
  const depreciationPercent =
    input.purchaseCost === 0
      ? 0
      : round2(
          Math.min(100, (accumulatedDepreciation / input.purchaseCost) * 100),
        );

  return {
    method: input.method,
    purchaseCost: round2(input.purchaseCost),
    salvageValue: round2(input.salvageValue),
    usefulLifeMonths: input.usefulLifeMonths,
    depreciationRatePercent: input.depreciationRatePercent,
    firstYearDepreciationRatePercent: input.firstYearDepreciationRatePercent,
    yearsElapsed: Math.floor(input.monthsElapsed / 12),
    monthsElapsed: input.monthsElapsed,
    monthlyDepreciation:
      input.monthlyDepreciation === null
        ? null
        : round2(input.monthlyDepreciation),
    accumulatedDepreciation,
    bookValue: round2(input.bookValue),
    depreciationPercent,
    isFullyDepreciated: input.isFullyDepreciated,
    schedule: input.schedule.map((row) => ({
      ...row,
      openingValue: round2(row.openingValue),
      depreciation: round2(row.depreciation),
      closingValue: round2(row.closingValue),
    })),
  };
}

/**
 * Straight-line depreciation from purchase date.
 * Book value = max(salvage, cost - accumulated).
 */
function calculateStraightLine(
  purchaseCost: number,
  salvageValue: number,
  usefulLifeMonths: number,
  purchaseDate: Date,
  asOf: Date,
): DepreciationSummary | null {
  if (salvageValue < 0 || salvageValue > purchaseCost) return null;

  const depreciable = purchaseCost - salvageValue;
  const monthlyDepreciation = depreciable / usefulLifeMonths;
  const monthsElapsed = Math.min(
    usefulLifeMonths,
    monthsBetween(purchaseDate, asOf),
  );
  const accumulatedDepreciation = Math.min(
    depreciable,
    monthlyDepreciation * monthsElapsed,
  );
  const bookValue = Math.max(
    salvageValue,
    purchaseCost - accumulatedDepreciation,
  );

  const schedule: DepreciationYearRow[] = [];
  let opening = purchaseCost;
  const fullYears = Math.floor(monthsElapsed / 12);
  const remMonths = monthsElapsed % 12;
  const annualDep = monthlyDepreciation * 12;

  for (let year = 1; year <= fullYears; year++) {
    const dep = Math.min(opening - salvageValue, annualDep);
    const closing = Math.max(salvageValue, opening - dep);
    schedule.push({
      year,
      openingValue: opening,
      ratePercent: round2((dep / opening) * 100),
      depreciation: dep,
      closingValue: closing,
      isPartialYear: false,
    });
    opening = closing;
  }

  if (remMonths > 0 && opening > salvageValue) {
    const dep = Math.min(opening - salvageValue, monthlyDepreciation * remMonths);
    const closing = Math.max(salvageValue, opening - dep);
    schedule.push({
      year: fullYears + 1,
      openingValue: opening,
      ratePercent: round2((dep / opening) * 100),
      depreciation: dep,
      closingValue: closing,
      isPartialYear: true,
    });
  }

  return baseSummaryFields({
    method: 'STRAIGHT_LINE',
    purchaseCost,
    salvageValue,
    usefulLifeMonths,
    depreciationRatePercent: null,
    firstYearDepreciationRatePercent: null,
    monthsElapsed,
    bookValue,
    monthlyDepreciation,
    schedule,
    isFullyDepreciated: monthsElapsed >= usefulLifeMonths,
  });
}

/**
 * Reducing balance / WDV: fixed % of remaining book value each year.
 * Partial current year is pro-rated by months/12.
 */
function calculateReducingBalance(
  purchaseCost: number,
  salvageValue: number,
  annualRatePercent: number,
  purchaseDate: Date,
  asOf: Date,
  firstYearRatePercent?: number | null,
): DepreciationSummary | null {
  if (salvageValue < 0 || salvageValue > purchaseCost) return null;
  if (annualRatePercent <= 0 || annualRatePercent > 100) return null;
  if (
    firstYearRatePercent != null &&
    (firstYearRatePercent <= 0 || firstYearRatePercent > 100)
  ) {
    return null;
  }

  const monthsElapsed = monthsBetween(purchaseDate, asOf);
  const fullYears = Math.floor(monthsElapsed / 12);
  const remMonths = monthsElapsed % 12;
  const method: DepreciationMethodValue =
    firstYearRatePercent != null
      ? 'INITIAL_HIGH_REDUCING'
      : 'REDUCING_BALANCE';

  const schedule: DepreciationYearRow[] = [];
  let bookValue = purchaseCost;

  const applyYear = (
    year: number,
    ratePercent: number,
    fraction: number,
    isPartialYear: boolean,
  ) => {
    if (bookValue <= salvageValue || fraction <= 0) return;
    const opening = bookValue;
    const rawDep = opening * (ratePercent / 100) * fraction;
    const depreciation = Math.min(rawDep, opening - salvageValue);
    const closing = Math.max(salvageValue, opening - depreciation);
    schedule.push({
      year,
      openingValue: opening,
      ratePercent,
      depreciation,
      closingValue: closing,
      isPartialYear,
    });
    bookValue = closing;
  };

  for (let year = 1; year <= fullYears; year++) {
    const rate =
      year === 1 && firstYearRatePercent != null
        ? firstYearRatePercent
        : annualRatePercent;
    applyYear(year, rate, 1, false);
  }

  if (remMonths > 0) {
    const year = fullYears + 1;
    const rate =
      year === 1 && firstYearRatePercent != null
        ? firstYearRatePercent
        : annualRatePercent;
    applyYear(year, rate, remMonths / 12, true);
  }

  return baseSummaryFields({
    method,
    purchaseCost,
    salvageValue,
    usefulLifeMonths: null,
    depreciationRatePercent: annualRatePercent,
    firstYearDepreciationRatePercent: firstYearRatePercent ?? null,
    monthsElapsed,
    bookValue,
    monthlyDepreciation: null,
    schedule,
    // Reducing methods never "fully" deplete without a salvage floor;
    // mark fully depreciated only when book value has hit salvage.
    isFullyDepreciated: bookValue <= salvageValue + 0.009,
  });
}

/**
 * Dispatch depreciation calculation by method.
 */
export function calculateDepreciation(
  input: DepreciationInput,
): DepreciationSummary | null {
  const purchaseCost = toNumber(input.purchaseCost);
  const salvageValue = toNumber(input.salvageValue) ?? 0;
  const method = input.depreciationMethod ?? null;

  if (purchaseCost === null || purchaseCost < 0 || !input.purchaseDate || !method) {
    return null;
  }

  const purchaseDate = parsePurchaseDate(input.purchaseDate);
  if (!purchaseDate) return null;
  const asOf = input.asOf ?? new Date();

  if (method === 'STRAIGHT_LINE') {
    const usefulLifeMonths = input.usefulLifeMonths ?? null;
    if (!usefulLifeMonths || usefulLifeMonths <= 0) return null;
    return calculateStraightLine(
      purchaseCost,
      salvageValue,
      usefulLifeMonths,
      purchaseDate,
      asOf,
    );
  }

  if (method === 'REDUCING_BALANCE') {
    const rate = toNumber(input.depreciationRatePercent);
    if (rate === null) return null;
    return calculateReducingBalance(
      purchaseCost,
      salvageValue,
      rate,
      purchaseDate,
      asOf,
    );
  }

  if (method === 'INITIAL_HIGH_REDUCING') {
    const ongoingRate = toNumber(input.depreciationRatePercent);
    const firstYearRate = toNumber(input.firstYearDepreciationRatePercent);
    if (ongoingRate === null || firstYearRate === null) return null;
    return calculateReducingBalance(
      purchaseCost,
      salvageValue,
      ongoingRate,
      purchaseDate,
      asOf,
      firstYearRate,
    );
  }

  return null;
}

/** @deprecated use calculateDepreciation */
export function calculateStraightLineDepreciation(
  input: DepreciationInput,
): DepreciationSummary | null {
  return calculateDepreciation(input);
}
