# Freelance Income Dashboard

Monorepo for a freelance income dashboard, invoicing system, and finance assistant.

## Structure

- `apps/server`: Express + Prisma + SQLite API
- `apps/web`: React + TypeScript frontend
- `packages/shared`: shared calculations and domain types

## Setup

1. Install dependencies.
2. Run Prisma migration and generate the client from `apps/server/prisma/schema.prisma`.
3. Start the server and web app.

## Notes

- The app is designed for one freelancer profile per installation.
- Invoice numbering is sequential and stored in the database.
- The invoice PDF renderer is customizable through invoice settings such as logo and colors.
- The Settings page now includes:
  - a full backup export
  - backup restore from a ZIP archive
  - Google Drive backup upload when the server environment is configured
- For hosted deployments, use the Postgres Prisma schema in `apps/server/prisma/postgres/schema.prisma` and the `prisma:*:postgres` scripts in `apps/server/package.json`.
- To prepare both local and hosted Prisma clients, run `pnpm prisma:generate:all` in `apps/server`.
- The server chooses SQLite or Postgres at runtime from `DATABASE_URL`:
  - `file:./dev.db` for local use
  - `postgresql://...` for hosted use

## Free hosting option

The simplest zero-cost public path is:

- **Render** for the app
- **Neon** for the database

The repo includes a `render.yaml`, a Dockerfile, and a deployment guide in `DEPLOYMENT.md`.

## Server deployment

The repo includes a Docker-based production path:

1. Build the image: `docker compose build`
2. Start it: `docker compose up -d`
3. Open `http://YOUR_SERVER:3001`

The container serves both the API and the web app from the same origin. For a real public deployment, update these environment values in `docker-compose.yml` or your own `.env` file:

- `GOOGLE_DRIVE_REDIRECT_URI`
- `GOOGLE_DRIVE_SUCCESS_REDIRECT_URL`
- `DATABASE_URL` if you want to switch away from the bundled SQLite volume

The default compose file uses persistent Docker volumes for:

- `apps/server/data` for the SQLite database
- `apps/server/uploads` for logos, signatures, and backups
