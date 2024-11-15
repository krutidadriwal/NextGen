# Use an official Node.js image as the base
FROM node:18

# Set the working directory inside the container
WORKDIR /app

ENV NODE_PATH=./node_modules

# Copy package.json and package-lock.json to install dependencies first
COPY package*.json ./

# Install dependencies, including web3
RUN npm install web3 --save


# Copy the rest of the application code into the working directory
COPY . .


# Expose the port your app runs on
EXPOSE 4000

# Run the app
CMD ["node", "app.js"]
