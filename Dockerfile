# Use a Node.js base image
FROM node:18

# Install IPFS
RUN curl -O https://dist.ipfs.tech/go-ipfs/v0.18.1/go-ipfs_v0.18.1_linux-amd64.tar.gz \
    && tar -xvzf go-ipfs_v0.18.1_linux-amd64.tar.gz \
    && mv go-ipfs/ipfs /usr/local/bin/ \
    && rm -rf go-ipfs*

# Initialize IPFS and configure CORS headers
RUN ipfs init \
    && ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]' \
    && ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT", "POST", "GET"]' \
    && ipfs config --json API.HTTPHeaders.Access-Control-Allow-Credentials '["true"]' \
    && ipfs config Addresses.API /ip4/0.0.0.0/tcp/5001

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Expose the ports your Express server and IPFS use
EXPOSE 3000 5001 4001

# Start the IPFS daemon and the Node.js server
CMD ["sh", "-c", "ipfs daemon & npm start"]
