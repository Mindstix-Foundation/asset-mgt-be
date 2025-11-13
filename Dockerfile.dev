# Development Dockerfile with hot reload
FROM node:22-alpine AS development

# Install required packages
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev dependencies)
RUN npm install

RUN apk add --no-cache curl
# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port and debug port
EXPOSE 3000 9229

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start in development mode with hot reload
CMD ["npm", "run", "start:dev"]
