import type { AssociateRequestDTO, AssociateResponseDTO } from "./dtos";
import { ModelRegistry } from "../../ml/modelRegistry";

/**
 * File association service: suggests relevant files for a TODO.
 * Baseline: simple name matching / token overlap.
 * Later: embeddings + vector similarity from ONNX/Python.
 */
export class AssociationService {
  constructor(private readonly models: ModelRegistry) {}

  async associate(input: AssociateRequestDTO): Promise<AssociateResponseDTO> {
    const q = input.text.toLowerCase();
    const topK = input.topK ?? 5;

    // baseline score = overlap between todo tokens and file path tokens
    const qTokens = tokenize(q);
    const scored = input.candidateFiles.map(f => {
      const pathTokens = tokenize(f.path.toLowerCase());
      const score = jaccard(qTokens, pathTokens);
      return { path: f.path, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return { suggestions: scored.slice(0, topK) };
  }
}

function tokenize(s: string): Set<string> {
  return new Set(
    s.replace(/[^a-z0-9/_\-. ]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .map(t => t.trim())
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  const inter = [...a].filter(x => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
}
