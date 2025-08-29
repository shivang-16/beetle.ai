'use client'

import { useEffect, useRef } from 'react';
import { Terminal, AlertCircle, CheckCircle, Clock, FileText, Code } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

interface AnalysisOutputProps {
  output: string[];
  error: string | null;
  isRunning: boolean;
}

export function AnalysisOutput({ output, error, isRunning }: AnalysisOutputProps) {
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const renderLine = (line: string, index: number) => {
    // Check for different types of output lines
    if (line.includes('🧠 CodeDetector')) {
      return (
        <div key={index} className="text-blue-500 font-semibold">
          {line}
        </div>
      );
    }

    if (line.includes('📁 Repository:') || line.includes('🤖 Model:') || line.includes('💭 Prompt:')) {
      return (
        <div key={index} className="text-gray-600 dark:text-gray-400">
          {line}
        </div>
      );
    }

    if (line.includes('🔄') || line.includes('⏳')) {
      return (
        <div key={index} className="text-yellow-600 dark:text-yellow-400">
          {line}
        </div>
      );
    }

    if (line.includes('✅') || line.includes('🎉')) {
      return (
        <div key={index} className="text-green-600 dark:text-green-400">
          {line}
        </div>
      );
    }

    if (line.includes('⚠️') || line.includes('❌')) {
      return (
        <div key={index} className="text-red-600 dark:text-red-400">
          {line}
        </div>
      );
    }

    if (line.includes('🔒') || line.includes('🔧')) {
      return (
        <div key={index} className="text-purple-600 dark:text-purple-400">
          {line}
        </div>
      );
    }

    // Check for markdown content
    if (line.includes('```') || line.includes('#') || line.includes('**') || line.includes('*')) {
      return (
        <div key={index} className="markdown-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                const isInline = !match;
                return !isInline ? (
                  <SyntaxHighlighter
                    style={oneDark as any}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {line}
          </ReactMarkdown>
        </div>
      );
    }

    // Default rendering
    return (
      <div key={index} className="text-gray-800 dark:text-gray-200 font-mono text-sm">
        {line}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-green-500" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Analysis Output
            </h2>
          </div>
          
          <div className="flex items-center space-x-2">
            {isRunning && (
              <div className="flex items-center space-x-1 text-yellow-600 dark:text-yellow-400">
                <Clock className="w-4 h-4 animate-spin" />
                <span className="text-sm">Running...</span>
              </div>
            )}
            
            {!isRunning && output.length > 0 && (
              <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Completed</span>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-800 dark:text-red-200 font-medium">Error</span>
            </div>
            <p className="mt-2 text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Output Display */}
        <div
          ref={outputRef}
          className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm output-scrollbar"
        >
          {output.length === 0 && !isRunning && !error && (
            <div className="text-gray-500 dark:text-gray-400 text-center py-8">
              <Terminal className="w-8 h-8 mx-auto mb-2" />
              <p>No output yet. Start an analysis to see results here.</p>
            </div>
          )}

          {output.map((line, index) => renderLine(line, index))}

          {isRunning && (
            <div className="flex items-center space-x-2 text-yellow-500">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              <span>Processing...</span>
            </div>
          )}
        </div>

        {/* Output Stats */}
        {output.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-4">
              <span>{output.length} lines of output</span>
              <span>•</span>
              <span>{new Date().toLocaleTimeString()}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Real-time streaming</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}