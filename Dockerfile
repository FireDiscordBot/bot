## Base
FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable
ARG GIT_COMMIT
ENV GIT_COMMIT=$GIT_COMMIT
ARG GIT_BRANCH
ENV GIT_BRANCH=$GIT_BRANCH

## Dependencies (production)
FROM base AS dependencies

COPY package.json pnpm-lock.yaml ./
RUN apk add --no-cache python3 make gcc g++ \
  && pnpm install --prod --frozen-lockfile

## Builder
FROM base AS builder

COPY package.json pnpm-lock.yaml ./
RUN apk add --no-cache python3 make gcc g++ git \
  && pnpm install --frozen-lockfile

COPY . .

RUN pnpm compile

## Runner
FROM base AS runner

WORKDIR /app
USER node

COPY --from=dependencies --chown=node:node /app/node_modules/ ./node_modules/
COPY --from=builder --chown=node:node /app/dist/ ./dist/
COPY --from=builder --chown=node:node /app/package.json ./
COPY --from=builder --chown=node:node /app/languages/ ./dist/languages/

ENV NODE_ENV production
ENV BOOT_SINGLE true
ENV POSTGRES_USER postgres

CMD ["node", "--enable-source-maps", "dist/src/index.js"]
