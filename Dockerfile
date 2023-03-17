FROM node:18-slim

RUN mkdir -p /app
COPY . /app
WORKDIR /app
RUN npm install
RUN npm run build-ts
# Define default command.
CMD ["node", "dist/server.js"]