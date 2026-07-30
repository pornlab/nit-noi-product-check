-- Allow admin to correct completed inventory items (mistakes reported by staff).
-- Session itself remains as originally created; item edits are tracked via
-- updatedAt (auto) and updatedById (nullable — SET NULL on user delete).

ALTER TABLE "inventory_items"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "inventory_items"
  ADD COLUMN "updatedById" TEXT;

ALTER TABLE "inventory_items"
  ADD CONSTRAINT "inventory_items_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
