-- AlterTable: add Clerk identity column and relax the local password requirement
-- (Clerk now owns authentication, so users created via Clerk have no local password).
ALTER TABLE "user" ADD COLUMN "clerk_id" VARCHAR(255);
ALTER TABLE "user" ALTER COLUMN "password" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "user_clerk_id_key" ON "user"("clerk_id");
