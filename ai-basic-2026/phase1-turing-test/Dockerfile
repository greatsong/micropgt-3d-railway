FROM node:20-slim

WORKDIR /app

# better-sqlite3 빌드를 위한 네이티브 도구
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --production=false

COPY . .
RUN npm run build
RUN npm prune --production

ENV NODE_ENV=production
ENV PORT=3000
ENV APP_BASE_PATH=/turing-test

EXPOSE 3000

CMD ["node", "server/index.js"]
