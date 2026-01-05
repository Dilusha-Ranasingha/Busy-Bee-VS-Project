import { spawn } from "child_process";

/**
 * Skeleton: call a python script or service.
 * Good for early research models.
 */
export class PythonBridge {
  async infer(scriptPath: string, payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const p = spawn("python", [scriptPath], { stdio: ["pipe", "pipe", "pipe"] });

      let out = "";
      let err = "";

      p.stdout.on("data", (d) => (out += d.toString()));
      p.stderr.on("data", (d) => (err += d.toString()));

      p.on("close", (code) => {
        if (code !== 0) return reject(new Error(`python failed (${code}): ${err}`));
        try {
          resolve(JSON.parse(out));
        } catch (e) {
          reject(new Error(`invalid python output: ${out}`));
        }
      });

      p.stdin.write(JSON.stringify(payload));
      p.stdin.end();
    });
  }
}
