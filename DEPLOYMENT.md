# Deployment

This app can run as a single hosted service that serves both the frontend and the API.

## Simplest free setup

Use:

- **Render** for the web app
- **Neon** for the database

That keeps the setup simple and avoids managing a VM.

## Why this works

- The server already chooses SQLite or Postgres from `DATABASE_URL`.
- For hosted deployment, set `DATABASE_URL` to a Neon Postgres connection string.
- The Docker image builds the app and runs the Express server on the public port.

## Steps

1. Create a free Neon project and copy the Postgres connection string.
2. Push this repository to GitHub.
3. On Render, create a new **Web Service** from the repo.
4. Use the included `render.yaml` or let Render read the `Dockerfile`.
5. Set these environment variables:
   - `DATABASE_URL` = your Neon connection string
   - `NODE_ENV=production`
   - `PORT=3001`
   - `GOOGLE_DRIVE_REDIRECT_URI=https://YOUR-RENDER-URL/api/settings/google-drive/callback`
   - `GOOGLE_DRIVE_SUCCESS_REDIRECT_URL=https://YOUR-RENDER-URL/settings?tab=backup`
6. Deploy.

## Optional Google Drive backup

If you keep Google Drive backup enabled:

- add your Render URL in Google Cloud OAuth redirect URIs
- add your Gmail account as a test user while the app is in testing
- keep the Drive API enabled in the Google Cloud project

## Notes

- The app is full-stack, so the Render service serves both the frontend and the API from the same origin.
- The local shortcut still works separately on your PC.
- If you want to keep using local SQLite for testing, leave `DATABASE_URL=file:./dev.db`.
