import { apiClient } from '../api.client';
import type { FileSwitchSessionSummary, FileSwitchWindow } from '../../types/Metrics-Tracking/fileSwitch.types';

type ApiResponse<T> = { ok: boolean; data: T };

export async function getFileSwitchSessions(date: string) {
  const res = await apiClient.get<ApiResponse<FileSwitchSessionSummary[]>>(
    `/api/file-switch/sessions?date=${encodeURIComponent(date)}`
  );
  return res.data;
}

export async function getFileSwitchWindows(sessionId: string) {
  const res = await apiClient.get<ApiResponse<FileSwitchWindow[]>>(
    `/api/file-switch/windows?sessionId=${encodeURIComponent(sessionId)}`
  );
  return res.data;
}
