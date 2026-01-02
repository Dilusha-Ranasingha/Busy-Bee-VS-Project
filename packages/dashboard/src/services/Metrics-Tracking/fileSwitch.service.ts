import { apiClient } from '../api.client';
import type { FileSwitchSessionSummary, FileSwitchWindow } from '../../types/Metrics-Tracking/fileSwitch.types';

type ApiResponse<T> = { ok: boolean; data: T };

export async function getFileSwitchSessions(date: string, userId?: string) {
  const params = new URLSearchParams({ date });
  if (userId) params.append('userId', userId);
  
  const res = await apiClient.get<ApiResponse<FileSwitchSessionSummary[]>>(
    `/api/file-switch/sessions?${params.toString()}`
  );
  return res.data;
}

export async function getFileSwitchWindows(sessionId: string, userId?: string) {
  const params = new URLSearchParams({ sessionId });
  if (userId) params.append('userId', userId);
  
  const res = await apiClient.get<ApiResponse<FileSwitchWindow[]>>(
    `/api/file-switch/windows?${params.toString()}`
  );
  return res.data;
}
