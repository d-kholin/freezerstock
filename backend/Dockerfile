FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_PATH=/app/data/freezerstock.db

EXPOSE 3001

CMD ["node", "dist/index.js"]
