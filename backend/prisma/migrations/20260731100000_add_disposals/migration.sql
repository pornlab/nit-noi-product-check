-- Утилизации: списание товара с зоны (порча / брак / бой посуды и т.п.).

CREATE TABLE "disposals" (
  "id"             TEXT         NOT NULL,
  "organizationId" TEXT         NOT NULL,
  "zoneId"         TEXT         NOT NULL,
  "createdById"    TEXT         NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "disposals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "disposals_organizationId_idx"            ON "disposals"("organizationId");
CREATE INDEX "disposals_organizationId_createdAt_idx"  ON "disposals"("organizationId", "createdAt");
CREATE INDEX "disposals_zoneId_idx"                    ON "disposals"("zoneId");
CREATE INDEX "disposals_createdById_idx"               ON "disposals"("createdById");

ALTER TABLE "disposals"
  ADD CONSTRAINT "disposals_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "disposals"
  ADD CONSTRAINT "disposals_zoneId_fkey"
  FOREIGN KEY ("zoneId")         REFERENCES "zones"("id")         ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "disposals"
  ADD CONSTRAINT "disposals_createdById_fkey"
  FOREIGN KEY ("createdById")    REFERENCES "users"("id")         ON DELETE RESTRICT ON UPDATE CASCADE;


CREATE TABLE "disposal_items" (
  "id"         TEXT           NOT NULL,
  "disposalId" TEXT           NOT NULL,
  "productId"  TEXT           NOT NULL,
  "quantity"   DECIMAL(12, 3) NOT NULL,

  CONSTRAINT "disposal_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "disposal_items_disposalId_productId_key"
  ON "disposal_items"("disposalId", "productId");
CREATE INDEX "disposal_items_productId_idx" ON "disposal_items"("productId");

ALTER TABLE "disposal_items"
  ADD CONSTRAINT "disposal_items_disposalId_fkey"
  FOREIGN KEY ("disposalId") REFERENCES "disposals"("id") ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "disposal_items"
  ADD CONSTRAINT "disposal_items_productId_fkey"
  FOREIGN KEY ("productId")  REFERENCES "products"("id")  ON DELETE RESTRICT ON UPDATE CASCADE;
