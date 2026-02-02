# Build stage
FROM oven/bun:1.3 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Build the app
RUN bun run build

# Production stage
FROM oven/bun:1.3-slim

WORKDIR /app

# Copy built application
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Create data directory for SQLite
RUN mkdir -p /opt/neat/data

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

EXPOSE 3000

# Run with bun
CMD ["bun", "run", "build/index.js"]
