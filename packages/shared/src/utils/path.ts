export function normalizeSlashes(p: string): string {
  return p.replace(/\\/g, "/");
}

export function safeBasename(p: string): string {
  const n = normalizeSlashes(p);
  const parts = n.split("/");
  return parts[parts.length - 1] || n;
}
