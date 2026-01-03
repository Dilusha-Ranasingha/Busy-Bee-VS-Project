export interface CreateDiagnosticDensityEventInput {
  userId: string;
  workspaceId?: string;
  fileHash: string;
  language?: string;
  ts: Date;
  lineCount: number;
  errors: number;
  warnings: number;
  densityPerKloc: number;
}

export interface DiagnosticDensityEvent {
  id: string;
  userId: string;
  workspaceId?: string;
  fileHash: string;
  language?: string;
  ts: string;
  lineCount: number;
  errors: number;
  warnings: number;
  densityPerKloc: number;
  createdAt: string;
}

export interface DiagnosticDensityExtremes {
  highest: DiagnosticDensityEvent | null;
  lowestNonZero: DiagnosticDensityEvent | null;
  latestZero: DiagnosticDensityEvent | null;
}
