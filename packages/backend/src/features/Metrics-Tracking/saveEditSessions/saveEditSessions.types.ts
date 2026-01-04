export interface CreateSaveEditSessionInput {
  userId: string;
  sessionId: string;
  workspaceId?: string;
  
  // Session timing
  startTs: Date;
  endTs: Date;
  durationMin: number;
  
  // Edit counts
  editsTotal: number;
  
  // Raw save counts
  savesManual: number;
  savesAutosaveDelay: number;
  savesAutosaveFocusout: number;
  
  // Processed save counts
  autosavesEffective: number;
  checkpointAutosaveCount: number;
  
  // Ratios
  saveToEditRatioManual: number;
  saveToEditRatioAutosave: number;
  effectiveSaveToEditRatio: number;
  
  // Spacing metrics
  avgSecsBetweenSaves?: number;
  medianSecsBetweenSaves?: number;
  
  // Context
  manualSaveShare?: number;
  collapseWindowSec?: number;
}

export interface SaveEditSession {
  id: string;
  userId: string;
  sessionId: string;
  workspaceId?: string;
  startTs: Date;
  endTs: Date;
  durationMin: number;
  editsTotal: number;
  savesManual: number;
  savesAutosaveDelay: number;
  savesAutosaveFocusout: number;
  autosavesEffective: number;
  checkpointAutosaveCount: number;
  saveToEditRatioManual: number;
  saveToEditRatioAutosave: number;
  effectiveSaveToEditRatio: number;
  avgSecsBetweenSaves?: number;
  medianSecsBetweenSaves?: number;
  manualSaveShare?: number;
  collapseWindowSec: number;
  createdAt: Date;
}

export interface GetBestSessionsParams {
  userId: string;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
}
