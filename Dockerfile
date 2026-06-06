# Install dependencies only when needed
FROM node:22-alpine AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm
# Latest pnpm hard-fails on un-approved dependency build scripts. Install with
# --ignore-scripts (exit 0): the native packages (esbuild/sharp/unrs-resolver)
# ship prebuilt binaries via optionalDependencies and don't need their scripts;
# the prisma engine is rebuilt explicitly in the runner stage; and the umami
# root postinstall (prisma generate) runs in the builder stage via build-docker.
RUN pnpm install --frozen-lockfile --ignore-scripts

# Rebuild the source code only when needed
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NOTE: the upstream "COPY docker/middleware.ts ./src" was removed — src/middleware.ts
# is now the single source of truth (Clerk auth + umami tracker rewrites merged).

ARG DATABASE_TYPE
ARG BASE_PATH

ENV DATABASE_TYPE=$DATABASE_TYPE
ENV BASE_PATH=$BASE_PATH

# Clerk publishable key + routing must be present at BUILD time — Next.js inlines
# NEXT_PUBLIC_* into the client bundle during `next build`. Without these, clerk-js
# never initializes in production.
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL
ARG NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL
ARG NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL
ARG NEXT_PUBLIC_APP_URL

ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL
ENV NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL
ENV NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

ENV NEXT_TELEMETRY_DISABLED=1

# next build for this app is memory-heavy; give Node a large heap so the
# builder doesn't OOM during the production build.
ENV NODE_OPTIONS="--max-old-space-size=6144"

RUN npm run build-docker

# Production image, copy all the files and run next
FROM node:22-alpine AS runner
WORKDIR /app

ARG NODE_OPTIONS

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS=$NODE_OPTIONS

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

RUN set -x \
    && apk add --no-cache curl

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/generated ./generated

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Run the self-contained Next standalone server directly. DB migrations are
# applied out-of-band (see deploy docs) rather than at boot, so we don't need
# the prisma CLI / npm-run-all / chalk-semver-dotenv tooling in the runtime
# image — keeping it small and avoiding the pnpm/npm node_modules conflicts.
CMD ["node", "server.js"]
