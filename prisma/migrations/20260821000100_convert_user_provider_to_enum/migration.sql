DO $$
DECLARE
  provider_type text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserProvider') THEN
    CREATE TYPE "UserProvider" AS ENUM ('LOCAL', 'KAKAO', 'GOOGLE');
  END IF;

  SELECT t.typname
  INTO provider_type
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_type t ON t.oid = a.atttypid
  WHERE n.nspname = 'public'
    AND c.relname = 'User'
    AND a.attname = 'provider'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  IF EXISTS (
    SELECT 1
    FROM "User"
    WHERE "provider" IS NULL
      OR UPPER("provider"::text) NOT IN ('LOCAL', 'KAKAO', 'GOOGLE')
  ) THEN
    RAISE EXCEPTION 'Cannot convert User.provider to UserProvider: unsupported provider values exist. Back up data and correct provider values before applying this migration.';
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
    RAISE EXCEPTION 'Cannot convert User.provider to UserProvider: duplicate provider/providerId pairs would be created. Back up data and merge or correct duplicates before applying this migration.';
  END IF;

  IF provider_type IS DISTINCT FROM 'UserProvider' THEN
    UPDATE "User"
    SET "provider" = UPPER("provider"::text)
    WHERE "provider" IS NOT NULL;

    ALTER TABLE "User"
    ALTER COLUMN "provider" DROP DEFAULT;

    ALTER TABLE "User"
    ALTER COLUMN "provider" TYPE "UserProvider"
    USING "provider"::text::"UserProvider";
  END IF;

  ALTER TABLE "User"
  ALTER COLUMN "provider" SET DEFAULT 'LOCAL'::"UserProvider";
END $$;
