import { useEffect, useRef, useState } from "react";
import { api, apiBaseUrl } from "../lib/api";
import type { BootstrapResponse, GoogleDriveStatus, ProfilePreset } from "../types";
import { Button, Field, Panel } from "../components/Common";

const COLOR_PRESETS = [
  "#17324d",
  "#265d90",
  "#0f766e",
  "#7c3aed",
  "#b23c4a",
  "#d97c44",
  "#556b8e",
  "#1f2937",
  "#8b5cf6",
  "#be185d"
];

const PROFILE_PRESETS: Record<
  ProfilePreset,
  {
    label: string;
    subtitle: string;
    legalStatus: string;
    country: string;
    nameLabel: string;
    registrationLabel: string;
    taxLabel: string;
  }
> = {
  FRENCH_FREELANCER: {
    label: "French freelancer",
    subtitle: "EI / micro-entrepreneur setup for France",
    legalStatus: "EI / micro-entrepreneur",
    country: "France",
    nameLabel: "Full name",
    registrationLabel: "SIREN",
    taxLabel: "SIRET"
  },
  LEBANESE_COMPANY: {
    label: "Lebanese company",
    subtitle: "Company profile for Lebanon",
    legalStatus: "Lebanese company",
    country: "Lebanon",
    nameLabel: "Company name",
    registrationLabel: "Registration number",
    taxLabel: "Personal tax number"
  }
};

function formatNumericValue(value: number): string {
  return Number.isFinite(value) ? String(value) : "";
}

type NumericFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  help?: string;
  integer?: boolean;
};

function NumericField({ label, value, onChange, help, integer = false }: NumericFieldProps) {
  const [draft, setDraft] = useState(() => formatNumericValue(value));

  useEffect(() => {
    setDraft(formatNumericValue(value));
  }, [value]);

  function commit(next: string) {
    const normalized = next.replace(",", ".");
    if (normalized.trim() === "") {
      setDraft("");
      return;
    }

    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) {
      setDraft(next);
      return;
    }

    setDraft(next);
    onChange(integer ? Math.trunc(parsed) : parsed);
  }

  return (
    <Field label={label} help={help}>
      <input
        type="text"
        inputMode={integer ? "numeric" : "decimal"}
        value={draft}
        onChange={(e) => commit(e.target.value)}
        onBlur={() => {
          if (draft.trim() === "") {
            setDraft(formatNumericValue(value));
            return;
          }
          const parsed = Number(draft.replace(",", "."));
          if (Number.isFinite(parsed)) {
            const nextValue = integer ? Math.trunc(parsed) : parsed;
            setDraft(formatNumericValue(nextValue));
            onChange(nextValue);
          } else {
            setDraft(formatNumericValue(value));
          }
        }}
      />
    </Field>
  );
}

function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

type ColorFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
};

function ColorField({ label, value, onChange, help }: ColorFieldProps) {
  const pickerValue = isHexColor(value) ? value : "#17324d";

  return (
    <Field label={label} help={help}>
      <div className="color-field">
        <div className="color-row">
          <input
            type="color"
            className="color-picker"
            value={pickerValue}
            onChange={(e) => onChange(e.target.value)}
            aria-label={`${label} color picker`}
          />
          <input
            className="color-hex"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#17324d"
            spellCheck={false}
          />
        </div>
        <div className="swatch-row" aria-label={`${label} preset colors`}>
          {COLOR_PRESETS.map((color) => {
            const active = pickerValue.toLowerCase() === color.toLowerCase();
            return (
              <button
                key={color}
                type="button"
                className={`swatch ${active ? "active" : ""}`}
                style={{ backgroundColor: color }}
                onClick={() => onChange(color)}
                title={color}
                aria-label={`Set ${label} to ${color}`}
              />
            );
          })}
        </div>
      </div>
    </Field>
  );
}

type Props = {
  bootstrap: BootstrapResponse | null;
  onBootstrapChange: (bootstrap: BootstrapResponse) => void;
};

export default function SettingsPage({ bootstrap, onBootstrapChange }: Props) {
  const [tab, setTab] = useState<"profile" | "freelance" | "finance" | "invoice" | "backup">(() => {
    const initialTab = new URLSearchParams(window.location.search).get("tab");
    if (
      initialTab === "profile" ||
      initialTab === "freelance" ||
      initialTab === "finance" ||
      initialTab === "invoice" ||
      initialTab === "backup"
    ) {
      return initialTab;
    }

    return "profile";
  });

  const [profile, setProfile] = useState(bootstrap?.profile ?? null);
  const [freelance, setFreelance] = useState(bootstrap?.freelanceSettings ?? null);
  const [finance, setFinance] = useState(bootstrap?.financeSettings ?? null);
  const [invoice, setInvoice] = useState(bootstrap?.invoiceSettings ?? null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoInputKey, setLogoInputKey] = useState(0);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [signatureInputKey, setSignatureInputKey] = useState(0);
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [uploadingBackupRestore, setUploadingBackupRestore] = useState(false);
  const [uploadingGoogleDriveBackup, setUploadingGoogleDriveBackup] = useState(false);
  const [loadingGoogleDrive, setLoadingGoogleDrive] = useState(false);
  const [savingGoogleDrive, setSavingGoogleDrive] = useState(false);
  const [connectingGoogleDrive, setConnectingGoogleDrive] = useState(false);
  const [disconnectingGoogleDrive, setDisconnectingGoogleDrive] = useState(false);
  const [googleDriveStatus, setGoogleDriveStatus] = useState<GoogleDriveStatus | null>(null);
  const [googleDriveClientId, setGoogleDriveClientId] = useState("");
  const [googleDriveClientSecret, setGoogleDriveClientSecret] = useState("");
  const [googleDriveFolderId, setGoogleDriveFolderId] = useState("");
  const [newSeriesPrefix, setNewSeriesPrefix] = useState(bootstrap?.invoiceSettings?.invoicePrefix ?? "INV");
  const [newSeriesStartingSequence, setNewSeriesStartingSequence] = useState("1");
  const [invoicePreviewUrl, setInvoicePreviewUrl] = useState<string | null>(null);
  const [invoicePreviewLoading, setInvoicePreviewLoading] = useState(false);
  const invoicePreviewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (bootstrap) {
      setProfile(bootstrap.profile);
      setFreelance(bootstrap.freelanceSettings);
      setFinance(bootstrap.financeSettings);
      setInvoice(bootstrap.invoiceSettings);
      setNewSeriesPrefix(bootstrap.invoiceSettings.invoicePrefix);
      setNewSeriesStartingSequence("1");
    }
  }, [bootstrap]);

  useEffect(() => {
    return () => {
      if (invoicePreviewUrlRef.current) {
        URL.revokeObjectURL(invoicePreviewUrlRef.current);
        invoicePreviewUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type === "google-drive-connected") {
        void refreshGoogleDriveStatus().catch((error) => {
          console.error(error);
        });
      }
    }

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("googleDrive") !== "connected") {
      return;
    }

    if (window.opener) {
      window.opener.postMessage({ type: "google-drive-connected" }, window.location.origin);
      window.close();
      return;
    }

    void refreshGoogleDriveStatus().catch((error) => {
      console.error(error);
    });
  }, []);

  useEffect(() => {
    if (tab !== "invoice" || !profile || !invoice) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setInvoicePreviewLoading(true);

      try {
        const response = await fetch(`${apiBaseUrl}/api/settings/invoice/preview`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            profile: {
              profilePreset: profile.profilePreset,
              fullName: profile.fullName,
              legalStatus: profile.legalStatus,
              siren: profile.siren ?? null,
              siret: profile.siret ?? null,
              commercialRegisterNumber: profile.commercialRegisterNumber ?? null,
              taxId: profile.taxId ?? null,
              addressLine1: profile.addressLine1,
              addressLine2: profile.addressLine2 ?? null,
              postalCode: profile.postalCode,
              city: profile.city,
              country: profile.country,
              email: profile.email ?? null,
              phone: profile.phone ?? null
            },
            invoice: {
              invoicePrefix: invoice.invoicePrefix,
              defaultCurrency: invoice.defaultCurrency,
              defaultPaymentTermsDays: invoice.defaultPaymentTermsDays,
              latePaymentRate: invoice.latePaymentRate,
              recoveryChargeAmount: invoice.recoveryChargeAmount,
              vatMode: invoice.vatMode,
              vatRate: invoice.vatRate,
              vatExemptionMention: invoice.vatExemptionMention,
              logoUrl: invoice.logoUrl || null,
              signatureUrl: invoice.signatureUrl || null,
              primaryColor: invoice.primaryColor,
              secondaryColor: invoice.secondaryColor,
              bankDetails: invoice.bankDetails ?? null,
              termsAndConditions: invoice.termsAndConditions ?? null
            }
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "Invoice preview failed");
        }

        const blob = await response.blob();
        const nextUrl = URL.createObjectURL(blob);

        if (controller.signal.aborted) {
          URL.revokeObjectURL(nextUrl);
          return;
        }

        if (invoicePreviewUrlRef.current) {
          URL.revokeObjectURL(invoicePreviewUrlRef.current);
        }
        invoicePreviewUrlRef.current = nextUrl;
        setInvoicePreviewUrl(nextUrl);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(error);
          setInvoicePreviewUrl(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setInvoicePreviewLoading(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [tab, profile, invoice]);

  useEffect(() => {
    if (tab !== "backup") {
      return;
    }

    const controller = new AbortController();

    async function loadGoogleDriveStatus() {
      setLoadingGoogleDrive(true);
      try {
        await refreshGoogleDriveStatus();
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingGoogleDrive(false);
        }
      }
    }

    void loadGoogleDriveStatus();

    return () => {
      controller.abort();
    };
  }, [tab]);

  async function refreshBootstrap() {
    const next = await api.get<BootstrapResponse>("/api/settings/bootstrap");
    onBootstrapChange(next);
  }

  async function refreshGoogleDriveStatus() {
    const status = await api.get<GoogleDriveStatus>("/api/settings/google-drive");
    setGoogleDriveStatus(status);
    setGoogleDriveClientId(status.clientId ?? "");
    setGoogleDriveClientSecret("");
    setGoogleDriveFolderId(status.folderId ?? "");
    return status;
  }

  function updatePreset(preset: ProfilePreset) {
    if (!profile) {
      return;
    }

    setProfile({
      ...profile,
      profilePreset: preset,
      legalStatus: PROFILE_PRESETS[preset].legalStatus,
      country: PROFILE_PRESETS[preset].country
    });
  }

  async function saveProfile() {
    await api.put("/api/settings/profile", {
      ...profile,
      profilePreset: profile?.profilePreset ?? "FRENCH_FREELANCER",
      siren: profile?.siren || null,
      siret: profile?.siret || null,
      commercialRegisterNumber: profile?.commercialRegisterNumber || null,
      taxId: profile?.taxId || null,
      addressLine2: profile?.addressLine2 || null,
      email: profile?.email || null,
      phone: profile?.phone || null
    });
    await refreshBootstrap();
  }

  async function saveFreelance() {
    await api.put("/api/settings/freelance", freelance);
    await refreshBootstrap();
  }

  async function saveFinance() {
    await api.put("/api/settings/finance", finance);
    await refreshBootstrap();
  }

  async function saveInvoice() {
    await api.put("/api/settings/invoice", {
      ...invoice,
      logoUrl: invoice?.logoUrl || null,
      signatureUrl: invoice?.signatureUrl || null,
      bankDetails: invoice?.bankDetails || null,
      termsAndConditions: invoice?.termsAndConditions || null
    });
    await refreshBootstrap();
  }

  async function saveGoogleDriveConfig() {
    setSavingGoogleDrive(true);
    try {
      const response = await api.put<{ status: GoogleDriveStatus; configured: boolean }>("/api/settings/google-drive", {
        clientId: googleDriveClientId.trim() || null,
        clientSecret: googleDriveClientSecret.trim() || null,
        folderId: googleDriveFolderId.trim() || null
      });
      setGoogleDriveStatus(response.status);
      setGoogleDriveClientId(response.status.clientId ?? "");
      setGoogleDriveClientSecret("");
      setGoogleDriveFolderId(response.status.folderId ?? "");
      return response.status;
    } finally {
      setSavingGoogleDrive(false);
    }
  }

  async function connectGoogleDrive() {
    if (!googleDriveClientId.trim()) {
      window.alert("Please add your Google client ID first.");
      return;
    }

    if (!googleDriveClientSecret.trim() && !googleDriveStatus?.clientSecretConfigured) {
      window.alert("Please add your Google client secret first.");
      return;
    }

    setConnectingGoogleDrive(true);
    try {
      const status = await saveGoogleDriveConfig();
      if (!status.clientIdConfigured || !status.clientSecretConfigured) {
        throw new Error("Please save your Google client ID and secret first.");
      }

      const result = await api.post<{ authUrl: string }>("/api/settings/google-drive/connect", {});
      const popup = window.open(result.authUrl, "_blank", "noopener,noreferrer");
      if (!popup) {
        window.location.href = result.authUrl;
      }
    } finally {
      setConnectingGoogleDrive(false);
    }
  }

  async function disconnectGoogleDrive() {
    if (!window.confirm("Disconnect Google Drive from this workspace?")) {
      return;
    }

    setDisconnectingGoogleDrive(true);
    try {
      const response = await api.delete<{ disconnected: boolean; status: GoogleDriveStatus }>("/api/settings/google-drive");
      setGoogleDriveStatus(response.status);
      setGoogleDriveClientSecret("");
      setGoogleDriveFolderId(response.status.folderId ?? "");
    } finally {
      setDisconnectingGoogleDrive(false);
    }
  }

  async function downloadBackup() {
    const response = await fetch(`${apiBaseUrl}/api/settings/backup`);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? "Backup download failed");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `alaino-freelance-backup-${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function uploadBackupToGoogleDrive() {
    if (!googleDriveStatus?.refreshTokenConfigured || !googleDriveStatus.oauthConfigured) {
      window.alert("Connect your Google Drive account first.");
      return;
    }

    setUploadingGoogleDriveBackup(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/settings/backup/google-drive`, {
        method: "POST"
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Google Drive upload failed");
      }

      const result = (await response.json()) as { uploaded: boolean; id?: string; name?: string; webViewLink?: string };
      window.alert(result.webViewLink ? `Uploaded to Google Drive: ${result.webViewLink}` : "Backup uploaded to Google Drive.");
    } finally {
      setUploadingGoogleDriveBackup(false);
    }
  }

  async function restoreBackup() {
    if (!backupFile) {
      window.alert("Please select a backup ZIP file first.");
      return;
    }

    if (!window.confirm("Restore this backup? This will replace the local database and uploaded files.")) {
      return;
    }

    const formData = new FormData();
    formData.append("backup", backupFile);

    setUploadingBackupRestore(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/settings/backup/restore`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Backup restore failed");
      }

      setBackupFile(null);
      await refreshBootstrap();
      window.alert("Backup restored successfully. Refresh the app if needed.");
    } finally {
      setUploadingBackupRestore(false);
    }
  }

  async function removeLogo() {
    if (!window.confirm("Remove the current invoice logo?")) {
      return;
    }

    try {
      const response = await api.delete<{ logoUrl: null; settings: BootstrapResponse["invoiceSettings"] }>("/api/settings/invoice/logo");
      if (invoice) {
        setInvoice({ ...invoice, ...response.settings, logoUrl: null });
      }
      setLogoFile(null);
      setLogoInputKey((value) => value + 1);
      await refreshBootstrap();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Logo removal failed");
    }
  }

  async function resetNumberingSeries() {
    const startingSequence = Number(newSeriesStartingSequence);
    if (!newSeriesPrefix.trim()) {
      window.alert("Please provide a new invoice series prefix.");
      return;
    }
    if (!Number.isInteger(startingSequence) || startingSequence < 1) {
      window.alert("Starting sequence must be 1 or greater.");
      return;
    }
    if (!window.confirm(`Reset invoice numbering to series "${newSeriesPrefix}" starting at ${startingSequence}?`)) {
      return;
    }

    try {
      const updated = await api.post<BootstrapResponse["invoiceSettings"]>("/api/settings/invoice/numbering-reset", {
        invoicePrefix: newSeriesPrefix.trim(),
        startingSequence
      });

      if (invoice) {
        setInvoice({ ...invoice, ...updated });
      }
      await refreshBootstrap();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Numbering reset failed");
    }
  }

  async function uploadLogo() {
    if (!logoFile) {
      return;
    }

    const formData = new FormData();
    formData.append("logo", logoFile);

    setUploadingLogo(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/settings/invoice/logo`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Logo upload failed");
      }

      const result = (await response.json()) as { logoUrl: string; settings: BootstrapResponse["invoiceSettings"] };
      if (invoice) {
        setInvoice({ ...invoice, ...result.settings, logoUrl: result.logoUrl });
      }
      setLogoFile(null);
      setLogoInputKey((value) => value + 1);
      await refreshBootstrap();
    } finally {
      setUploadingLogo(false);
    }
  }

  async function removeSignature() {
    if (!window.confirm("Remove the current invoice signature?")) {
      return;
    }

    try {
      const response = await api.delete<{ signatureUrl: null; settings: BootstrapResponse["invoiceSettings"] }>("/api/settings/invoice/signature");
      if (invoice) {
        setInvoice({ ...invoice, ...response.settings, signatureUrl: null });
      }
      setSignatureFile(null);
      setSignatureInputKey((value) => value + 1);
      await refreshBootstrap();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Signature removal failed");
    }
  }

  async function uploadSignature() {
    if (!signatureFile) {
      return;
    }

    const formData = new FormData();
    formData.append("signature", signatureFile);

    setUploadingSignature(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/settings/invoice/signature`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Signature upload failed");
      }

      const result = (await response.json()) as { signatureUrl: string; settings: BootstrapResponse["invoiceSettings"] };
      if (invoice) {
        setInvoice({ ...invoice, ...result.settings, signatureUrl: result.signatureUrl });
      }
      setSignatureFile(null);
      setSignatureInputKey((value) => value + 1);
      await refreshBootstrap();
    } finally {
      setUploadingSignature(false);
    }
  }

  const logoPreviewSrc = invoice?.logoUrl ? `${apiBaseUrl}/${invoice.logoUrl.replace(/^\/+/, "")}` : null;
  const signaturePreviewSrc = invoice?.signatureUrl ? `${apiBaseUrl}/${invoice.signatureUrl.replace(/^\/+/, "")}` : null;
  const activePreset = profile?.profilePreset ?? "FRENCH_FREELANCER";
  const presetConfig = PROFILE_PRESETS[activePreset];

  return (
    <div className="page-stack">
      <header className="page-hero">
        <div>
          <div className="eyebrow">Settings</div>
          <h1>Adjust your formulas, identity, and invoice style.</h1>
          <p>These settings feed the assistant, the calendar, and the PDF generator.</p>
        </div>
      </header>

      <div className="tab-row">
        {["profile", "freelance", "finance", "invoice", "backup"].map((value) => (
          <button
            key={value}
            type="button"
            className={`tab ${tab === value ? "active" : ""}`}
            onClick={() => setTab(value as typeof tab)}
          >
            {value}
          </button>
        ))}
      </div>

      {tab === "profile" && profile ? (
        <Panel title="Profile" subtitle="Issuer identity shown on invoices">
          <div className="stack">
            <div className="preset-switch">
              {(Object.keys(PROFILE_PRESETS) as ProfilePreset[]).map((preset) => {
                const item = PROFILE_PRESETS[preset];
                const isActive = activePreset === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    className={`preset-card ${isActive ? "active" : ""}`}
                    onClick={() => updatePreset(preset)}
                  >
                    <span className="preset-label">{item.label}</span>
                    <span className="preset-subtitle">{item.subtitle}</span>
                  </button>
                );
              })}
            </div>
            <Field label={presetConfig.nameLabel}>
              <input value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} />
            </Field>
            <Field label="Legal status"><input value={profile.legalStatus} onChange={(e) => setProfile({ ...profile, legalStatus: e.target.value })} /></Field>
            {activePreset === "FRENCH_FREELANCER" ? (
              <>
                <Field label={presetConfig.registrationLabel}><input value={profile.siren ?? ""} onChange={(e) => setProfile({ ...profile, siren: e.target.value })} /></Field>
                <Field label={presetConfig.taxLabel}><input value={profile.siret ?? ""} onChange={(e) => setProfile({ ...profile, siret: e.target.value })} /></Field>
              </>
            ) : (
              <>
                <Field label={presetConfig.registrationLabel}><input value={profile.commercialRegisterNumber ?? ""} onChange={(e) => setProfile({ ...profile, commercialRegisterNumber: e.target.value })} /></Field>
                <Field label={presetConfig.taxLabel}><input value={profile.taxId ?? ""} onChange={(e) => setProfile({ ...profile, taxId: e.target.value })} /></Field>
              </>
            )}
            <Field label="Address line 1"><input value={profile.addressLine1} onChange={(e) => setProfile({ ...profile, addressLine1: e.target.value })} /></Field>
            <Field label="Address line 2"><input value={profile.addressLine2 ?? ""} onChange={(e) => setProfile({ ...profile, addressLine2: e.target.value })} /></Field>
            <Field label="Postal code"><input value={profile.postalCode} onChange={(e) => setProfile({ ...profile, postalCode: e.target.value })} /></Field>
            <Field label="City"><input value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} /></Field>
            <Field label="Country"><input value={profile.country} onChange={(e) => setProfile({ ...profile, country: e.target.value })} /></Field>
            <Field label="Email"><input value={profile.email ?? ""} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></Field>
            <Field label="Phone"><input value={profile.phone ?? ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></Field>
            <Button onClick={saveProfile}>Save profile</Button>
          </div>
        </Panel>
      ) : null}

      {tab === "freelance" && freelance ? (
        <Panel title="Freelance settings" subtitle="Business defaults used by the dashboard">
          <div className="stack">
            <NumericField label="Default daily rate" value={freelance.defaultDailyRate} onChange={(value) => setFreelance({ ...freelance, defaultDailyRate: value })} />
            <NumericField label="Standard working days" value={freelance.standardWorkingDays} integer onChange={(value) => setFreelance({ ...freelance, standardWorkingDays: value })} />
            <Field label="Timezone"><input value={freelance.timezone} onChange={(e) => setFreelance({ ...freelance, timezone: e.target.value })} /></Field>
            <Field label="Default currency"><input value={freelance.defaultCurrency} onChange={(e) => setFreelance({ ...freelance, defaultCurrency: e.target.value })} /></Field>
            <Button onClick={saveFreelance}>Save freelance settings</Button>
          </div>
        </Panel>
      ) : null}

      {tab === "finance" && finance ? (
        <Panel title="Finance settings" subtitle="Emergency fund, 50/30/20, and tax reserve configuration">
          <div className="stack">
            <NumericField label="Monthly essential expenses" value={finance.monthlyEssentialExpenses} onChange={(value) => setFinance({ ...finance, monthlyEssentialExpenses: value })} />
            <NumericField label="Monthly wants" value={finance.monthlyWants} onChange={(value) => setFinance({ ...finance, monthlyWants: value })} />
            <NumericField label="Emergency fund months" value={finance.emergencyFundMonths} integer onChange={(value) => setFinance({ ...finance, emergencyFundMonths: value })} />
            <NumericField label="Current reserves" value={finance.currentReserves} onChange={(value) => setFinance({ ...finance, currentReserves: value })} />
            <NumericField label="Savings goal monthly" value={finance.savingsGoalMonthly} onChange={(value) => setFinance({ ...finance, savingsGoalMonthly: value })} />
            <NumericField label="Needs %" value={finance.needsPercent} onChange={(value) => setFinance({ ...finance, needsPercent: value })} />
            <NumericField label="Wants %" value={finance.wantsPercent} onChange={(value) => setFinance({ ...finance, wantsPercent: value })} />
            <NumericField label="Savings %" value={finance.savingsPercent} onChange={(value) => setFinance({ ...finance, savingsPercent: value })} />
            <NumericField label="Lifestyle target" value={finance.monthlyLifestyleTarget} onChange={(value) => setFinance({ ...finance, monthlyLifestyleTarget: value })} />
            <NumericField
              label="URSSAF reserve %"
              value={finance.urssafReservePercent}
              onChange={(value) => setFinance({ ...finance, urssafReservePercent: value })}
              help={activePreset === "FRENCH_FREELANCER" ? "French micro-entrepreneur estimate. Adjust if your activity has a different rate." : "Usually not used for the Lebanese profile."}
            />
            <NumericField
              label="Income tax reserve %"
              value={finance.incomeTaxReservePercent}
              onChange={(value) => setFinance({ ...finance, incomeTaxReservePercent: value })}
              help={activePreset === "FRENCH_FREELANCER" ? "Use 2.2% if you are on versement libératoire; otherwise set your own estimate." : "Usually not used for the Lebanese profile."}
            />
            <Button onClick={saveFinance}>Save finance settings</Button>
          </div>
        </Panel>
      ) : null}

      {tab === "invoice" && invoice && profile ? (
        <div className="invoice-settings-layout">
          <Panel title="Invoice settings" subtitle="Controls numbering, VAT, and PDF styling">
            <div className="stack">
              <Field label="Invoice prefix"><input value={invoice.invoicePrefix} onChange={(e) => setInvoice({ ...invoice, invoicePrefix: e.target.value })} /></Field>
              <Field label="Default currency"><input value={invoice.defaultCurrency} onChange={(e) => setInvoice({ ...invoice, defaultCurrency: e.target.value })} /></Field>
              <NumericField label="Payment terms days" value={invoice.defaultPaymentTermsDays} integer onChange={(value) => setInvoice({ ...invoice, defaultPaymentTermsDays: value })} />
              <NumericField label="Late payment rate" value={invoice.latePaymentRate} onChange={(value) => setInvoice({ ...invoice, latePaymentRate: value })} />
              <NumericField label="Recovery charge" value={invoice.recoveryChargeAmount} onChange={(value) => setInvoice({ ...invoice, recoveryChargeAmount: value })} />
              <Field label="VAT mode">
                <select value={invoice.vatMode} onChange={(e) => setInvoice({ ...invoice, vatMode: e.target.value as "APPLICABLE" | "EXEMPT" })}>
                  <option value="EXEMPT">Exempt</option>
                  <option value="APPLICABLE">Applicable</option>
                </select>
              </Field>
              <NumericField label="VAT rate" value={invoice.vatRate} onChange={(value) => setInvoice({ ...invoice, vatRate: value })} />
              <Field label="VAT exemption mention"><textarea rows={3} value={invoice.vatExemptionMention} onChange={(e) => setInvoice({ ...invoice, vatExemptionMention: e.target.value })} /></Field>
              <Field label="Logo URL or data URL">
                <input value={invoice.logoUrl ?? ""} onChange={(e) => setInvoice({ ...invoice, logoUrl: e.target.value })} />
              </Field>
              <Field label="Upload logo file" help="PNG, JPG, WebP, or SVG up to 2 MB">
                <input
                  key={logoInputKey}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                />
              </Field>
              {logoPreviewSrc ? (
                <div className="logo-preview">
                  <img src={logoPreviewSrc} alt="Invoice logo preview" />
                </div>
              ) : null}
              <div className="inline-actions">
                <Button variant="secondary" onClick={uploadLogo} disabled={!logoFile || uploadingLogo}>
                  {uploadingLogo ? "Uploading..." : "Upload logo"}
                </Button>
                <Button variant="ghost" onClick={removeLogo} disabled={!invoice?.logoUrl}>
                  Remove logo
                </Button>
                {logoFile ? <span className="file-name">{logoFile.name}</span> : null}
              </div>
              <Field label="Signature URL or data URL">
                <input value={invoice.signatureUrl ?? ""} onChange={(e) => setInvoice({ ...invoice, signatureUrl: e.target.value })} />
              </Field>
              <Field label="Upload signature file" help="PNG, JPG, WebP, or SVG up to 2 MB">
                <input
                  key={signatureInputKey}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) => setSignatureFile(e.target.files?.[0] ?? null)}
                />
              </Field>
              {signaturePreviewSrc ? (
                <div className="logo-preview">
                  <img src={signaturePreviewSrc} alt="Invoice signature preview" />
                </div>
              ) : null}
              <div className="inline-actions">
                <Button variant="secondary" onClick={uploadSignature} disabled={!signatureFile || uploadingSignature}>
                  {uploadingSignature ? "Uploading..." : "Upload signature"}
                </Button>
                <Button variant="ghost" onClick={removeSignature} disabled={!invoice?.signatureUrl}>
                  Remove signature
                </Button>
                {signatureFile ? <span className="file-name">{signatureFile.name}</span> : null}
              </div>
              <ColorField
                label="Primary color"
                value={invoice.primaryColor}
                onChange={(value) => setInvoice({ ...invoice, primaryColor: value })}
                help="Used for the invoice header, titles, and key accents."
              />
              <ColorField
                label="Secondary color"
                value={invoice.secondaryColor}
                onChange={(value) => setInvoice({ ...invoice, secondaryColor: value })}
                help="Used for soft panels, fills, and background accents."
              />
              <Field
                label="Payment account details"
                help="Add your IBAN, account number, bank name, and SWIFT/BIC so clients know where to transfer funds."
              >
                <textarea rows={4} value={invoice.bankDetails ?? ""} onChange={(e) => setInvoice({ ...invoice, bankDetails: e.target.value })} />
              </Field>
              <Field label="Terms and conditions"><textarea rows={4} value={invoice.termsAndConditions ?? ""} onChange={(e) => setInvoice({ ...invoice, termsAndConditions: e.target.value })} /></Field>
              <div className="numbering-card">
                <div className="numbering-title">Fiscal-year numbering rollover</div>
                <div className="numbering-subtitle">
                  Create a new series prefix and restart the sequence without risking duplicates.
                </div>
                <div className="stack">
                  <Field label="New series prefix">
                    <input value={newSeriesPrefix} onChange={(e) => setNewSeriesPrefix(e.target.value)} />
                  </Field>
                  <Field label="Starting sequence">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={newSeriesStartingSequence}
                      onChange={(e) => setNewSeriesStartingSequence(e.target.value)}
                    />
                  </Field>
                  <Button variant="secondary" onClick={resetNumberingSeries}>
                    Reset numbering series
                  </Button>
                </div>
              </div>
              <Button onClick={saveInvoice}>Save invoice settings</Button>
            </div>
          </Panel>

          <Panel title="Live invoice preview" subtitle="Rendered from your current draft settings">
            {invoicePreviewLoading && !invoicePreviewUrl ? (
              <div className="empty-state">Generating preview...</div>
            ) : invoicePreviewUrl ? (
              <div className="stack">
                <iframe
                  className="invoice-frame"
                  title="Invoice settings preview"
                  src={invoicePreviewUrl}
                />
                <div className="preview-actions">
                  <a className="button secondary" href={invoicePreviewUrl} target="_blank" rel="noreferrer">
                    Open preview
                  </a>
                </div>
              </div>
            ) : (
              <div className="empty-state">Your preview will appear here as soon as the invoice settings are filled in.</div>
            )}
          </Panel>
        </div>
      ) : null}

      {tab === "backup" ? (
        <div className="stack">
          <Panel title="Google Drive connection" subtitle="Save your Google OAuth app details, connect an account, and choose a backup folder.">
            <div className="stack">
              <div className="empty-state">
                {loadingGoogleDrive ? "Loading Google Drive status..." : "Connect Google Drive from your own account so backups can be uploaded without editing the server environment."}
              </div>
              <Field label="Google client ID" help="Paste the OAuth client ID from Google Cloud Console.">
                <input value={googleDriveClientId} onChange={(e) => setGoogleDriveClientId(e.target.value)} placeholder="1234-abc.apps.googleusercontent.com" />
              </Field>
              <Field label="Google client secret" help="Stored in the workspace so the app can refresh the token later.">
                <input
                  type="password"
                  value={googleDriveClientSecret}
                  onChange={(e) => setGoogleDriveClientSecret(e.target.value)}
                  placeholder="••••••••••"
                />
              </Field>
              <Field label="Drive folder ID" help="Optional. Leave empty to upload into your Google Drive root.">
                <input value={googleDriveFolderId} onChange={(e) => setGoogleDriveFolderId(e.target.value)} placeholder="1AbCdefGhIJKlmnoPqR" />
              </Field>
              <div className="inline-actions">
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await saveGoogleDriveConfig();
                    } catch (error) {
                      window.alert(error instanceof Error ? error.message : "Google Drive settings save failed");
                    }
                  }}
                  disabled={savingGoogleDrive || loadingGoogleDrive}
                >
                  {savingGoogleDrive ? "Saving..." : "Save Google Drive settings"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await connectGoogleDrive();
                    } catch (error) {
                      window.alert(error instanceof Error ? error.message : "Google Drive connect failed");
                    }
                  }}
                  disabled={connectingGoogleDrive || savingGoogleDrive || loadingGoogleDrive}
                >
                  {connectingGoogleDrive ? "Connecting..." : "Connect Google account"}
                </Button>
                <Button
                  variant="danger"
                  onClick={async () => {
                    try {
                      await disconnectGoogleDrive();
                    } catch (error) {
                      window.alert(error instanceof Error ? error.message : "Google Drive disconnect failed");
                    }
                  }}
                  disabled={disconnectingGoogleDrive || loadingGoogleDrive}
                >
                  {disconnectingGoogleDrive ? "Disconnecting..." : "Disconnect"}
                </Button>
              </div>
              <div className="field-help">
                OAuth redirect URI: <code>{googleDriveStatus?.redirectUri ?? "loading..."}</code>
              </div>
              <div className="field-help">
                Connected account: <strong>{googleDriveStatus?.connectedEmail ?? "not connected yet"}</strong>
              </div>
              <div className="field-help">
                Connection status: {googleDriveStatus?.refreshTokenConfigured ? "ready for uploads" : "not connected"}
              </div>
            </div>
          </Panel>

          <Panel title="Backup & transfer" subtitle="Download, restore, or upload a full workspace archive.">
            <div className="stack">
              <div className="empty-state">
                The archive includes the SQLite database and all uploaded logos and signatures. You can download it, restore it here, or send it to Google Drive.
              </div>
              <div className="inline-actions">
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await downloadBackup();
                    } catch (error) {
                      window.alert(error instanceof Error ? error.message : "Backup download failed");
                    }
                  }}
                >
                  Download backup archive
                </Button>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await uploadBackupToGoogleDrive();
                    } catch (error) {
                      window.alert(error instanceof Error ? error.message : "Google Drive upload failed");
                    }
                  }}
                  disabled={uploadingGoogleDriveBackup || loadingGoogleDrive || !googleDriveStatus?.refreshTokenConfigured || !googleDriveStatus.oauthConfigured}
                >
                  {uploadingGoogleDriveBackup ? "Uploading..." : "Upload to Google Drive"}
                </Button>
              </div>

              <Field label="Restore backup ZIP" help="Upload a previously downloaded backup archive to replace the local database and uploads.">
                <input
                  type="file"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  onChange={(e) => setBackupFile(e.target.files?.[0] ?? null)}
                />
              </Field>
              <div className="inline-actions">
                <Button variant="danger" onClick={restoreBackup} disabled={!backupFile || uploadingBackupRestore}>
                  {uploadingBackupRestore ? "Restoring..." : "Restore backup"}
                </Button>
                {backupFile ? <span className="file-name">{backupFile.name}</span> : null}
              </div>
              <div className="field-help">
                Restore carefully. The app keeps a copy of the previous database file before replacing it.
              </div>
              <div className="field-help">
                Backups now use the Google Drive account you connect above instead of server environment variables.
              </div>
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
