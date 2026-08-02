# Use official Python 3.10 slim image with Node.js installed
FROM python:3.10-slim

# Install Node.js 20 and system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency definition files
COPY package*.json ./
COPY requirements.txt ./

# Install Node and Python dependencies
RUN npm install
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Build the Vite frontend and bundle server.ts
RUN npm run build

# Environment variables defaults
ENV PORT=3000
ENV PYTHON_PORT=8001
ENV NODE_ENV=production

EXPOSE 3000

# Start the unified server (spawns Python FastAPI backend + Node Express server)
CMD ["npm", "start"]
