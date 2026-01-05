export function associateFilesBaseline(todoText: string, candidatePaths: string[], topK = 5) {
  const q = tokenize(todoText);

  const scored = candidatePaths.map((p) => {
    const s = tokenize(p);
    return { path: p, score: jaccard(q, s) };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

function tokenize(s: string): Set<string> {
  return new Set(
    s.toLowerCase()
      .replace(/[^a-z0-9/_\-. ]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  const inter = [...a].filter(x => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
}
