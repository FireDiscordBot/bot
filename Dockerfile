## Base
FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

## Dependencies (production)
FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN HUSKY=0 pnpm install --prod --frozen-lockfile --ignore-scripts

## Builder
FROM base AS builder
RUN apk add --no-cache git
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN HUSKY=0 pnpm install --frozen-lockfile

COPY . .

RUN pnpm compile

## Runner
FROM base AS runner

WORKDIR /app
USER node

COPY --from=dependencies --chown=node:node /app/node_modules/ ./node_modules/
COPY --from=builder --chown=node:node /app/dist/ ./dist/
COPY --from=builder --chown=node:node /app/package.json ./

ENV NODE_ENV=production

CMD ["node", "--enable-source-maps", "dist/src/index.js"]
