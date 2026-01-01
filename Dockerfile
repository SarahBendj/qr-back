# ----------------------------
# Builder stage
# ----------------------------
FROM node:18-alpine AS builder

# Install build dependencies for pdf-to-png-converter
RUN apk add --no-cache \
    cairo-dev \
    pango-dev \
    pixman-dev \
    g++ \
    make \
    python3

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies for build
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client ONLY (no migrations during build)
RUN npx prisma generate

# Build the NestJS app
RUN npm run build

# ----------------------------
# Production stage
# ----------------------------
FROM node:18-alpine

# Install runtime dependencies for pdf-to-png-converter
RUN apk add --no-cache \
    cairo \
    pango \
    pixman

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built app, Prisma client and migrations from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Expose the port
EXPOSE 5000

# Run migrations at startup, then start the app
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]