export interface CreateDiagnosticDensitySessionInput {
  userId: string;
  sessionId: string;
  workspaceId?: string;
  fileHash: string;
  language?: string;
  startTs: Date;
  endTs: Date;
  durationMin: number;
  peakLineCount: number;
  peakErrors: number;
  peakWarnings: number;
  peakDensityPerKloc: number;
  finalLineCount: number;
}

export interface DiagnosticDensitySession {
  id: string;
  userId: string;
  sessionId: string;
  workspaceId?: string;
  fileHash: string;
  language?: string;
  startTs: string;
  endTs: string;
  durationMin: number;
  peakLineCount: number;
  peakErrors: number;
  peakWarnings: number;
  peakDensityPerKloc: number;
  finalLineCount: number;
  createdAt: string;
}

export interface DiagnosticDensityBestSessions {
  highest: DiagnosticDensitySession | null;
  lowest: DiagnosticDensitySession | null;
}
