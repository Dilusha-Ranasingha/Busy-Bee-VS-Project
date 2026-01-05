import type {
  AnalyzeTodoRequestDTO,
  AnalyzeTodoResponseDTO,
  AssociateRequestDTO,
  AssociateResponseDTO,
  EnrichRequestDTO,
  EnrichResponseDTO,
  SummarizeRequestDTO,
  SummarizeResponseDTO,
} from "./dtos";

import { NlpService } from "./nlp.service";
import { AssociationService } from "./association.service";
import { ScoringService } from "./scoring.service";
import { SummarizerService } from "./summarizer.service";

export class TodoTrackerService {
  constructor(
    private readonly nlp: NlpService,
    private readonly assoc: AssociationService,
    private readonly scoring: ScoringService,
    private readonly summarizer: SummarizerService
  ) {}

  async analyzeTodo(input: AnalyzeTodoRequestDTO): Promise<AnalyzeTodoResponseDTO> {
    const analysis = await this.nlp.analyze(input);
    // Overwrite basePriority via scoring if you want
    const finalPriority = this.scoring.computePriority(analysis);
    return { ...analysis, basePriority: finalPriority };
  }

  async associateFiles(input: AssociateRequestDTO): Promise<AssociateResponseDTO> {
    return this.assoc.associate(input);
  }

  async enrichTodos(input: EnrichRequestDTO): Promise<EnrichResponseDTO> {
    const topK = input.topK ?? 5;

    // Analyze each todo
    const analyses = await Promise.all(
      input.todos.map(async (t) => {
        const analysis = await this.analyzeTodo({
          text: t.text,
          filePath: t.filePath,
          projectId: input.projectId,
        });
        return { id: t.id, analysis };
      })
    );

    // Associate files (optional)
    let suggestionsByTodoId = new Map<string, Array<{ path: string; score: number }>>();
    if (input.candidateFiles && input.candidateFiles.length > 0) {
      const assocResults = await Promise.all(
        input.todos.map(async (t) => {
          const assocOut = await this.associateFiles({
            text: t.text,
            candidateFiles: input.candidateFiles!,
            topK,
          });
          return { id: t.id, suggestions: assocOut.suggestions };
        })
      );
      assocResults.forEach(r => suggestionsByTodoId.set(r.id, r.suggestions));
    } else {
      input.todos.forEach(t => suggestionsByTodoId.set(t.id, []));
    }

    const enriched = input.todos.map(t => {
      const a = analyses.find(x => x.id === t.id)!.analysis;
      const priority = this.scoring.computePriority(a);
      return {
        id: t.id,
        text: t.text,
        filePath: t.filePath,
        status: t.status ?? "open",
        priority,
        labels: a.labels,
        deadlineISO: a.deadlineISO ?? null,
        urgencyScore: a.urgencyScore,
        suggestedFiles: suggestionsByTodoId.get(t.id) ?? [],
        modelMeta: { mode: "baseline" as const, version: "0.1.0" },
      };
    });

    return { todos: enriched };
  }

  async summarizeTodos(input: SummarizeRequestDTO): Promise<SummarizeResponseDTO> {
    return this.summarizer.summarize(input);
  }
}
