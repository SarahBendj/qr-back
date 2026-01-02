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

# Use npm install instead of npm ci to force fresh install
RUN npm install --production=false

# Force install pdf-to-png-converter explicitly
RUN npm install pdf-to-png-converter@3.11.0 --save

# DEBUG: Check if pdf-to-png-converter was installed IN BUILDER
RUN echo "=== BUILDER: Checking for pdf-to-png-converter ===" && \
    ls -la /app/node_modules/ | grep pdf && \
    ls -la /app/node_modules/pdf-to-png-converter || echo "NOT INSTALLED IN BUILDER"

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

# DEBUG: Verify what's copied in PRODUCTION
RUN echo "=== PRODUCTION: Checking for pdf-to-png-converter ===" && \
    ls -la /app/node_modules/ | grep pdf || echo "NOT FOUND in production node_modules"

# Expose port
EXPOSE 5000

# Start the app (run migrations then main)
CMD ["npm", "run", "start:prod"]