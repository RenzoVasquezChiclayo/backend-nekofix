-- CreateEnum
CREATE TYPE "ExternalReviewSource" AS ENUM ('GOOGLE_MAPS', 'TRUSTPILOT', 'FACEBOOK', 'INTERNAL');

-- CreateTable
CREATE TABLE "ExternalReview" (
    "id" TEXT NOT NULL,
    "source" "ExternalReviewSource" NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorPhoto" TEXT,
    "rating" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "relativeTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalReviewSummary" (
    "source" "ExternalReviewSource" NOT NULL,
    "averageRating" DECIMAL(3,2),
    "totalReviews" INTEGER,
    "lastSyncedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalReviewSummary_pkey" PRIMARY KEY ("source")
);

-- CreateIndex
CREATE INDEX "ExternalReview_source_createdAt_idx" ON "ExternalReview"("source", "createdAt" DESC);
