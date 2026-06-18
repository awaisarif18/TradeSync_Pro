import { API_URL } from "@/services/api";

/** Resolve a stored avatar path (or full URL) for use in img src. */
export function resolveMediaUrl(
  avatarUrl: string | null | undefined,
): string | undefined {
  if (!avatarUrl || !avatarUrl.trim()) return undefined;
  const trimmed = avatarUrl.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) {
    return `${API_URL}${trimmed}`;
  }
  return trimmed;
}
