DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "User"
    WHERE "provider" IS NULL
      OR UPPER("provider"::text) NOT IN ('LOCAL', 'KAKAO', 'GOOGLE')
  ) THEN
    RAISE EXCEPTION 'Cannot normalize User.provider: unsupported provider values exist. Back up data and correct provider values before applying this migration.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT UPPER("provider"::text), "providerId", COUNT(*)
      FROM "User"
      WHERE "providerId" IS NOT NULL
      GROUP BY UPPER("provider"::text), "providerId"
      HAVING COUNT(*) > 1
    ) duplicate_provider_accounts
  ) THEN
    RAISE EXCEPTION 'Cannot normalize User.provider: duplicate provider/providerId pairs would be created. Back up data and merge or correct duplicates before applying this migration.';
  END IF;
END $$;

UPDATE "User"
SET "provider" = UPPER("provider"::text)
WHERE "provider" IS NOT NULL;

ALTER TABLE "User"
ALTER COLUMN "provider" SET DEFAULT 'LOCAL';
