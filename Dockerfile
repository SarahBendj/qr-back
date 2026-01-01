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

# Generate Prisma client before build
RUN npx prisma generate

RUN npm run build


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
 

COPY --from=builder /app/dist ./dist

EXPOSE 5000

# Start the application
CMD ["node", "dist/src/main.js"]
