-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "elevationMeters" INTEGER;

-- AlterTable
ALTER TABLE "Route" ADD COLUMN     "experienceCostWon" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "foodCostWon" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalDifficultyScore" DECIMAL(7,2),
ADD COLUMN     "totalElevationGainMeters" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tpiIndex" DECIMAL(5,2),
ADD COLUMN     "transportCostWon" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "RouteStop" ADD COLUMN     "difficultyScore" DECIMAL(6,2);

-- CreateIndex
CREATE INDEX "Route_routeType_estimatedCostWon_idx" ON "Route"("routeType", "estimatedCostWon");
