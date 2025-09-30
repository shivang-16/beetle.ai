import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { AnalysisItem } from '@/types/types';
import { _config } from '@/lib/_config';

interface UseAnalysisListProps {
  repoId: string;
  initialAnalysisList?: AnalysisItem[];
}

interface UseAnalysisListReturn {
  analysisList: AnalysisItem[];
  isLoading: boolean;
  error: string | null;
  refreshAnalysisList: () => Promise<void>;
  hasRunningAnalyses: boolean;
}

export const useAnalysisList = ({ 
  repoId, 
  initialAnalysisList = [] 
}: UseAnalysisListProps): UseAnalysisListReturn => {
  const [analysisList, setAnalysisList] = useState<AnalysisItem[]>(initialAnalysisList);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();

  // Check if there are any running or draft analyses
  const hasRunningAnalyses = analysisList.some(
    analysis => analysis.status === "running" || analysis.status === "draft"
  );

  const fetchAnalysisList = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = await getToken();
      if (!token) {
        setError("Authentication token not available");
        return;
      }

      const res = await fetch(`${_config.API_BASE_URL}/api/analysis/${repoId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (res.ok) {
        const json = await res.json();
        const list: AnalysisItem[] = Array.isArray(json?.data) ? json.data : [];
        setAnalysisList(list);
      } else {
        setError(`Failed to fetch analysis list: ${res.status}`);
      }
    } catch (error) {
      console.error("Failed to fetch analysis list:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch analysis list");
    } finally {
      setIsLoading(false);
    }
  }, [repoId, getToken]);

  // Initial fetch when repoId changes
  useEffect(() => {
    fetchAnalysisList();
  }, [fetchAnalysisList]);

  // Listen for custom refresh events
  useEffect(() => {
    const handleRefreshAnalysisList = () => {
      fetchAnalysisList();
    };

    window.addEventListener('refreshAnalysisList', handleRefreshAnalysisList);

    return () => {
      window.removeEventListener('refreshAnalysisList', handleRefreshAnalysisList);
    };
  }, [fetchAnalysisList]);

  return {
    analysisList,
    isLoading,
    error,
    refreshAnalysisList: fetchAnalysisList,
    hasRunningAnalyses,
  };
};