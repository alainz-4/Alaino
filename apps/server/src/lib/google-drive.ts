import crypto from "node:crypto";
import { prisma } from "./prisma.js";
import { AppError } from "./errors.js";
import { env } from "../env.js";
import { ensureWorkspaceProfile } from "./workspace.js";
import type { GoogleDriveConnection, PrismaClient } from "@prisma/client";

type WorkspaceDb = Pick<
  PrismaClient,
  "userProfile" | "googleDriveConnection" | "freelanceSettings" | "financeSettings" | "invoiceSettings"
>;

const GOOGLE_DRIVE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_DRIVE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_DRIVE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const GOOGLE_DRIVE_SCOPES = env.googleDriveScopes.split(/\s+/).filter(Boolean);

export type GoogleDriveStatus = {
  clientId: string | null;
  clientIdConfigured: boolean;
  clientSecretConfigured: boolean;
  refreshTokenConfigured: boolean;
  folderId: string | null;
  connectedEmail: string | null;
  connectedAt: string | null;
  oauthConfigured: boolean;
  redirectUri: string;
};

export async function ensureGoogleDriveConnection(db: WorkspaceDb = prisma) {
  const profile = await ensureWorkspaceProfile(db);
  return db.googleDriveConnection.upsert({
    where: { userProfileId: profile.id },
    create: { userProfileId: profile.id },
    update: {}
  });
}

function resolveRedirectUri() {
  return env.googleDriveRedirectUri ?? `http://127.0.0.1:3001/api/settings/google-drive/callback`;
}

export async function serializeGoogleDriveStatus(db: WorkspaceDb = prisma): Promise<GoogleDriveStatus> {
  const connection = await ensureGoogleDriveConnection(db);
  return {
    clientId: connection.clientId ?? null,
    clientIdConfigured: Boolean(connection.clientId),
    clientSecretConfigured: Boolean(connection.clientSecret),
    refreshTokenConfigured: Boolean(connection.refreshToken),
    folderId: connection.folderId ?? null,
    connectedEmail: connection.connectedEmail ?? null,
    connectedAt: connection.connectedAt?.toISOString() ?? null,
    oauthConfigured: Boolean(connection.clientId && connection.clientSecret),
    redirectUri: resolveRedirectUri()
  };
}

export async function saveGoogleDriveConfiguration(params: {
  clientId?: string | null;
  clientSecret?: string | null;
  folderId?: string | null;
}) {
  const connection = await ensureGoogleDriveConnection();
  const nextClientId = params.clientId?.trim() || connection.clientId || null;
  const nextClientSecret = params.clientSecret?.trim() || connection.clientSecret || null;
  const nextFolderId = params.folderId?.trim() || connection.folderId || null;
  const clientIdChanged = connection.clientId !== nextClientId;
  const clientSecretChanged = connection.clientSecret !== nextClientSecret;

  return prisma.googleDriveConnection.update({
    where: { id: connection.id },
    data: {
      clientId: nextClientId,
      clientSecret: nextClientSecret,
      folderId: nextFolderId,
      ...(clientIdChanged || clientSecretChanged
        ? {
            refreshToken: null,
            connectedEmail: null,
            connectedAt: null,
            oauthState: null,
            oauthStateExpiresAt: null
          }
        : {})
    }
  });
}

export async function clearGoogleDriveConnection() {
  const connection = await ensureGoogleDriveConnection();
  return prisma.googleDriveConnection.update({
    where: { id: connection.id },
    data: {
      refreshToken: null,
      connectedEmail: null,
      connectedAt: null,
      oauthState: null,
      oauthStateExpiresAt: null
    }
  });
}

export async function createGoogleDriveAuthUrl() {
  const connection = await ensureGoogleDriveConnection();
  if (!connection.clientId || !connection.clientSecret) {
    throw new AppError(400, "Please save your Google OAuth client ID and secret first.");
  }

  const state = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.googleDriveConnection.update({
    where: { id: connection.id },
    data: {
      oauthState: state,
      oauthStateExpiresAt: expiresAt
    }
  });

  const params = new URLSearchParams({
    client_id: connection.clientId,
    redirect_uri: resolveRedirectUri(),
    response_type: "code",
    scope: GOOGLE_DRIVE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state
  });

  return `${GOOGLE_DRIVE_AUTH_URL}?${params.toString()}`;
}

async function findGoogleDriveConnectionByState(state: string) {
  return prisma.googleDriveConnection.findFirst({
    where: {
      oauthState: state,
      oauthStateExpiresAt: {
        gt: new Date()
      }
    }
  });
}

async function exchangeGoogleDriveCode(params: {
  clientId: string;
  clientSecret: string;
  code: string;
}) {
  const response = await fetch(GOOGLE_DRIVE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: params.clientId,
      client_secret: params.clientSecret,
      code: params.code,
      grant_type: "authorization_code",
      redirect_uri: resolveRedirectUri()
    })
  });

  if (!response.ok) {
    throw new AppError(502, `Google Drive authorization failed: ${await response.text()}`);
  }

  return (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  };
}

async function fetchGoogleDriveUserInfo(accessToken: string) {
  const response = await fetch(GOOGLE_DRIVE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new AppError(502, `Google account lookup failed: ${await response.text()}`);
  }

  return (await response.json()) as { email?: string; name?: string };
}

export async function completeGoogleDriveAuth(params: { code: string; state: string }) {
  const connection =
    (await findGoogleDriveConnectionByState(params.state)) ?? (await ensureGoogleDriveConnection());

  if (!connection.clientId || !connection.clientSecret) {
    throw new AppError(400, "Google Drive credentials are not configured.");
  }

  if (!connection.oauthState || connection.oauthState !== params.state) {
    throw new AppError(400, "Invalid Google Drive authorization state.");
  }

  if (connection.oauthStateExpiresAt && connection.oauthStateExpiresAt.getTime() < Date.now()) {
    throw new AppError(400, "Google Drive authorization expired. Please connect again.");
  }

  const tokenSet = await exchangeGoogleDriveCode({
    clientId: connection.clientId,
    clientSecret: connection.clientSecret,
    code: params.code
  });

  const accessToken = tokenSet.access_token;
  if (!accessToken) {
    throw new AppError(502, "Google Drive authorization did not return an access token.");
  }

  const refreshToken = tokenSet.refresh_token ?? connection.refreshToken;
  if (!refreshToken) {
    throw new AppError(502, "Google Drive authorization did not return a refresh token.");
  }

  const userInfo = await fetchGoogleDriveUserInfo(accessToken);

  return prisma.googleDriveConnection.update({
    where: { id: connection.id },
    data: {
      refreshToken,
      connectedEmail: userInfo.email ?? connection.connectedEmail ?? null,
      connectedAt: new Date(),
      oauthState: null,
      oauthStateExpiresAt: null
    }
  });
}

async function getAccessToken(connection: GoogleDriveConnection) {
  if (!connection.clientId || !connection.clientSecret || !connection.refreshToken) {
    throw new AppError(501, "Google Drive account is not connected yet.");
  }

  const response = await fetch(GOOGLE_DRIVE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: connection.clientId,
      client_secret: connection.clientSecret,
      refresh_token: connection.refreshToken,
      grant_type: "refresh_token"
    })
  });

  if (!response.ok) {
    throw new AppError(502, `Google Drive token request failed: ${await response.text()}`);
  }

  const body = (await response.json()) as { access_token?: string };
  if (!body.access_token) {
    throw new AppError(502, "Google Drive token request did not return an access token.");
  }

  return body.access_token;
}

export async function uploadBackupArchiveToGoogleDrive(buffer: Buffer) {
  const connection = await ensureGoogleDriveConnection();
  const token = await getAccessToken(connection);
  const fileName = `alaino-freelance-backup-${new Date().toISOString().slice(0, 10)}.zip`;
  const boundary = `alaino-drive-${crypto.randomUUID()}`;
  const metadata: Record<string, unknown> = {
    name: fileName,
    mimeType: "application/zip"
  };

  if (connection.folderId) {
    metadata.parents = [connection.folderId];
  }

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`),
    Buffer.from(JSON.stringify(metadata)),
    Buffer.from(`\r\n--${boundary}\r\nContent-Type: application/zip\r\n\r\n`),
    buffer,
    Buffer.from(`\r\n--${boundary}--`)
  ]);

  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`
    },
    body
  });

  if (!response.ok) {
    throw new AppError(502, `Google Drive upload failed: ${await response.text()}`);
  }

  return (await response.json()) as { id?: string; name?: string; webViewLink?: string };
}
