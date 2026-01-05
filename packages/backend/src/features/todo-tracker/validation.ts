import type {
  AnalyzeTodoRequestDTO,
  AssociateRequestDTO,
  EnrichRequestDTO,
  SummarizeRequestDTO,
} from "./dtos";

function assertString(v: any, field: string) {
  if (typeof v !== "string" || v.trim().length === 0) throw new Error(`${field} must be a non-empty string`);
}
function assertArray(v: any, field: string) {
  if (!Array.isArray(v)) throw new Error(`${field} must be an array`);
}

export function validateAnalyzeRequest(body: any): AnalyzeTodoRequestDTO {
  assertString(body?.text, "text");
  return {
    text: body.text,
    filePath: typeof body.filePath === "string" ? body.filePath : undefined,
    codeContext: typeof body.codeContext === "string" ? body.codeContext : undefined,
    projectId: typeof body.projectId === "string" ? body.projectId : undefined,
  };
}

export function validateAssociateRequest(body: any): AssociateRequestDTO {
  assertString(body?.text, "text");
  assertArray(body?.candidateFiles, "candidateFiles");
  return {
    text: body.text,
    candidateFiles: body.candidateFiles.map((f: any) => {
      assertString(f?.path, "candidateFiles[].path");
      return { path: f.path, name: f.name, lang: f.lang };
    }),
    topK: Number.isFinite(body.topK) ? Math.max(1, Math.min(25, body.topK)) : undefined,
  };
}

export function validateEnrichRequest(body: any): EnrichRequestDTO {
  assertArray(body?.todos, "todos");
  const todos = body.todos.map((t: any) => {
    assertString(t?.id, "todos[].id");
    assertString(t?.text, "todos[].text");
    return { id: t.id, text: t.text, filePath: t.filePath, status: t.status };
  });

  let candidateFiles: any[] | undefined;
  if (body.candidateFiles != null) {
    assertArray(body.candidateFiles, "candidateFiles");
    candidateFiles = body.candidateFiles;
  }

  return {
    todos,
    candidateFiles: candidateFiles?.map((f: any) => {
      assertString(f?.path, "candidateFiles[].path");
      return { path: f.path, name: f.name, lang: f.lang };
    }),
    topK: Number.isFinite(body.topK) ? Math.max(1, Math.min(25, body.topK)) : undefined,
    projectId: typeof body.projectId === "string" ? body.projectId : undefined,
  };
}

export function validateSummarizeRequest(body: any): SummarizeRequestDTO {
  assertArray(body?.todos, "todos");
  const todos = body.todos.map((t: any) => {
    assertString(t?.id, "todos[].id");
    assertString(t?.text, "todos[].text");
    return { id: t.id, text: t.text, priority: t.priority, filePath: t.filePath };
  });
  return { todos };
}
