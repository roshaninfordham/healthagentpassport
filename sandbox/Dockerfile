FROM node:20-alpine

WORKDIR /app

COPY package.json package.json
RUN npm install --omit=dev

COPY runner.js runner.js
COPY scenarios scenarios

USER node

ENTRYPOINT ["node", "runner.js"]
