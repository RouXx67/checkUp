# Multi-stage build for CheckUp application

# Stage 1: Build the frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./

# Install client dependencies
RUN npm ci --only=production

# Copy client source code
COPY client/ ./

# Build the frontend
RUN npm run build

# Stage 2: Setup the backend and serve the application
FROM node:18-alpine AS production

# Install system dependencies
RUN apk add --no-cache \
    sqlite \
    curl \
    ca-certificates

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S checkup -u 1001

# Copy backend package files
COPY package*.json ./

# Install backend dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy backend source code
COPY server.js ./
COPY backend/ ./backend/
COPY .env.example ./

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/client/dist ./client/dist

# Create data directory for SQLite database
RUN mkdir -p /app/data && \
    chown -R checkup:nodejs /app

# Switch to non-root user
USER checkup

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server.js"]