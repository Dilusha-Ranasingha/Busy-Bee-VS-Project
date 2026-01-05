export type TodoPriority = "low" | "medium" | "high" | "urgent";

export interface TodoCandidateFile {
  path: string;     // relative path recommended
  name?: string;    // optional file name
  lang?: string;    // optional extension/language
}

export interface AnalyzeTodoRequestDTO {
  text: string;
  filePath?: string;      // where it was found
  codeContext?: string;   // optional surrounding snippet
  projectId?: string;     // optional (extension can pass)
}

export interface AnalyzeTodoResponseDTO {
  urgencyScore: number;      // 0..1
  deadlineISO?: string | null;
  entities: Record<string, any>;
  labels: string[];
  basePriority: TodoPriority;
  confidence: number;        // 0..1
}

export interface AssociateRequestDTO {
  text: string;
  candidateFiles: TodoCandidateFile[];
  topK?: number;             // default 5
}

export interface AssociateResponseDTO {
  suggestions: Array<{ path: string; score: number }>;
}

export interface EnrichRequestDTO {
  todos: Array<{
    id: string;
    text: string;
    filePath?: string;
    status?: "open" | "in_progress" | "resolved";
  }>;
  candidateFiles?: TodoCandidateFile[]; // optional for association
  topK?: number;
  projectId?: string;
}

export interface EnrichResponseDTO {
  todos: Array<{
    id: string;
    text: string;
    filePath?: string;
    status?: "open" | "in_progress" | "resolved";
    priority: TodoPriority;
    labels: string[];
    deadlineISO?: string | null;
    urgencyScore: number;
    suggestedFiles: Array<{ path: string; score: number }>;
    modelMeta: { mode: "baseline" | "onnx" | "python"; version?: string };
  }>;
}

export interface SummarizeRequestDTO {
  todos: Array<{ id: string; text: string; priority?: TodoPriority; filePath?: string }>;
}

export interface SummarizeResponseDTO {
  summaries: Array<{ id: string; summary: string }>;
}
