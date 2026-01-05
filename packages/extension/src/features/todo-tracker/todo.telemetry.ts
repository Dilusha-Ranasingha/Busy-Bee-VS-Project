import { Logger } from "../../logger/logger";

export type TodoTelemetryEvent =
  | { type: "todo_detected"; count: number; filePath?: string }
  | { type: "todo_enriched"; count: number }
  | { type: "reminder_shown"; todoId: string; filePath: string }
  | { type: "todo_resolved"; todoId: string };

export class TodoTelemetry {
  constructor(private readonly logger: Logger) {}

  emit(ev: TodoTelemetryEvent) {
    // For research, you can later store these in a separate log file or aggregate in dashboard
    this.logger.info(`[telemetry] ${ev.type} ${JSON.stringify(ev)}`);
  }
}
