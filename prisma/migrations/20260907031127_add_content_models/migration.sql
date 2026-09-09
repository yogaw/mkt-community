-- CreateEnum
CREATE TYPE "VideoProviderKind" AS ENUM ('UPLOAD', 'VIMEO', 'YOUTUBE', 'OTHER');

-- CreateEnum
CREATE TYPE "LiveSessionPlatformKind" AS ENUM ('ZOOM', 'GOOGLE_MEET', 'OTHER');

-- CreateEnum
CREATE TYPE "LiveSessionStatusKind" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "t_category" (
    "id" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "t_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_video" (
    "id" VARCHAR(30) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "provider" "VideoProviderKind" NOT NULL DEFAULT 'YOUTUBE',
    "thumbnailUrl" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "category_id" VARCHAR(30) NOT NULL,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "t_video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_news" (
    "id" VARCHAR(30) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "summary" VARCHAR(500) NOT NULL,
    "content" TEXT NOT NULL,
    "image_url" TEXT,
    "category_id" VARCHAR(30) NOT NULL,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "t_news_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_announcement" (
    "id" VARCHAR(30) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "cta_label" VARCHAR(100),
    "cta_url" TEXT,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "t_announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_live_session" (
    "id" VARCHAR(30) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "platform" "LiveSessionPlatformKind" NOT NULL,
    "join_url" TEXT NOT NULL,
    "status" "LiveSessionStatusKind" NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "t_live_session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "t_category_name_key" ON "t_category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "t_category_slug_key" ON "t_category"("slug");

-- CreateIndex
CREATE INDEX "t_video_category_id_idx" ON "t_video"("category_id");

-- CreateIndex
CREATE INDEX "t_video_published_at_idx" ON "t_video"("published_at");

-- CreateIndex
CREATE INDEX "t_news_category_id_idx" ON "t_news"("category_id");

-- CreateIndex
CREATE INDEX "t_news_published_at_idx" ON "t_news"("published_at");

-- CreateIndex
CREATE INDEX "t_announcement_published_at_idx" ON "t_announcement"("published_at");

-- CreateIndex
CREATE INDEX "t_live_session_scheduled_at_idx" ON "t_live_session"("scheduled_at");

-- AddForeignKey
ALTER TABLE "t_video" ADD CONSTRAINT "t_video_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "t_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "t_news" ADD CONSTRAINT "t_news_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "t_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
