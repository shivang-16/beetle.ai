'use client'

import { useState, useRef, useEffect } from 'react';
import { Play, Square, RotateCcw, Settings, FileText, Code, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { AnalysisForm } from './components/AnalysisForm';
import { AnalysisOutput } from './components/AnalysisOutput';
import { AnalysisStatus } from './components/AnalysisStatus';

export default function AnalysisPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [analysisConfig, setAnalysisConfig] = useState({
    repoUrl: 'https://github.com/shivang-16/Infinity_Social_Media.api',
    model: 'gemini-2.5-flash',
    prompt: 'Analyze this codebase for security vulnerabilities and code quality'
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const startAnalysis = async (config: typeof analysisConfig) => {
    setIsRunning(true);
    setOutput([]);
    setError(null);
    setAnalysisConfig(config);

    // Create new abort controller for this analysis
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('http://localhost:3001/api/analysis/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());
        
        setOutput(prev => [...prev, ...lines]);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setOutput(prev => [...prev, '🛑 Analysis stopped by user']);
      } else {
        setError(err.message || 'Analysis failed');
      }
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  };

  const stopAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const clearOutput = () => {
    setOutput([]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            🧠 CodeDetector Analysis
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Intelligent code analysis powered by AI models
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Configuration */}
          <div className="lg:col-span-1">
            <AnalysisForm
              config={analysisConfig}
              onStartAnalysis={startAnalysis}
              isRunning={isRunning}
              onStopAnalysis={stopAnalysis}
              onClearOutput={clearOutput}
            />
          </div>

          {/* Right Panel - Output */}
          <div className="lg:col-span-2">
            <AnalysisOutput
              output={output}
              error={error}
              isRunning={isRunning}
            />
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-6">
          <AnalysisStatus isRunning={isRunning} outputCount={output.length} />
        </div>
      </div>
    </div>
  );
}