/**
 * Placeholder for embedding helpers.
 * Later: use ONNX embedder or python.
 */
export function embedTextBaseline(text: string): number[] {
  // baseline dummy embedding; replace later
  const s = text.toLowerCase();
  return [s.length % 13, s.length % 17, s.length % 19];
}
