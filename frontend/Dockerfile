# Use Node alpine (lightweight)
FROM node:22-alpine

WORKDIR /app

# Install dependencies first (caching layer optimization)
COPY package.json package-lock.json ./
RUN npm install

# Copy source code
COPY . .

# Expose Vite default port
EXPOSE 5173

# Start development server
CMD ["npm", "run", "dev", "--", "--host"]