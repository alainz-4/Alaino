import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncRoute } from "../lib/http.js";
import {
  ensureWorkspaceProfile,
  ensureFreelanceSettings,
  ensureFinanceSettings,
  ensureInvoiceSettings
} from "../lib/workspace.js";
import {
  serializeFinanceSettings,
  serializeFreelanceSettings,
  serializeInvoiceSettings,
  serializeUserProfile
} from "../lib/serializers.js";
import { toDecimal } from "../lib/number.js";
import { AppError } from "../lib/errors.js";
import { backupUpload, logoUpload, signatureUpload } from "../lib/upload-middleware.js";
import { toAbsoluteUploadedFilePath, toPublicUploadPath } from "../lib/uploads.js";
import fs from "node:fs/promises";
import { buildInvoiceSettingsPreviewPdfBuffer } from "../lib/invoice-preview.js";
import {
  buildBackupArchiveBuffer,
  restoreBackupArchiveBuffer,
} from "../lib/backup.js";
import { env } from "../env.js";
import {
  clearGoogleDriveConnection,
  completeGoogleDriveAuth,
  createGoogleDriveAuthUrl,
  saveGoogleDriveConfiguration,
  serializeGoogleDriveStatus,
  uploadBackupArchiveToGoogleDrive
} from "../lib/google-drive.js";

const router = Router();

const profileSchema = z.object({
  profilePreset: z.enum(["FRENCH_FREELANCER", "LEBANESE_COMPANY"]),
  fullName: z.string().min(1),
  legalStatus: z.string().min(1),
  siren: z.string().nullable().optional(),
  siret: z.string().nullable().optional(),
  commercialRegisterNumber: z.string().nullable().optional(),
  taxId: z.string().nullable().optional(),
  addressLine1: z.string().min(1),
  addressLine2: z.string().nullable().optional(),
  postalCode: z.string().min(1),
  city: z.string().min(1),
  country: z.string().min(1),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional()
});

const freelanceSchema = z.object({
  defaultDailyRate: z.number().min(0),
  standardWorkingDays: z.number().int().min(0),
  timezone: z.string().min(1),
  defaultCurrency: z.string().min(3)
});

const financeSchema = z.object({
  monthlyEssentialExpenses: z.number().min(0),
  monthlyWants: z.number().min(0),
  emergencyFundMonths: z.number().int().min(1),
  currentReserves: z.number().min(0),
  savingsGoalMonthly: z.number().min(0),
  needsPercent: z.number().min(0).max(100),
  wantsPercent: z.number().min(0).max(100),
  savingsPercent: z.number().min(0).max(100),
  monthlyLifestyleTarget: z.number().min(0),
  urssafReservePercent: z.number().min(0).max(100),
  incomeTaxReservePercent: z.number().min(0).max(100)
});

const invoiceSchema = z.object({
  invoicePrefix: z.string().min(1),
  defaultCurrency: z.string().min(3),
  defaultPaymentTermsDays: z.number().int().min(0),
  latePaymentRate: z.number().min(0),
  recoveryChargeAmount: z.number().min(0),
  vatMode: z.enum(["APPLICABLE", "EXEMPT"]),
  vatRate: z.number().min(0),
  vatExemptionMention: z.string().min(1),
  logoUrl: z.string().nullable().optional(),
  signatureUrl: z.string().nullable().optional(),
  primaryColor: z.string().min(4),
  secondaryColor: z.string().min(4),
  bankDetails: z.string().nullable().optional(),
  termsAndConditions: z.string().nullable().optional()
});

const numberingResetSchema = z.object({
  invoicePrefix: z.string().min(1),
  startingSequence: z.number().int().min(1).default(1)
});

const invoicePreviewSchema = z.object({
  profile: profileSchema,
  invoice: invoiceSchema
});

const googleDriveConfigSchema = z.object({
  clientId: z.string().nullable().optional(),
  clientSecret: z.string().nullable().optional(),
  folderId: z.string().nullable().optional()
});

async function deleteLocalAssetIfNeeded(publicPath?: string | null) {
  if (!publicPath) {
    return;
  }

  const absolutePath = toAbsoluteUploadedFilePath(publicPath);
  if (!absolutePath) {
    return;
  }

  await fs.unlink(absolutePath).catch(() => undefined);
}

router.get(
  "/google-drive",
  asyncRoute(async (_req, res) => {
    res.json(await serializeGoogleDriveStatus());
  })
);

router.put(
  "/google-drive",
  asyncRoute(async (req, res) => {
    const payload = googleDriveConfigSchema.parse(req.body);
    const updated = await saveGoogleDriveConfiguration({
      clientId: payload.clientId?.trim() ?? "",
      clientSecret: payload.clientSecret?.trim() ?? "",
      folderId: payload.folderId?.trim() ?? null
    });

    res.json({
      status: await serializeGoogleDriveStatus(),
      configured: Boolean(updated.clientId && updated.clientSecret)
    });
  })
);

router.post(
  "/google-drive/connect",
  asyncRoute(async (_req, res) => {
    const authUrl = await createGoogleDriveAuthUrl();
    res.json({ authUrl });
  })
);

router.get(
  "/google-drive/callback",
  asyncRoute(async (req, res) => {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";

    if (!code || !state) {
      throw new AppError(400, "Missing Google Drive authorization code.");
    }

    await completeGoogleDriveAuth({ code, state });

    const successUrl = new URL(env.googleDriveSuccessRedirectUrl);
    successUrl.searchParams.set("googleDrive", "connected");
    res.redirect(successUrl.toString());
  })
);

router.delete(
  "/google-drive",
  asyncRoute(async (_req, res) => {
    await clearGoogleDriveConnection();
    res.json({ disconnected: true, status: await serializeGoogleDriveStatus() });
  })
);

router.get(
  "/backup",
  asyncRoute(async (_req, res) => {
    const buffer = await buildBackupArchiveBuffer();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="alaino-freelance-backup-${timestamp}.zip"`);
    res.setHeader("Cache-Control", "no-store");
    res.send(buffer);
  })
);

router.post(
  "/backup/restore",
  (req, res, next) => {
    backupUpload.single("backup")(req, res, (error) => {
      if (error) {
        next(new AppError(400, error.message));
        return;
      }
      next();
    });
  },
  asyncRoute(async (req, res) => {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      throw new AppError(400, "Please upload a backup ZIP file.");
    }

    const result = await restoreBackupArchiveBuffer(file.buffer);
    res.json({
      restored: true,
      databasePath: result.databasePath
    });
  })
);

router.post(
  "/backup/google-drive",
  asyncRoute(async (_req, res) => {
    const buffer = await buildBackupArchiveBuffer();
    const uploaded = await uploadBackupArchiveToGoogleDrive(buffer);
    res.json({
      uploaded: true,
      ...uploaded
    });
  })
);

router.post(
  "/invoice/logo",
  (req, res, next) => {
    logoUpload.single("logo")(req, res, (error) => {
      if (error) {
        next(new AppError(400, error.message));
        return;
      }
      next();
    });
  },
  asyncRoute(async (req, res) => {
    const settings = await ensureInvoiceSettings();
    const file = req.file as Express.Multer.File | undefined;

    if (!file) {
      throw new AppError(400, "Please upload a logo file.");
    }

    const logoUrl = toPublicUploadPath(file.filename, "logos");
    const previousLogoUrl = settings.logoUrl;
    const updated = await prisma.invoiceSettings.update({
      where: { id: settings.id },
      data: { logoUrl }
    });

    if (previousLogoUrl && previousLogoUrl !== logoUrl) {
      await deleteLocalAssetIfNeeded(previousLogoUrl);
    }

    res.json({
      logoUrl,
      settings: serializeInvoiceSettings(updated)
    });
  })
);

router.delete(
  "/invoice/logo",
  asyncRoute(async (_req, res) => {
    const settings = await ensureInvoiceSettings();
    const previousLogoUrl = settings.logoUrl;

    const updated = await prisma.invoiceSettings.update({
      where: { id: settings.id },
      data: { logoUrl: null }
    });

    await deleteLocalAssetIfNeeded(previousLogoUrl);

    res.json({
      logoUrl: null,
      settings: serializeInvoiceSettings(updated)
    });
  })
);

router.post(
  "/invoice/signature",
  (req, res, next) => {
    signatureUpload.single("signature")(req, res, (error) => {
      if (error) {
        next(new AppError(400, error.message));
        return;
      }
      next();
    });
  },
  asyncRoute(async (req, res) => {
    const settings = await ensureInvoiceSettings();
    const file = req.file as Express.Multer.File | undefined;

    if (!file) {
      throw new AppError(400, "Please upload a signature file.");
    }

    const signatureUrl = toPublicUploadPath(file.filename, "signatures");
    const previousSignatureUrl = settings.signatureUrl;
    const updated = await prisma.invoiceSettings.update({
      where: { id: settings.id },
      data: { signatureUrl }
    });

    if (previousSignatureUrl && previousSignatureUrl !== signatureUrl) {
      await deleteLocalAssetIfNeeded(previousSignatureUrl);
    }

    res.json({
      signatureUrl,
      settings: serializeInvoiceSettings(updated)
    });
  })
);

router.delete(
  "/invoice/signature",
  asyncRoute(async (_req, res) => {
    const settings = await ensureInvoiceSettings();
    const previousSignatureUrl = settings.signatureUrl;

    const updated = await prisma.invoiceSettings.update({
      where: { id: settings.id },
      data: { signatureUrl: null }
    });

    await deleteLocalAssetIfNeeded(previousSignatureUrl);

    res.json({
      signatureUrl: null,
      settings: serializeInvoiceSettings(updated)
    });
  })
);

router.post(
  "/invoice/numbering-reset",
  asyncRoute(async (req, res) => {
    const settings = await ensureInvoiceSettings();
    const parsed = numberingResetSchema.parse(req.body);

    const updated = await prisma.$transaction(async (tx) => {
      const maxSequence = await tx.invoice.aggregate({
        where: { invoiceSeries: parsed.invoicePrefix },
        _max: { sequenceNumber: true }
      });

      const highestExistingSequence = maxSequence._max.sequenceNumber ?? 0;
      if (parsed.startingSequence <= highestExistingSequence) {
        throw new AppError(
          400,
          `Starting sequence must be greater than ${highestExistingSequence} for series "${parsed.invoicePrefix}".`
        );
      }

      return tx.invoiceSettings.update({
        where: { id: settings.id },
        data: {
          invoicePrefix: parsed.invoicePrefix,
          lastInvoiceSequence: parsed.startingSequence - 1
        }
      });
    });

    res.json(serializeInvoiceSettings(updated));
  })
);

router.get(
  "/profile",
  asyncRoute(async (_req, res) => {
    const profile = await ensureWorkspaceProfile();
    res.json(serializeUserProfile(profile));
  })
);

router.put(
  "/profile",
  asyncRoute(async (req, res) => {
    const profile = await ensureWorkspaceProfile();
    const parsed = profileSchema.parse(req.body);
    const updated = await prisma.userProfile.update({
      where: { id: profile.id },
      data: {
        ...parsed,
        siren: parsed.siren ?? null,
        siret: parsed.siret ?? null,
        commercialRegisterNumber: parsed.commercialRegisterNumber ?? null,
        taxId: parsed.taxId ?? null,
        addressLine2: parsed.addressLine2 ?? null,
        email: parsed.email ?? null,
        phone: parsed.phone ?? null
      }
    });
    res.json(serializeUserProfile(updated));
  })
);

router.get(
  "/freelance",
  asyncRoute(async (_req, res) => {
    res.json(serializeFreelanceSettings(await ensureFreelanceSettings()));
  })
);

router.put(
  "/freelance",
  asyncRoute(async (req, res) => {
    const settings = await ensureFreelanceSettings();
    const parsed = freelanceSchema.parse(req.body);
    const updated = await prisma.freelanceSettings.update({
      where: { id: settings.id },
      data: {
        ...parsed,
        defaultDailyRate: toDecimal(parsed.defaultDailyRate)
      }
    });
    res.json(serializeFreelanceSettings(updated));
  })
);

router.get(
  "/finance",
  asyncRoute(async (_req, res) => {
    res.json(serializeFinanceSettings(await ensureFinanceSettings()));
  })
);

router.put(
  "/finance",
  asyncRoute(async (req, res) => {
    const settings = await ensureFinanceSettings();
    const parsed = financeSchema.parse(req.body);
    const updated = await prisma.financeSettings.update({
      where: { id: settings.id },
      data: {
        monthlyEssentialExpenses: toDecimal(parsed.monthlyEssentialExpenses),
        monthlyWants: toDecimal(parsed.monthlyWants),
        emergencyFundMonths: parsed.emergencyFundMonths,
        currentReserves: toDecimal(parsed.currentReserves),
        savingsGoalMonthly: toDecimal(parsed.savingsGoalMonthly),
        needsPercent: toDecimal(parsed.needsPercent),
        wantsPercent: toDecimal(parsed.wantsPercent),
        savingsPercent: toDecimal(parsed.savingsPercent),
        monthlyLifestyleTarget: toDecimal(parsed.monthlyLifestyleTarget),
        urssafReservePercent: toDecimal(parsed.urssafReservePercent),
        incomeTaxReservePercent: toDecimal(parsed.incomeTaxReservePercent)
      }
    });
    res.json(serializeFinanceSettings(updated));
  })
);

router.get(
  "/invoice",
  asyncRoute(async (_req, res) => {
    res.json(serializeInvoiceSettings(await ensureInvoiceSettings()));
  })
);

router.put(
  "/invoice",
  asyncRoute(async (req, res) => {
    const settings = await ensureInvoiceSettings();
    const parsed = invoiceSchema.parse(req.body);
    const updated = await prisma.invoiceSettings.update({
      where: { id: settings.id },
      data: {
        invoicePrefix: parsed.invoicePrefix,
        defaultCurrency: parsed.defaultCurrency,
        defaultPaymentTermsDays: parsed.defaultPaymentTermsDays,
        latePaymentRate: toDecimal(parsed.latePaymentRate),
        recoveryChargeAmount: toDecimal(parsed.recoveryChargeAmount),
        vatMode: parsed.vatMode,
        vatRate: toDecimal(parsed.vatRate),
        vatExemptionMention: parsed.vatExemptionMention,
        logoUrl: parsed.logoUrl ?? null,
        signatureUrl: parsed.signatureUrl ?? null,
        primaryColor: parsed.primaryColor,
        secondaryColor: parsed.secondaryColor,
        bankDetails: parsed.bankDetails ?? null,
        termsAndConditions: parsed.termsAndConditions ?? null
      }
    });
    res.json(serializeInvoiceSettings(updated));
  })
);

router.post(
  "/invoice/preview",
  asyncRoute(async (req, res) => {
    const parsed = invoicePreviewSchema.parse(req.body);
    const pdfBuffer = await buildInvoiceSettingsPreviewPdfBuffer({
      profile: parsed.profile,
      invoiceSettings: parsed.invoice
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Cache-Control", "no-store");
    res.send(pdfBuffer);
  })
);

router.get(
  "/bootstrap",
  asyncRoute(async (_req, res) => {
    const [profile, freelance, finance, invoice] = await Promise.all([
      ensureWorkspaceProfile(),
      ensureFreelanceSettings(),
      ensureFinanceSettings(),
      ensureInvoiceSettings()
    ]);

    res.json({
      profile: serializeUserProfile(profile),
      freelanceSettings: serializeFreelanceSettings(freelance),
      financeSettings: serializeFinanceSettings(finance),
      invoiceSettings: serializeInvoiceSettings(invoice)
    });
  })
);

export default router;
