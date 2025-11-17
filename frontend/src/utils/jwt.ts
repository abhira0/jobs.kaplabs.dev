export function parseJwt(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = typeof window !== "undefined" && typeof atob === "function"
      ? atob(payload)
      : Buffer.from(payload, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);
    return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}


