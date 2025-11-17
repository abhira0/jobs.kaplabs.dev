export function buildApiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL; // e.g. http://localhost:5174/api/v1
  const prefix = process.env.NEXT_PUBLIC_API_PREFIX ?? "/api"; // used when no base is provided
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (base && base.length > 0) {
    const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
    return `${normalizedBase}${normalizedPath}`;
  }
  const normalizedPrefix = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
  return `${normalizedPrefix}${normalizedPath}`;
}


