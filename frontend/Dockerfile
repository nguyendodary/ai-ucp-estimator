FROM node:20-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json ./

# Install dependencies
RUN npm install

# Copy application source
COPY . .

# Expose port
EXPOSE 3000

# Set environment variable for API URL
ENV REACT_APP_API_URL=http://backend:8000

# Start development server
CMD ["npm", "start"]
