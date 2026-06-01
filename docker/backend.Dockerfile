# ── deps stage ───────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
      openssl ca-certificates \
      libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libgbm1 \
      libasound2 libpango-1.0-0 libxshmfence1 \
      fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

COPY backend/package*.json ./
COPY shared/package*.json ../shared/
RUN npm install --omit=optional

# ── build stage ──────────────────────────────────────────────────────────────
FROM deps AS build
COPY backend ./
COPY shared ../shared
RUN npx prisma generate && npm run build

# ── runtime stage ────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Install Chromium itself (not just its shared libs) so puppeteer-core can render PDFs.
RUN apt-get update && apt-get install -y --no-install-recommends \
      openssl ca-certificates chromium \
      libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libgbm1 \
      libasound2 libpango-1.0-0 libxshmfence1 \
      fonts-liberation \
    && rm -rf /var/lib/apt/lists/*
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./

EXPOSE 4000
# Apply migrations, run the idempotent seed (creates roles/admin/warehouses), then start.
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed.ts && node dist/index.js"]
