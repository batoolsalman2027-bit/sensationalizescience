FROM node:22-bookworm-slim AS base

# Chrome / Remotion shared library deps (see https://www.remotion.dev/docs/docker)
RUN apt-get update && apt-get install -y \
  libnss3 \
  libdbus-1-3 \
  libatk1.0-0 \
  libgbm-dev \
  libasound2 \
  libxrandr2 \
  libxkbcommon-dev \
  libxfixes3 \
  libxcomposite1 \
  libxdamage1 \
  libatk-bridge2.0-0 \
  libpango-1.0-0 \
  libcairo2 \
  libcups2 \
  fonts-noto-color-emoji \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx remotion browser ensure
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

WORKDIR /app

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/app ./app
COPY --from=builder /app/components ./components
COPY --from=builder /app/config ./config
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/remotion ./remotion
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/scripts ./scripts
# Remotion Chrome cache from builder
COPY --from=builder /root/.cache /root/.cache

RUN mkdir -p /data/db /data/renders public/renders data \
  && chmod +x scripts/railway-start.sh

EXPOSE 3000

CMD ["bash", "scripts/railway-start.sh"]
