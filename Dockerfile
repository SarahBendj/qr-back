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

# Install ALL dependencies (needed for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
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

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Expose port (adjust if your NestJS uses different port)
EXPOSE 3000

# Start the application
CMD ["node", "dist/main.js"]
