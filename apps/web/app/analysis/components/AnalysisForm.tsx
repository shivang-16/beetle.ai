'use client'

import { useState } from 'react';
import { Play, Square, RotateCcw, Settings, FileText, Code } from 'lucide-react';

interface AnalysisConfig {
  repoUrl: string;
  model: string;
  prompt: string;
}

interface AnalysisFormProps {
  config: AnalysisConfig;
  onStartAnalysis: (config: AnalysisConfig) => void;
  isRunning: boolean;
  onStopAnalysis: () => void;
  onClearOutput: () => void;
}

export function AnalysisForm({ 
  config, 
  onStartAnalysis, 
  isRunning, 
  onStopAnalysis, 
  onClearOutput 
}: AnalysisFormProps) {
  const [formConfig, setFormConfig] = useState<AnalysisConfig>(config);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartAnalysis(formConfig);
  };

  const handleInputChange = (field: keyof AnalysisConfig, value: string) => {
    setFormConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Settings className="w-5 h-5 text-blue-500" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Analysis Configuration
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Repository URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Repository URL
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="url"
                value={formConfig.repoUrl}
                onChange={(e) => handleInputChange('repoUrl', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://github.com/user/repo"
                disabled={isRunning}
              />
            </div>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              AI Model
            </label>
            <div className="relative">
              <Code className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={formConfig.model}
                onChange={(e) => handleInputChange('model', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isRunning}
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4o-mini">GPT-4o Mini</option>
              </select>
            </div>
          </div>

          {/* Analysis Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Analysis Prompt
            </label>
            <textarea
              value={formConfig.prompt}
              onChange={(e) => handleInputChange('prompt', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Describe what you want to analyze..."
              disabled={isRunning}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            {!isRunning ? (
              <button
                type="submit"
                className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Play className="w-4 h-4" />
                <span>Start Analysis</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onStopAnalysis}
                className="flex-1 flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Square className="w-4 h-4" />
                <span>Stop Analysis</span>
              </button>
            )}
            
            <button
              type="button"
              onClick={onClearOutput}
              className="flex items-center justify-center space-x-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Quick Presets */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Quick Presets
          </h3>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleInputChange('prompt', 'Analyze this codebase for security vulnerabilities and code quality')}
              className="w-full text-left text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
              disabled={isRunning}
            >
              🔒 Security & Quality Analysis
            </button>
            <button
              type="button"
              onClick={() => handleInputChange('prompt', 'Find performance bottlenecks and optimization opportunities')}
              className="w-full text-left text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
              disabled={isRunning}
            >
              ⚡ Performance Analysis
            </button>
            <button
              type="button"
              onClick={() => handleInputChange('prompt', 'Review code for best practices and architectural improvements')}
              className="w-full text-left text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
              disabled={isRunning}
            >
              🏗️ Architecture Review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}