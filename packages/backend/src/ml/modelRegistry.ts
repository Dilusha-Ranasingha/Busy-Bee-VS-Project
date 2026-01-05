import path from "path";

/**
 * Central place to manage model paths, versions, and modes.
 * Later you can load ONNX sessions once and reuse.
 */
export class ModelRegistry {
  // Example: where ONNX artifacts are located relative to backend build output
  // In production you might copy artifacts to backend/dist/models during build.
  readonly artifactsDir: string;

  // Flags you can control via env
  readonly mode: "baseline" | "onnx" | "python";

  constructor() {
    this.artifactsDir = process.env.TODO_MODEL_DIR
      ? process.env.TODO_MODEL_DIR
      : path.resolve(process.cwd(), "packages", "ml", "artifacts");

    this.mode =
      (process.env.TODO_INFER_MODE as any) ??
      "baseline";
  }

  getTodoNerModelPath(): string {
    return path.join(this.artifactsDir, "todo_ner.onnx");
  }

  getTodoPriorityModelPath(): string {
    return path.join(this.artifactsDir, "todo_priority.onnx");
  }

  getEmbedderModelPath(): string {
    return path.join(this.artifactsDir, "embedder.onnx");
  }
}
