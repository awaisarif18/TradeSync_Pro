export const PROVIDER_WINDOWS_DOWNLOAD_URL =
  "https://github.com/YOUR_ORG/YOUR_REPO/releases/latest/download/TradeSyncPro-Provider-Setup.exe";

export const COPIER_WINDOWS_DOWNLOAD_URL =
  "https://github.com/YOUR_ORG/YOUR_REPO/releases/latest/download/TradeSyncPro-Copier-Setup.exe";

export type DesktopAppDownload = {
  id: "provider" | "copier";
  title: string;
  description: string;
  url: string;
  roleLabel: string;
};

export const PROVIDER_DOWNLOAD: DesktopAppDownload = {
  id: "provider",
  title: "Provider app",
  description:
    "Broadcast your MT5 trades to subscribed copiers. Requires your TSP license key.",
  url: PROVIDER_WINDOWS_DOWNLOAD_URL,
  roleLabel: "Provider",
};

export const COPIER_DOWNLOAD: DesktopAppDownload = {
  id: "copier",
  title: "Copier app",
  description:
    "Mirror a subscribed provider's trades on your MT5 account. Sign in with your registered email.",
  url: COPIER_WINDOWS_DOWNLOAD_URL,
  roleLabel: "Copier",
};

export function getDownloadForRole(
  role: "MASTER" | "SLAVE" | "ADMIN" | null,
): DesktopAppDownload | null {
  if (role === "MASTER") return PROVIDER_DOWNLOAD;
  if (role === "SLAVE") return COPIER_DOWNLOAD;
  return null;
}
