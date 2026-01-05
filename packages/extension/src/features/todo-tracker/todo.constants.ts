export const TODO_SCHEMA_VERSION = 1;

// Folder name under .vscode for Option A
export const TODO_WORKSPACE_FOLDER = ".vscode/busy-bee-todo";

// Common TODO patterns
export const TODO_PATTERNS: RegExp[] = [
  /TODO[:\s-]+(.+)/i,
  /FIXME[:\s-]+(.+)/i,
  /BUG[:\s-]+(.+)/i,
];

// Reminder defaults
export const REMINDER_COOLDOWN_MS = 10 * 60 * 1000; // 10 min
export const MAX_CANDIDATE_FILES = 500;
export const DEFAULT_TOP_K = 5;

// Ignore folders
export const DEFAULT_EXCLUDE_GLOB = "**/{node_modules,dist,build,out,.git,.vscode}/**";
