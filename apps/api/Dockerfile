# Multi-stage build for production optimization
FROM node:20-alpine AS base

# Install pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY package.json ./
COPY apps/api/package.json ./apps/api/

# Install dependencies based on pnpm
RUN pnpm install --frozen-lockfile --prod

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy workspace files and dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/

# Install all dependencies (including dev dependencies) for building
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/api/ ./apps/api/

# Build the application
WORKDIR /app/apps/api
RUN pnpm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 apiuser

# Copy workspace configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY package.json ./

# Copy the API package.json and built application
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Copy shared packages if needed
COPY --from=builder /app/packages ./packages

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Create logs directory with proper permissions
RUN mkdir -p /app/apps/api/logs && chown -R apiuser:nodejs /app/apps/api/logs

# Switch to non-root user
USER apiuser

# Set working directory to API
WORKDIR /app/apps/api

# Expose the port the app runs on
EXPOSE 3001

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Start the application
CMD ["pnpm", "start"]