# ContractGuard Frontend Dockerfile
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Development stage
FROM base AS development
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "start"]

# Build stage
FROM base AS build
COPY package*.json ./
RUN npm ci
COPY . .

# Build arguments for environment variables
ARG REACT_APP_API_URL
ARG REACT_APP_APP_NAME="ContractGuard"
ARG REACT_APP_VERSION="1.0.0"

# Set environment variables for build
ENV REACT_APP_API_URL=${REACT_APP_API_URL}
ENV REACT_APP_APP_NAME=${REACT_APP_APP_NAME}
ENV REACT_APP_VERSION=${REACT_APP_VERSION}
ENV GENERATE_SOURCEMAP=false
ENV CI=true

# Build the application
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built application
COPY --from=build /app/build /usr/share/nginx/html

# Create nginx user
RUN addgroup -g 1001 -S nginx && \
    adduser -S contractguard -u 1001 -G nginx

# Set proper permissions
RUN chown -R contractguard:nginx /usr/share/nginx/html && \
    chown -R contractguard:nginx /var/cache/nginx && \
    chown -R contractguard:nginx /var/log/nginx && \
    chown -R contractguard:nginx /etc/nginx/conf.d

# Switch to non-root user
USER contractguard

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/ || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]