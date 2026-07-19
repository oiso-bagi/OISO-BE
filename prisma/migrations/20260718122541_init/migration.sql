-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "PlaceCategory" AS ENUM ('MARKET', 'CAFE', 'FOOD', 'CULTURE', 'NATURE', 'EXPERIENCE', 'VIEWPOINT', 'ETC');

-- CreateEnum
CREATE TYPE "DistrictType" AS ENUM ('DOWNTOWN', 'TOURIST', 'LOCAL');

-- CreateEnum
CREATE TYPE "RouteType" AS ENUM ('RECOMMENDED', 'SAVED');

-- CreateEnum
CREATE TYPE "CongestionLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('TERMS', 'PRIVACY', 'AGE', 'MARKETING', 'LOCATION');

-- CreateEnum
CREATE TYPE "ConsentScope" AS ENUM ('REQUIRED', 'OPTIONAL');

-- CreateEnum
CREATE TYPE "TransitType" AS ENUM ('WALKING', 'BUS', 'SUBWAY', 'DRIVING', 'TAXI', 'BIKING');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'local',
    "providerId" TEXT,
    "nickname" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "birthDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Place" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "roadAddress" TEXT,
    "region" TEXT NOT NULL,
    "district" TEXT,
    "districtType" "DistrictType" NOT NULL DEFAULT 'TOURIST',
    "category" "PlaceCategory" NOT NULL,
    "apiSourceId" TEXT,
    "premiumIndex" DECIMAL(5,2),
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "averagePriceWon" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Theme" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Theme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT,
    "region" TEXT NOT NULL,
    "description" TEXT,
    "routeType" "RouteType" NOT NULL DEFAULT 'RECOMMENDED',
    "congestionLevel" "CongestionLevel" NOT NULL DEFAULT 'MEDIUM',
    "score" DECIMAL(5,2),
    "estimatedCostWon" INTEGER NOT NULL,
    "estimatedDurationMin" INTEGER NOT NULL,
    "totalDistanceMeters" INTEGER NOT NULL,
    "estimatedSavingsWon" INTEGER NOT NULL DEFAULT 0,
    "localContributionScore" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "averageRating" DECIMAL(3,2),

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteStop" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "transitType" "TransitType",
    "transitDetails" JSONB,
    "stayMinutes" INTEGER,
    "travelMinutesFromPrev" INTEGER,
    "distanceFromPrevMeters" INTEGER,
    "elevationGainMeters" INTEGER,
    "fareWon" INTEGER,
    "trafficNotes" TEXT,
    "estimatedPriceWon" INTEGER,
    "savingsWon" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouteStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteTheme" (
    "routeId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouteTheme_pkey" PRIMARY KEY ("routeId","themeId")
);

-- CreateTable
CREATE TABLE "SavedRoute" (
    "userId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedRoute_pkey" PRIMARY KEY ("userId","routeId")
);

-- CreateTable
CREATE TABLE "NotificationSetting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "marketingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "nightModeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "routeRecommendationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserConsent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ConsentType" NOT NULL,
    "scope" "ConsentScope" NOT NULL,
    "isAgreed" BOOLEAN NOT NULL DEFAULT true,
    "version" TEXT NOT NULL,
    "agreedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteTrip" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "actualCostWon" INTEGER,
    "isCompleted" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouteTrip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_nickname_key" ON "User"("nickname");

-- CreateIndex
CREATE UNIQUE INDEX "Place_apiSourceId_key" ON "Place"("apiSourceId");

-- CreateIndex
CREATE INDEX "Place_region_idx" ON "Place"("region");

-- CreateIndex
CREATE INDEX "Place_category_idx" ON "Place"("category");

-- CreateIndex
CREATE INDEX "Place_districtType_idx" ON "Place"("districtType");

-- CreateIndex
CREATE INDEX "Place_region_category_idx" ON "Place"("region", "category");

-- CreateIndex
CREATE INDEX "Place_districtType_category_idx" ON "Place"("districtType", "category");

-- CreateIndex
CREATE UNIQUE INDEX "Theme_slug_key" ON "Theme"("slug");

-- CreateIndex
CREATE INDEX "Route_region_idx" ON "Route"("region");

-- CreateIndex
CREATE INDEX "Route_score_idx" ON "Route"("score");

-- CreateIndex
CREATE INDEX "Route_routeType_score_idx" ON "Route"("routeType", "score");

-- CreateIndex
CREATE INDEX "RouteStop_routeId_idx" ON "RouteStop"("routeId");

-- CreateIndex
CREATE INDEX "RouteStop_placeId_idx" ON "RouteStop"("placeId");

-- CreateIndex
CREATE UNIQUE INDEX "RouteStop_routeId_orderIndex_key" ON "RouteStop"("routeId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "RouteStop_routeId_placeId_key" ON "RouteStop"("routeId", "placeId");

-- CreateIndex
CREATE INDEX "RouteTheme_routeId_idx" ON "RouteTheme"("routeId");

-- CreateIndex
CREATE INDEX "RouteTheme_themeId_idx" ON "RouteTheme"("themeId");

-- CreateIndex
CREATE INDEX "SavedRoute_userId_idx" ON "SavedRoute"("userId");

-- CreateIndex
CREATE INDEX "SavedRoute_routeId_idx" ON "SavedRoute"("routeId");

-- CreateIndex
CREATE INDEX "SavedRoute_userId_savedAt_idx" ON "SavedRoute"("userId", "savedAt");

-- CreateIndex
CREATE INDEX "SavedRoute_routeId_savedAt_idx" ON "SavedRoute"("routeId", "savedAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSetting_userId_key" ON "NotificationSetting"("userId");

-- CreateIndex
CREATE INDEX "UserConsent_userId_type_idx" ON "UserConsent"("userId", "type");

-- CreateIndex
CREATE INDEX "UserConsent_scope_idx" ON "UserConsent"("scope");

-- CreateIndex
CREATE UNIQUE INDEX "UserConsent_userId_type_version_key" ON "UserConsent"("userId", "type", "version");

-- CreateIndex
CREATE INDEX "RouteTrip_userId_idx" ON "RouteTrip"("userId");

-- CreateIndex
CREATE INDEX "RouteTrip_routeId_idx" ON "RouteTrip"("routeId");

-- CreateIndex
CREATE INDEX "RouteTrip_startedAt_idx" ON "RouteTrip"("startedAt");

-- CreateIndex
CREATE INDEX "RouteTrip_userId_startedAt_idx" ON "RouteTrip"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "RouteTrip_userId_routeId_idx" ON "RouteTrip"("userId", "routeId");

-- AddForeignKey
ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteTheme" ADD CONSTRAINT "RouteTheme_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteTheme" ADD CONSTRAINT "RouteTheme_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedRoute" ADD CONSTRAINT "SavedRoute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedRoute" ADD CONSTRAINT "SavedRoute_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSetting" ADD CONSTRAINT "NotificationSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConsent" ADD CONSTRAINT "UserConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteTrip" ADD CONSTRAINT "RouteTrip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteTrip" ADD CONSTRAINT "RouteTrip_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;
