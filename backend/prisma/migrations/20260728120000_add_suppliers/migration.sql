-- Supplier catalogue: one row per counterparty an organization buys from.
-- Uniqueness of normalized name inside an organization is enforced by DB.

CREATE TABLE "suppliers" (
  "id"             TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "contactPerson"  TEXT,
  "phone"          TEXT,
  "email"          TEXT,
  "address"        TEXT,
  "taxId"          TEXT,
  "notes"          TEXT,
  "isActive"       BOOLEAN NOT NULL DEFAULT true,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "suppliers_organizationId_normalizedName_key"
  ON "suppliers"("organizationId", "normalizedName");

CREATE INDEX "suppliers_organizationId_idx"
  ON "suppliers"("organizationId");

CREATE INDEX "suppliers_organizationId_isActive_idx"
  ON "suppliers"("organizationId", "isActive");

CREATE INDEX "suppliers_organizationId_name_idx"
  ON "suppliers"("organizationId", "name");

ALTER TABLE "suppliers"
  ADD CONSTRAINT "suppliers_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
