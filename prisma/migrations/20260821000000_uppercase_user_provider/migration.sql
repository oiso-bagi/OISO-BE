UPDATE "User"
SET "provider" = UPPER("provider")
WHERE "provider" IS NOT NULL;

ALTER TABLE "User"
ALTER COLUMN "provider" SET DEFAULT 'LOCAL';
