FROM node:20-alpine

# Install dependencies
RUN apk add --no-cache \
    curl \
    bash \
    docker-cli \
    docker-cli-compose

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server ./server
COPY client ./client

# Install dependencies
RUN npm install && cd client && npm install && npm run build

# Create directories
RUN mkdir -p data uploads

# Expose ports
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start command
CMD ["sh", "-c", "npm run server"]
