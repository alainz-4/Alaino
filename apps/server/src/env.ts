import "dotenv/config";

function readEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? "3001"),
  databaseUrl: readEnv("DATABASE_URL", "file:./dev.db"),
  openAiApiKey: process.env.OPENAI_API_KEY ?? null,
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-4.1",
  openAiBaseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
  localModelName: process.env.LOCAL_LLM_MODEL ?? "Xenova/LaMini-Flan-T5-783M",
  localModelTask: process.env.LOCAL_LLM_TASK ?? "text2text-generation",
  googleDriveRedirectUri: process.env.GOOGLE_DRIVE_REDIRECT_URI ?? null,
  googleDriveSuccessRedirectUrl: process.env.GOOGLE_DRIVE_SUCCESS_REDIRECT_URL ?? "http://127.0.0.1:5173/settings?tab=backup",
  googleDriveScopes: process.env.GOOGLE_DRIVE_SCOPES ?? "https://www.googleapis.com/auth/drive openid email profile"
};

process.env.DATABASE_URL = env.databaseUrl;
