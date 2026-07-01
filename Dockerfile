FROM node:22-bookworm-slim

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps ./apps
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile
RUN pnpm --dir apps/server prisma:generate:all
RUN pnpm build

WORKDIR /app/apps/server

ENV NODE_ENV=production
EXPOSE 3001

CMD ["sh", "-c", "pnpm prisma:deploy && node dist/index.js"]
