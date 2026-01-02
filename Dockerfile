FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++

WORKDIR /app

# Copy package files first (better caching)
COPY package*.json ./

# Install all dependencies
RUN npm install --production=false

# Copy Prisma schema
COPY prisma ./prisma

# Provide dummy DATABASE_URL for Prisma
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build NestJS app
RUN npm run build

# ----------------------------
# Production stage
# ----------------------------
FROM node:18-alpine

# Install ONLY poppler-utils (contains pdftoppm)
RUN apk add --no-cache poppler-utils

WORKDIR /app

# Copy production files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Expose port
EXPOSE 5000

# Start app
CMD ["npm", "run", "start:prod"]