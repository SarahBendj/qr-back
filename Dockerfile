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

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Provide a dummy DATABASE_URL for Prisma generate
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

# Generate Prisma client ONLY
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

# Copy built app and node_modules from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# DEBUG: Verify what's copied
RUN echo "=== Checking /app contents ===" && ls -la /app/
RUN echo "=== Checking if node_modules exists ===" && ls -la /app/node_modules | head -20
RUN echo "=== Checking for pdf-to-png-converter ===" && ls -la /app/node_modules/ | grep pdf || echo "NOT FOUND in node_modules root"
RUN echo "=== Full check ===" && find /app/node_modules -name "pdf-to-png-converter" -type d || echo "NOT FOUND anywhere"

# Expose port
EXPOSE 5000

# Start the app (run migrations then main)
CMD ["npm", "run", "start:prod"]
