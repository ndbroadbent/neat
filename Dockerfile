# syntax=docker/dockerfile:1

# Build stage - using Node for better-sqlite3 compatibility
FROM node:22-slim AS builder

# Install build dependencies for better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install bun for package management
RUN npm install -g bun

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Build the app
RUN bun run build

# Production stage
FROM node:22-slim AS production

WORKDIR /app

# Copy built app and dependencies (better-sqlite3 needs node_modules)
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./

# Create data directory for SQLite
RUN mkdir -p /app/data

# Set environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV DATABASE_URL=file:/app/data/neat.db

EXPOSE 3000

# Run migrations and start server
CMD ["sh", "-c", "npx drizzle-kit migrate && node ./build/index.js"]
