-- CreateTable
CREATE TABLE "RecommendationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "travelStyleSlugs" TEXT[],
    "durationDays" INTEGER NOT NULL,
    "dailyBudgetWon" INTEGER NOT NULL,
    "budgetAllocation" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecommendationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationPreference_userId_key" ON "RecommendationPreference"("userId");

-- CreateIndex
CREATE INDEX "RecommendationPreference_userId_idx" ON "RecommendationPreference"("userId");

-- AddForeignKey
ALTER TABLE "RecommendationPreference" ADD CONSTRAINT "RecommendationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
