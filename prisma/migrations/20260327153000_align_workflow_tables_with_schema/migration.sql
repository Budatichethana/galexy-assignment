-- Align existing tables with current Prisma schema fields used by APIs.

-- Workflow: add missing columns expected by Prisma model and queries.
ALTER TABLE "Workflow"
  ADD COLUMN IF NOT EXISTS "userId" TEXT,
  ADD COLUMN IF NOT EXISTS "name" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);

-- Backfill null values to make fields usable and consistent.
UPDATE "Workflow"
SET
  "userId" = COALESCE("userId", '__legacy_user__'),
  "updatedAt" = COALESCE("updatedAt", "createdAt");

-- Enforce required columns from Prisma schema.
ALTER TABLE "Workflow"
  ALTER COLUMN "userId" SET NOT NULL,
  ALTER COLUMN "updatedAt" SET NOT NULL;

-- WorkflowRun: add missing userId from Prisma model.
ALTER TABLE "WorkflowRun"
  ADD COLUMN IF NOT EXISTS "userId" TEXT;

UPDATE "WorkflowRun"
SET "userId" = COALESCE("userId", '__legacy_user__');

ALTER TABLE "WorkflowRun"
  ALTER COLUMN "userId" SET NOT NULL;
