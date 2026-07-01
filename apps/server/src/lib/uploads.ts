import fs from "node:fs/promises";
import path from "node:path";

export const uploadsRoot = path.resolve(process.cwd(), "uploads");
export const logoUploadsDir = path.join(uploadsRoot, "logos");
export const signatureUploadsDir = path.join(uploadsRoot, "signatures");

export async function ensureUploadDirs() {
  await fs.mkdir(logoUploadsDir, { recursive: true });
  await fs.mkdir(signatureUploadsDir, { recursive: true });
}

export function toPublicUploadPath(filename: string, category: "logos" | "signatures" = "logos"): string {
  return path.posix.join("uploads", category, filename);
}

export function toAbsoluteUploadedFilePath(publicPath: string): string | null {
  const normalized = publicPath.replace(/^\/+/, "");
  const isLogo = normalized.startsWith("uploads/logos/");
  const isSignature = normalized.startsWith("uploads/signatures/");
  if (!isLogo && !isSignature) {
    return null;
  }

  const absolutePath = path.resolve(process.cwd(), normalized);
  if (!absolutePath.startsWith(logoUploadsDir) && !absolutePath.startsWith(signatureUploadsDir)) {
    return null;
  }

  return absolutePath;
}
