import multer from "multer";
import path from "node:path";
import crypto from "node:crypto";
import { logoUploadsDir, signatureUploadsDir } from "./uploads.js";

const allowedMimeTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
const allowedBackupMimeTypes = new Set(["application/zip", "application/x-zip-compressed", "application/octet-stream"]);

function createImageUpload(options: { destination: string; prefix: string }) {
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        cb(null, options.destination);
      },
      filename: (_req, file, cb) => {
        const safeExtension = extensionFromMime(file.mimetype) ?? path.extname(file.originalname) ?? ".png";
        cb(null, `${options.prefix}-${Date.now()}-${crypto.randomUUID()}${safeExtension}`);
      }
    }),
    limits: {
      fileSize: 2 * 1024 * 1024
    },
    fileFilter: (_req, file, cb) => {
      if (!allowedMimeTypes.has(file.mimetype)) {
        cb(new Error("Unsupported file type. Please upload a PNG, JPG, WebP, or SVG image."));
        return;
      }
      cb(null, true);
    }
  });
}

export const logoUpload = createImageUpload({
  destination: logoUploadsDir,
  prefix: "logo"
});

export const signatureUpload = createImageUpload({
  destination: signatureUploadsDir,
  prefix: "signature"
});

export const backupUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedBackupMimeTypes.has(file.mimetype)) {
      cb(new Error("Unsupported backup file type. Please upload a ZIP archive."));
      return;
    }
    cb(null, true);
  }
});

function extensionFromMime(mimeType: string): string | null {
  switch (mimeType) {
    case "image/png":
      return ".png";
    case "image/jpeg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    case "image/svg+xml":
      return ".svg";
    default:
      return null;
  }
}
