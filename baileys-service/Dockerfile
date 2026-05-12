FROM node:22-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx tsc

# ── Runtime image ──────────────────────────────────────────────
FROM node:22-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/index.js"]
