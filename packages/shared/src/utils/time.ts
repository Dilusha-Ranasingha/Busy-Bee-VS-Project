export function isoNow(): string {
  return new Date().toISOString();
}

export function minutes(ms: number) {
  return ms * 60_000;
}
