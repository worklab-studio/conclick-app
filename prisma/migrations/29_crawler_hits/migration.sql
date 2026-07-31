-- CreateTable
CREATE TABLE "crawler_hit" (
    "crawler_hit_id" BIGSERIAL NOT NULL,
    "website_id" UUID,
    "bot_name" VARCHAR(100) NOT NULL,
    "company" VARCHAR(50) NOT NULL,
    "category" VARCHAR(20) NOT NULL,
    "source" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crawler_hit_pkey" PRIMARY KEY ("crawler_hit_id")
);

-- CreateIndex
CREATE INDEX "crawler_hit_website_id_created_at_idx" ON "crawler_hit"("website_id", "created_at");

-- CreateIndex
CREATE INDEX "crawler_hit_created_at_idx" ON "crawler_hit"("created_at");
