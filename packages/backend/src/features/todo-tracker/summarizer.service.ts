import type { SummarizeRequestDTO, SummarizeResponseDTO } from "./dtos";

/**
 * Optional: LLM-powered summarizer. Keep it disabled by default.
 * You can implement OpenAI/Gemini calls here later.
 */
export class SummarizerService {
  async summarize(input: SummarizeRequestDTO): Promise<SummarizeResponseDTO> {
    // baseline summarizer: short instruction-like summary
    const summaries = input.todos.map(t => ({
      id: t.id,
      summary: `Task: ${truncate(t.text, 120)}`,
    }));
    return { summaries };
  }
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}
