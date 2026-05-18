# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:20-alpine AS deps
ARG http_proxy
ARG https_proxy
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG no_proxy
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json* ./
RUN npm install

# ─── Stage 2: Development ─────────────────────────────────────────────────────
FROM node:20-alpine AS development
WORKDIR /app

RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate

EXPOSE 4002
CMD ["npm", "run", "dev"]

# ─── Stage 3: Production ──────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache openssl && \
    addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nodeapp

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate

RUN chown -R nodeapp:nodejs /app
USER nodeapp

EXPOSE 4002

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:4002/health || exit 1

CMD ["node", "src/index.js"]
