-- Add reducing-balance depreciation methods
ALTER TYPE "DepreciationMethod" ADD VALUE 'REDUCING_BALANCE';
ALTER TYPE "DepreciationMethod" ADD VALUE 'INITIAL_HIGH_REDUCING';

ALTER TABLE "assets"
  ADD COLUMN "depreciation_rate_percent" DECIMAL(5, 2),
  ADD COLUMN "first_year_depreciation_rate_percent" DECIMAL(5, 2);
