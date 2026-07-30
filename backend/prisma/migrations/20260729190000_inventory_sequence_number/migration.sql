-- Per-organization human-friendly counter for inventory sessions (INV-1, INV-2, ...).
-- Cross-org isolated: numbers restart per organization.

ALTER TABLE "inventory_sessions" ADD COLUMN "sequenceNumber" INTEGER;

-- Backfill: rank existing rows within organization by (completedAt, startedAt, id).
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY "organizationId"
           ORDER BY COALESCE("completedAt", "startedAt"), "id"
         ) AS rn
  FROM "inventory_sessions"
)
UPDATE "inventory_sessions" s
SET "sequenceNumber" = ranked.rn
FROM ranked
WHERE s.id = ranked.id;

ALTER TABLE "inventory_sessions" ALTER COLUMN "sequenceNumber" SET NOT NULL;

CREATE UNIQUE INDEX "inventory_sessions_organizationId_sequenceNumber_key"
  ON "inventory_sessions"("organizationId", "sequenceNumber");
