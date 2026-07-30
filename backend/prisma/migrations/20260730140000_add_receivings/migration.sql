-- Поступления (приход товара от поставщика с распределением по зонам).

CREATE TABLE "receivings" (
  "id"             TEXT            NOT NULL,
  "organizationId" TEXT            NOT NULL,
  "sequenceNumber" INTEGER         NOT NULL,
  "supplierId"     TEXT            NOT NULL,
  "receivedAt"     DATE            NOT NULL,
  "deliveryCost"   DECIMAL(12, 2)  NOT NULL,
  "createdById"    TEXT            NOT NULL,
  "createdAt"      TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3)    NOT NULL,

  CONSTRAINT "receivings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "receivings_organizationId_sequenceNumber_key"
  ON "receivings"("organizationId", "sequenceNumber");
CREATE INDEX "receivings_organizationId_idx"                   ON "receivings"("organizationId");
CREATE INDEX "receivings_organizationId_receivedAt_idx"        ON "receivings"("organizationId", "receivedAt");
CREATE INDEX "receivings_supplierId_idx"                       ON "receivings"("supplierId");
CREATE INDEX "receivings_createdById_idx"                      ON "receivings"("createdById");

ALTER TABLE "receivings"
  ADD CONSTRAINT "receivings_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "receivings"
  ADD CONSTRAINT "receivings_supplierId_fkey"
  FOREIGN KEY ("supplierId")     REFERENCES "suppliers"("id")     ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "receivings"
  ADD CONSTRAINT "receivings_createdById_fkey"
  FOREIGN KEY ("createdById")    REFERENCES "users"("id")         ON DELETE RESTRICT ON UPDATE CASCADE;


CREATE TABLE "receiving_items" (
  "id"          TEXT           NOT NULL,
  "receivingId" TEXT           NOT NULL,
  "productId"   TEXT           NOT NULL,
  "quantity"    DECIMAL(12, 3) NOT NULL,
  "cost"        DECIMAL(12, 2) NOT NULL,

  CONSTRAINT "receiving_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "receiving_items_receivingId_productId_key"
  ON "receiving_items"("receivingId", "productId");
CREATE INDEX "receiving_items_productId_idx" ON "receiving_items"("productId");

ALTER TABLE "receiving_items"
  ADD CONSTRAINT "receiving_items_receivingId_fkey"
  FOREIGN KEY ("receivingId") REFERENCES "receivings"("id") ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "receiving_items"
  ADD CONSTRAINT "receiving_items_productId_fkey"
  FOREIGN KEY ("productId")   REFERENCES "products"("id")   ON DELETE RESTRICT ON UPDATE CASCADE;


CREATE TABLE "receiving_allocations" (
  "id"              TEXT           NOT NULL,
  "receivingItemId" TEXT           NOT NULL,
  "zoneId"          TEXT           NOT NULL,
  "quantity"        DECIMAL(12, 3) NOT NULL,

  CONSTRAINT "receiving_allocations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "receiving_allocations_receivingItemId_zoneId_key"
  ON "receiving_allocations"("receivingItemId", "zoneId");
CREATE INDEX "receiving_allocations_zoneId_idx" ON "receiving_allocations"("zoneId");

ALTER TABLE "receiving_allocations"
  ADD CONSTRAINT "receiving_allocations_receivingItemId_fkey"
  FOREIGN KEY ("receivingItemId") REFERENCES "receiving_items"("id") ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "receiving_allocations"
  ADD CONSTRAINT "receiving_allocations_zoneId_fkey"
  FOREIGN KEY ("zoneId")          REFERENCES "zones"("id")           ON DELETE RESTRICT ON UPDATE CASCADE;
