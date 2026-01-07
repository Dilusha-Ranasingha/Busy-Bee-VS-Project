export type TodoStatus = "open" | "in_progress" | "resolved";
export type TodoPriority = "low" | "medium" | "high" | "urgent";

export interface TodoItem {
  id: string;
  text: string;
  filePath: string;
  line: number;
  status: TodoStatus;

  // May be missing for older stored todos.
  createdAt?: string;
  updatedAt?: string;

  priority?: TodoPriority;
  labels?: string[];
  deadlineISO?: string | null;
  urgencyScore?: number;
}

export type TodoStateMessage =
  | {
      type: "TODO/STATE";
      payload: { projectId: string | null; projectName: string | null; todos: TodoItem[] };
    }
  | { type: "TODO/FILE_PICKED"; payload: { filePath: string | null } }
  | { type: "TODO/ERROR"; payload: { message: string } };
