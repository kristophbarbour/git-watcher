FROM node:lts-alpine3.16

# Install dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh

# Create app directory
RUN mkdir -p /app
WORKDIR /app

# Install app dependencies
COPY package.json /app
COPY package-lock.json /app
RUN npm ci

# Bundle app source
COPY . /app

# Build app
RUN npm run build

# Expose port
EXPOSE 3500

# Start app
CMD [ "npm", "start" ]