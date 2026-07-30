-- Inventory MVP: session groups items counted for one zone in one pass.
-- "Current stock" of a (zoneId, productId) is the quantity from the newest
-- completed session's item — computed on read, never mutated.

CREATE TABLE "inventory_sessions" (
  "id"             TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "zoneId"         TEXT NOT NULL,
  "createdById"    TEXT NOT NULL,
  "startedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt"    TIMESTAMP(3),

  CONSTRAINT "inventory_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "inventory_sessions_organizationId_idx" ON "inventory_sessions"("organizationId");
CREATE INDEX "inventory_sessions_zoneId_idx"        ON "inventory_sessions"("zoneId");
CREATE INDEX "inventory_sessions_completedAt_idx"   ON "inventory_sessions"("completedAt");

ALTER TABLE "inventory_sessions"
  ADD CONSTRAINT "inventory_sessions_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inventory_sessions"
  ADD CONSTRAINT "inventory_sessions_zoneId_fkey"
  FOREIGN KEY ("zoneId") REFERENCES "zones"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_sessions"
  ADD CONSTRAINT "inventory_sessions_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "inventory_items" (
  "id"                 TEXT NOT NULL,
  "inventorySessionId" TEXT NOT NULL,
  "productId"          TEXT NOT NULL,
  "quantity"           DECIMAL(12, 3) NOT NULL,

  CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "inventory_items_inventorySessionId_idx" ON "inventory_items"("inventorySessionId");
CREATE INDEX "inventory_items_productId_idx"          ON "inventory_items"("productId");

ALTER TABLE "inventory_items"
  ADD CONSTRAINT "inventory_items_inventorySessionId_fkey"
  FOREIGN KEY ("inventorySessionId") REFERENCES "inventory_sessions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inventory_items"
  ADD CONSTRAINT "inventory_items_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
