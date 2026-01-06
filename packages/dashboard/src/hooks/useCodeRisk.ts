import { useState, useEffect, useCallback } from 'react';
import type { CodeRiskItem } from '../types/Code-Risk/codeRisk.types';
import { 
  getActiveRiskResults, 
  getAllRiskResults,
  deactivateRiskResult,
  transformToCodeRiskItem 
} from '../services/Code-Risk/codeRisk.service';
import { useAuth } from '../contexts/AuthContext';

export function useCodeRisk(autoRefresh = true, refreshInterval = 30000) {
  const { user } = useAuth();
  const [activeRisks, setActiveRisks] = useState<CodeRiskItem[]>([]);
  const [allRisks, setAllRisks] = useState<CodeRiskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveRisks = useCallback(async () => {
    if (!user) {
      setActiveRisks([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const results = await getActiveRiskResults(user.id.toString());
      const items = results.map(result => transformToCodeRiskItem(result));
      
      setActiveRisks(items);
    } catch (err) {
      console.error('Error fetching active code risks:', err);
      setError('Failed to load active code risks');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchAllRisks = useCallback(async (limit?: number) => {
    if (!user) {
      setAllRisks([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const results = await getAllRiskResults(user.id.toString(), limit);
      const items = results.map(result => transformToCodeRiskItem(result));
      
      setAllRisks(items);
    } catch (err) {
      console.error('Error fetching all code risks:', err);
      setError('Failed to load code risk history');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const dismissRisk = useCallback(async (riskId: string) => {
    try {
      await deactivateRiskResult(riskId);
      
      // Remove from active risks
      setActiveRisks(prev => prev.filter(risk => risk.id !== riskId));
      
      // Update all risks to mark as inactive
      setAllRisks(prev => 
        prev.map(risk => 
          risk.id === riskId 
            ? { ...risk, colorCode: 'Green' as const, riskLevel: 'Low' as const }
            : risk
        )
      );
    } catch (err) {
      console.error('Error dismissing code risk:', err);
      throw new Error('Failed to dismiss code risk');
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchActiveRisks();
  }, [fetchActiveRisks]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh || !user) {
      return;
    }

    const interval = setInterval(() => {
      fetchActiveRisks();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchActiveRisks, user]);

  return {
    activeRisks,
    allRisks,
    loading,
    error,
    fetchActiveRisks,
    fetchAllRisks,
    dismissRisk,
    hasActiveRisks: activeRisks.length > 0
  };
}
