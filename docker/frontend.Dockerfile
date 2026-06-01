# ── deps ─────────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY frontend/package*.json ./
COPY shared/package*.json ../shared/
RUN npm install

# ── build ────────────────────────────────────────────────────────────────────
FROM deps AS build
# NEXT_PUBLIC_* vars are inlined at build time, so the API URL must be present here.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY frontend ./
COPY shared ../shared
RUN npm run build

# ── runtime ──────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/next.config.ts ./

EXPOSE 3000
# Render injects $PORT; fall back to 3000 locally.
CMD ["sh", "-c", "npx next start -p ${PORT:-3000}"]
