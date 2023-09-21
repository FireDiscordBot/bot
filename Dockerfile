## Dependencies (production)
FROM node:14-alpine AS dependencies

WORKDIR /app

COPY package.json yarn.lock ./
RUN apk add --no-cache python3 make gcc g++ \
  && yarn install --frozen-lockfile --production

## Builder
FROM dependencies AS builder

WORKDIR /app

COPY tsconfig.json ./
COPY ./config/ ./config/
COPY ./lib/ ./lib/
COPY ./src/ ./src/

RUN yarn install --frozen-lockfile --slient \
  && yarn cache clean \
  && yarn compile

## Runner
FROM node:14-alpine

WORKDIR /app
RUN chown node:node .

COPY --from=dependencies /app/node_modules/ ./node_modules/
COPY --from=builder /app/ ./
COPY ./.git/ ./.git
COPY words.txt ./

ENV NODE_ENV production
ENV BOOT_SINGLE true
ENV WS_PORT 1336
ENV REST_PORT 1337
ENV POSTGRES_USER postgres

USER node
CMD ["node", "dist/src/index.js"]
