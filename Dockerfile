FROM node:22-bookworm-slim

WORKDIR /app

COPY server/package.json server/package-lock.json ./server/
RUN npm --prefix server ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/app/server/src/db/yardline.db

EXPOSE 3000

CMD ["node", "server/src/server.js"]
