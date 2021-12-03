# Use the official lightweight Node.js 12 image.
# https://hub.docker.com/_/node
# FROM node:17-slim

# # Create and change to the app directory.
# WORKDIR /usr/src/app

# # Copy application dependency manifests to the container image.
# # A wildcard is used to ensure both package.json AND package-lock.json are copied.
# # Copying this separately prevents re-running npm install on every code change.
# COPY package*.json ./

# # Install dependencies.
# # If you add a package-lock.json speed your build by switching to 'npm ci'.
# # RUN npm ci --only=production
# RUN npm install --production

# # Copy local code to the container image.
# COPY . ./

# # Run the web service on container startup.
# CMD ["node", "index.js"]

FROM node:12.13.0
RUN mkdir -p /code
WORKDIR /code
ADD . /code

# RUN npm install -g -s --no-progress yarn
RUN yarn install --production

# RUN yarn generate-api-key

CMD ["yarn","start"]

EXPOSE 80
