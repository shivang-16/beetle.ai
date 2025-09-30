/**
 * Utility functions for triggering analysis-related events
 */

/**
 * Triggers a refresh of the analysis list
 * This will cause AnalysisContent component to refetch the analysis list
 */
export const triggerAnalysisListRefresh = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('refreshAnalysisList'));
  }
};

/**
 * Triggers analysis list refresh with a small delay
 * Useful when you want to ensure the backend has processed the change
 */
export const triggerAnalysisListRefreshDelayed = (delay: number = 500) => {
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('refreshAnalysisList'));
    }, delay);
  }
};