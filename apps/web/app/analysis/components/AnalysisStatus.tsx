'use client'

import { Activity, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface AnalysisStatusProps {
  isRunning: boolean;
  outputCount: number;
}

export function AnalysisStatus({ isRunning, outputCount }: AnalysisStatusProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Status Indicator */}
          <div className="flex items-center space-x-2">
            {isRunning ? (
              <>
                <Activity className="w-5 h-5 text-blue-500 animate-pulse" />
                <span className="text-blue-600 dark:text-blue-400 font-medium">Running</span>
              </>
            ) : outputCount > 0 ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-green-600 dark:text-green-400 font-medium">Completed</span>
              </>
            ) : (
              <>
                <Clock className="w-5 h-5 text-gray-400" />
                <span className="text-gray-500 dark:text-gray-400 font-medium">Idle</span>
              </>
            )}
          </div>

          {/* Output Count */}
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <span>Output lines:</span>
            <span className="font-mono font-medium">{outputCount}</span>
          </div>
        </div>

        {/* Additional Info */}
        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>API Connected</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Streaming Ready</span>
          </div>
        </div>
      </div>

      {/* Progress Bar for Running State */}
      {isRunning && (
        <div className="mt-3">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Processing analysis...
          </div>
        </div>
      )}
    </div>
  );
}