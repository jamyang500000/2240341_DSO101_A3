# Use Node.js LTS
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all files
COPY . .

# Run tests
RUN npm test

# Expose the app port
EXPOSE 5000

# Start the app
CMD ["npm", "start"]