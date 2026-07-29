-- Category catalogue per organization + system-wide Unit enum.
-- Unit enum is not yet used by any model; it will be attached to Product later.

CREATE TYPE "Unit" AS ENUM (
  'PIECE', 'GRAM', 'KILOGRAM', 'MILLILITER', 'LITER',
  'PACK', 'BOX', 'BOTTLE', 'CAN', 'BAG'
);

CREATE TABLE "categories" (
  "id"             TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "description"    TEXT,
  "isActive"       BOOLEAN NOT NULL DEFAULT true,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "categories_organizationId_normalizedName_key"
  ON "categories"("organizationId", "normalizedName");

CREATE INDEX "categories_organizationId_idx"
  ON "categories"("organizationId");

CREATE INDEX "categories_organizationId_isActive_idx"
  ON "categories"("organizationId", "isActive");

CREATE INDEX "categories_organizationId_name_idx"
  ON "categories"("organizationId", "name");

ALTER TABLE "categories"
  ADD CONSTRAINT "categories_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
