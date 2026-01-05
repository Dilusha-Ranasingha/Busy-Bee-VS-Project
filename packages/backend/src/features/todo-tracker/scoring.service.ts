import type { AnalyzeTodoResponseDTO, TodoPriority } from "./dtos";

export class ScoringService {
  /**
   * Combine multiple signals into a final priority.
   * Start with a baseline; later you can incorporate:
   * - user behavior signals
   * - missed reminders
   * - file risk
   * - deadline proximity
   */
  computePriority(analysis: AnalyzeTodoResponseDTO): TodoPriority {
    const u = analysis.urgencyScore; // 0..1
    const hasDeadline = !!analysis.deadlineISO;

    if (u >= 0.85) return "urgent";
    if (u >= 0.60 && hasDeadline) return "high";
    if (u >= 0.60) return "high";
    if (u >= 0.30) return "medium";
    return "low";
  }
}
