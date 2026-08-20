DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserProvider') THEN
    CREATE TYPE "UserProvider" AS ENUM ('LOCAL', 'KAKAO', 'GOOGLE');
  END IF;
END $$;

UPDATE "User"
SET "provider" = UPPER("provider")
WHERE "provider" IS NOT NULL;

ALTER TABLE "User"
ALTER COLUMN "provider" DROP DEFAULT;

ALTER TABLE "User"
ALTER COLUMN "provider" TYPE "UserProvider"
USING "provider"::"UserProvider";

ALTER TABLE "User"
ALTER COLUMN "provider" SET DEFAULT 'LOCAL'::"UserProvider";
