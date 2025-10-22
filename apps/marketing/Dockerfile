FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy project files
COPY . .

# Expose port
EXPOSE 5174

# Start Next.js development server
CMD ["npm", "run", "dev"]