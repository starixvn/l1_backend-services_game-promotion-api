# Build stage
FROM hub.lumigame.com/base/node:20.9.0-alpine-24h1.1  AS builder

WORKDIR /app

# Copy package files and config
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy all source files and configs
COPY . .

# Build the application
RUN npm run build

# Clean development dependencies
RUN npm prune --production

# Production stage
FROM hub.lumigame.com/base/node:20.9.0-alpine-24h1.1  AS production

# Add non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app
ENV HOSTNAME=0.0.0.0
ENV PORT=5000

# Copy only necessary files from builder
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

# Copy environment file if it exists
COPY --chown=nestjs:nodejs .env* ./

# Use non-root user
USER nestjs

# Expose the port
EXPOSE 5000

# Start the application
CMD ["node", "dist/main"] 