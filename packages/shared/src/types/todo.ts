export type TodoStatus = "open" | "in_progress" | "resolved";
export type TodoPriority = "low" | "medium" | "high" | "urgent";

export interface TodoItem {
  id: string;
  text: string;
  filePath: string;
  line: number;
  status: TodoStatus;

  // Enrichment (AI/NLP)
  priority?: TodoPriority;
  labels?: string[];
  deadlineISO?: string | null;
  urgencyScore?: number; // 0..1
  suggestedFiles?: Array<{ path: string; score: number }>;

  createdAt: string;
  updatedAt: string;
}

export interface TodoDbMeta {
  schemaVersion: number;
  projectId: string;
  projectName: string;
  updatedAt: string;
}

export interface TodoDb {
  meta: TodoDbMeta;
  todos: TodoItem[];
}
