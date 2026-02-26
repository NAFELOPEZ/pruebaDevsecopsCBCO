FROM node:20-alpine AS base

WORKDIR /app

COPY app/package*.json ./
RUN npm ci --omit=dev

COPY app/src ./src

EXPOSE 3000
CMD ["node", "src/index.js"]