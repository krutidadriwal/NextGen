# Use a Node.js base image
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the hardhat project files
COPY . .

# Expose Hardhat's default port for the local blockchain network
EXPOSE 8545

