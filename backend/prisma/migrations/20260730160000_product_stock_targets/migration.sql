-- Целевые уровни запаса товара (не блокирующие; используются для будущих списков закупок).
ALTER TABLE "products"
  ADD COLUMN "minQuantity"     DECIMAL(12, 3),
  ADD COLUMN "optimalQuantity" DECIMAL(12, 3);
