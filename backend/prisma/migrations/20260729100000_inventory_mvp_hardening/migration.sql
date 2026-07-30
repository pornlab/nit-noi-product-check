-- Inventory MVP hardening:
--   1. Explicit product ↔ zone assignment (product_zones).
--   2. Session status enum (existing rows are COMPLETED — earlier POST always
--      created completed sessions).
--   3. Unique guarantee (session, product) — one product only once per session.
--   4. New index (organizationId, zoneId, completedAt) accelerates lastQuantity.

-- 1. Session status enum + column
CREATE TYPE "InventorySessionStatus" AS ENUM ('DRAFT', 'COMPLETED', 'CANCELLED');

ALTER TABLE "inventory_sessions"
  ADD COLUMN "status" "InventorySessionStatus" NOT NULL DEFAULT 'COMPLETED';

-- 2. Composite indexes (drop the single-column zoneId one; keep new)
DROP INDEX IF EXISTS "inventory_sessions_zoneId_idx";
CREATE INDEX "inventory_sessions_organizationId_zoneId_idx"
  ON "inventory_sessions"("organizationId", "zoneId");
CREATE INDEX "inventory_sessions_organizationId_zoneId_completedAt_idx"
  ON "inventory_sessions"("organizationId", "zoneId", "completedAt");
CREATE INDEX "inventory_sessions_createdById_idx"
  ON "inventory_sessions"("createdById");

-- 3. Unique (session, product)
CREATE UNIQUE INDEX "inventory_items_inventorySessionId_productId_key"
  ON "inventory_items"("inventorySessionId", "productId");

-- 4. product_zones — explicit assignment of products to zones (per organization)
CREATE TABLE "product_zones" (
  "id"             TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "productId"      TEXT NOT NULL,
  "zoneId"         TEXT NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "product_zones_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_zones_productId_zoneId_key"
  ON "product_zones"("productId", "zoneId");

CREATE INDEX "product_zones_organizationId_zoneId_idx"
  ON "product_zones"("organizationId", "zoneId");

CREATE INDEX "product_zones_organizationId_productId_idx"
  ON "product_zones"("organizationId", "productId");

ALTER TABLE "product_zones"
  ADD CONSTRAINT "product_zones_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_zones"
  ADD CONSTRAINT "product_zones_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_zones"
  ADD CONSTRAINT "product_zones_zoneId_fkey"
  FOREIGN KEY ("zoneId") REFERENCES "zones"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
