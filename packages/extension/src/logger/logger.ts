export type LogLevel = "debug" | "info" | "warn" | "error";

export class Logger {
  private readonly prefix: string;
  private readonly level: LogLevel;

  constructor(prefix = "busy-bee", level: LogLevel = "info") {
    this.prefix = prefix;
    this.level = level;
  }

  private levelRank(l: LogLevel) {
    switch (l) {
      case "debug": return 10;
      case "info": return 20;
      case "warn": return 30;
      case "error": return 40;
    }
  }

  private shouldLog(l: LogLevel) {
    return this.levelRank(l) >= this.levelRank(this.level);
  }

  private fmt(l: LogLevel, msg: string) {
    const ts = new Date().toISOString();
    return `[${ts}] [${this.prefix}] [${l.toUpperCase()}] ${msg}`;
  }

  debug(msg: string) { if (this.shouldLog("debug")) console.log(this.fmt("debug", msg)); }
  info(msg: string) { if (this.shouldLog("info")) console.log(this.fmt("info", msg)); }
  warn(msg: string) { if (this.shouldLog("warn")) console.warn(this.fmt("warn", msg)); }
  error(msg: string, err?: unknown) {
    if (!this.shouldLog("error")) return;
    console.error(this.fmt("error", msg));
    if (err) console.error(err);
  }
}
