/**
 * Skeleton for ONNX runtime.
 * You can implement with onnxruntime-node later.
 */
export class OnnxRunner {
  async load(_modelPath: string): Promise<void> {
    // TODO: load ONNX session
  }

  async run(_inputs: Record<string, any>): Promise<Record<string, any>> {
    // TODO: run inference
    return {};
  }
}
