-- Products master catalog. Product describes an item; state (stock, prices, etc.)
-- lives in future operational tables. Uniqueness of normalized name / sku / barcode
-- inside an organization is enforced by DB.

CREATE TABLE "products" (
  "id"                 TEXT NOT NULL,
  "organizationId"     TEXT NOT NULL,
  "categoryId"         TEXT,
  "name"               TEXT NOT NULL,
  "normalizedName"     TEXT NOT NULL,
  "description"        TEXT,
  "baseUnit"           "Unit" NOT NULL,
  "sku"                TEXT,
  "normalizedSku"      TEXT,
  "barcode"            TEXT,
  "normalizedBarcode"  TEXT,
  "isInventoryTracked" BOOLEAN NOT NULL DEFAULT true,
  "isPurchasable"      BOOLEAN NOT NULL DEFAULT true,
  "isActive"           BOOLEAN NOT NULL DEFAULT true,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL,

  CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "products_organizationId_normalizedName_key"
  ON "products"("organizationId", "normalizedName");

CREATE UNIQUE INDEX "products_organizationId_normalizedSku_key"
  ON "products"("organizationId", "normalizedSku");

CREATE UNIQUE INDEX "products_organizationId_normalizedBarcode_key"
  ON "products"("organizationId", "normalizedBarcode");

CREATE INDEX "products_organizationId_idx"
  ON "products"("organizationId");

CREATE INDEX "products_organizationId_categoryId_idx"
  ON "products"("organizationId", "categoryId");

CREATE INDEX "products_organizationId_isActive_idx"
  ON "products"("organizationId", "isActive");

CREATE INDEX "products_organizationId_isInventoryTracked_idx"
  ON "products"("organizationId", "isInventoryTracked");

CREATE INDEX "products_organizationId_isPurchasable_idx"
  ON "products"("organizationId", "isPurchasable");

CREATE INDEX "products_organizationId_baseUnit_idx"
  ON "products"("organizationId", "baseUnit");

ALTER TABLE "products"
  ADD CONSTRAINT "products_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "products"
  ADD CONSTRAINT "products_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "categories"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
