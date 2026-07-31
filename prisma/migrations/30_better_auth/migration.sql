-- Better Auth tables (namespaced auth_*)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "auth_id" VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS "user_auth_id_key" ON "user"("auth_id");

CREATE TABLE IF NOT EXISTS "auth_user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "auth_user_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "auth_user_email_key" ON "auth_user"("email");

CREATE TABLE IF NOT EXISTS "auth_session" (
    "id" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "token" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "auth_session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "auth_session_token_key" ON "auth_session"("token");
CREATE INDEX IF NOT EXISTS "auth_session_user_id_idx" ON "auth_session"("user_id");

CREATE TABLE IF NOT EXISTS "auth_account" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "access_token_expires_at" TIMESTAMPTZ(6),
    "refresh_token_expires_at" TIMESTAMPTZ(6),
    "scope" TEXT,
    "password" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "auth_account_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "auth_account_user_id_idx" ON "auth_account"("user_id");

CREATE TABLE IF NOT EXISTS "auth_verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "auth_verification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "auth_verification_identifier_idx" ON "auth_verification"("identifier");
