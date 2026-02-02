# syntax=docker/dockerfile:1

# Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Build the app
RUN bun run build

# Production stage
FROM oven/bun:1-slim AS production

WORKDIR /app

# Copy built app and node_modules for better-sqlite3
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/drizzle ./drizzle

# Create data directory for SQLite
RUN mkdir -p /app/data

# Set environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

# Run migrations and start server
CMD ["sh", "-c", "bun run db:migrate && bun ./build/index.js"]
