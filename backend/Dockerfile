FROM node:20-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
ENV DB_PATH=/data/finance.sqlite
ENV DATA_PATH=/data
CMD ["sh", "-c", "node src/db/seed.js && node src/index.js"]
