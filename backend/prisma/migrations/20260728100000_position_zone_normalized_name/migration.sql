-- Add normalizedName to positions and zones with backfill, enforce case-insensitive
-- uniqueness within organization at the database level.

ALTER TABLE "positions" ADD COLUMN "normalizedName" TEXT;
ALTER TABLE "zones" ADD COLUMN "normalizedName" TEXT;

-- Backfill: trim, lower-case, collapse whitespace.
UPDATE "positions"
SET "normalizedName" = regexp_replace(trim(lower("name")), '\s+', ' ', 'g');

UPDATE "zones"
SET "normalizedName" = regexp_replace(trim(lower("name")), '\s+', ' ', 'g');

ALTER TABLE "positions" ALTER COLUMN "normalizedName" SET NOT NULL;
ALTER TABLE "zones" ALTER COLUMN "normalizedName" SET NOT NULL;

CREATE UNIQUE INDEX "positions_organizationId_normalizedName_key"
  ON "positions"("organizationId", "normalizedName");

CREATE UNIQUE INDEX "zones_organizationId_normalizedName_key"
  ON "zones"("organizationId", "normalizedName");
