# Builds and runs Tafawoq in a container (Node 22.22.2, the version pinned in
# package.json "engines" and .nvmrc) — pairs with
# docker-compose.yml's MySQL service, or with any host (Railway, a bare
# VPS, etc.) that just points DATABASE_URL at a real MySQL instance.
#
# Uses npm + package-lock.json, not pnpm/corepack: corepack needs to write
# its shims into a location it doesn't always have permission for in a
# locked-down build environment (this bit Replit's build for the same
# reason — see REPLIT.md) — npm avoids that whole class of failure and
# package-lock.json is kept in sync alongside pnpm-lock.yaml.
#
# Actually verified end-to-end in this sandbox (no functional Docker
# daemon available here, so via a plain `npm ci`/`npm ci --omit=dev` +
# `node dist/index.js` run standing in for the two stages below): a
# genuinely production-only install (no devDependencies, "vite" absent)
# starts and serves real requests correctly — this used to crash
# immediately with `Cannot find package 'vite'` before
# server/_core/index.ts's dev-only Vite setup was split into its own
# dynamically-imported module (see server/_core/viteDevServer.ts and
# server/_core/staticServe.ts) — every previous test of this app,
# including on Replit, happened to have devDependencies installed too,
# which is exactly why this had never been caught before.

FROM node:22.22.2-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22.22.2-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/scripts ./scripts
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Applies any not-yet-applied drizzle/*.sql migration (tracked in a real
# _migrations table, so this is safe and a no-op on every redeploy after
# the first) before starting the server — the one thing a single
# Dockerfile-based host (Railway, etc.) needs done automatically, since it
# has no separate "run this once after deploy" step the way
# docker-compose's manual step 3 assumes.
# The free Piper teacher voices are fetched once, in the background, into
# TAFAWOQ_PIPER_DIR (the uploads volume in docker-compose.yml) — the server
# starts right away and uses the browser's voice until they are ready.
# Files already there are skipped, so an interrupted download completes.
CMD ["sh", "-c", "node scripts/migrate.mjs && (if [ -n \"$TAFAWOQ_PIPER_DIR\" ]; then node scripts/fetch-piper.mjs \"$TAFAWOQ_PIPER_DIR\" > /tmp/piper-fetch.log 2>&1 & fi) && exec node dist/index.js"]
