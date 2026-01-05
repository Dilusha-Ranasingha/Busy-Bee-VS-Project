import type { AnalyzeTodoRequestDTO, AnalyzeTodoResponseDTO } from "./dtos";
import { ModelRegistry } from "../../ml/modelRegistry";

/**
 * NLP service: Extract urgency/deadline/entities/labels.
 * Start with baseline heuristics, upgrade to ONNX/Python later.
 */
export class NlpService {
  constructor(private readonly models: ModelRegistry) {}

  async analyze(input: AnalyzeTodoRequestDTO): Promise<AnalyzeTodoResponseDTO> {
    // If ONNX/Python is enabled, call it here via ModelRegistry.
    // For now: baseline heuristic extraction.
    const text = input.text.trim();

    const lower = text.toLowerCase();
    const urgencyKeywords = ["urgent", "asap", "immediately", "now", "critical", "blocker"];
    const hasUrgency = urgencyKeywords.some(k => lower.includes(k));
    const urgencyScore = hasUrgency ? 0.75 : 0.25;

    // naive deadline detection placeholder
    // e.g., "by tomorrow", "before 2026-01-10"
    const deadlineISO = null;

    const labels: string[] = [];
    if (lower.includes("fix") || lower.includes("bug")) labels.push("bug-fix");
    if (hasUrgency) labels.push("urgent");

    return {
      urgencyScore,
      deadlineISO,
      entities: { hasUrgency },
      labels,
      basePriority: "medium",
      confidence: 0.55,
    };
  }
}
