FROM node:22-slim

RUN mkdir -p /app
COPY package.json /app
WORKDIR /app
RUN npm install
COPY . /app
RUN npm run build-ts
# Define default command.
CMD ["node", "dist/server.js"]