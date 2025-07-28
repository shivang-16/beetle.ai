'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Play, Square, GitBranch, Brain, Terminal, Code, Shield, Zap, Settings, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkGfm from 'remark-gfm'
import RepositorySelector from '../components/RepositorySelector'

interface StreamEvent {
  type: string
  message: string
  data?: any
}

export default function AnalysisPage() {
  const { getToken } = useAuth()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [streamOutput, setStreamOutput] = useState<string[]>([])
  const [currentStep, setCurrentStep] = useState<string>('')
  const [progress, setProgress] = useState(0)
  const [analysis, setAnalysis] = useState<any>(null)
  const [selectedRepo, setSelectedRepo] = useState('https://github.com/shivang-16/Infinity_Social_Media.api')
  const [customPrompt, setCustomPrompt] = useState('Analyze this codebase for security vulnerabilities and code quality')
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash')
  const [showSettings, setShowSettings] = useState(false)
  const outputRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [streamOutput])

  const startAnalysis = async () => {
    if (isAnalyzing) {
      // Stop analysis
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      setIsAnalyzing(false)
      return
    }

    setIsAnalyzing(true)
    setStreamOutput([])
    setCurrentStep('Initializing...')
    setProgress(0)
    setAnalysis(null)

    try {
      const token = await getToken()
      abortControllerRef.current = new AbortController()

      const response = await fetch('http://localhost:3001/api/analysis/execute', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          repoUrl: selectedRepo,
          model: selectedModel,
          prompt: customPrompt
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error('Failed to start analysis')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.trim()) {
            setStreamOutput(prev => [...prev, line])
            
            // Parse special markers for progress
            if (line.includes('🔄 Executing command:')) {
              setCurrentStep('Running Analysis...')
              setProgress(20)
            } else if (line.includes('Starting real-time analysis streaming')) {
              setCurrentStep('Initializing CodeDetector AI...')
              setProgress(40)
            } else if (line.includes('Cloning repository')) {
              setCurrentStep('Cloning Repository...')
              setProgress(60)
            } else if (line.includes('Analysis completed')) {
              setCurrentStep('Analysis Complete!')
              setProgress(100)
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setStreamOutput(prev => [...prev, '⚠️ Analysis stopped by user'])
        setCurrentStep('Stopped')
      } else {
        setStreamOutput(prev => [...prev, `❌ Error: ${error.message}`])
        setCurrentStep('Error')
      }
    } finally {
      setIsAnalyzing(false)
      abortControllerRef.current = null
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-[#1a1a1a] sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Brain className="w-6 h-6 text-blue-400" />
              <h1 className="text-xl font-semibold">CodeDetector AI</h1>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <GitBranch className="w-4 h-4" />
              <span className="max-w-96 truncate">
                {selectedRepo.replace('https://github.com/', '')}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
            
            <button
              onClick={startAnalysis}
              disabled={!selectedRepo}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isAnalyzing 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-600 disabled:cursor-not-allowed'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Square className="w-4 h-4" />
                  <span>Stop Analysis</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Start Analysis</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {isAnalyzing && (
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
              <span>{currentStep}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="border-t border-gray-700 p-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  AI Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-[#0f0f0f] border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Analysis Focus
                </label>
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Enter custom analysis prompt..."
                  className="w-full bg-[#0f0f0f] border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-120px)]">
        {/* Left Panel - Repository Selection & Analysis Overview */}
        <div className="w-96 border-r border-gray-800 bg-[#1a1a1a] overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* Repository Selector */}
            <RepositorySelector
              selectedRepo={selectedRepo}
              onRepoSelect={setSelectedRepo}
            />

            {/* Analysis Overview */}
            <div className="bg-[#0f0f0f] rounded-lg p-4 border border-gray-700">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-green-400" />
                Analysis Configuration
              </h2>
              
              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-400">
                  <Brain className="w-4 h-4 mr-2" />
                  <span className="font-mono">{selectedModel}</span>
                </div>
                
                <div className="text-sm text-gray-300">
                  <div className="text-gray-400 mb-1">Focus:</div>
                  <div className="text-xs bg-gray-800 rounded p-2 font-mono">
                    {customPrompt}
                  </div>
                </div>
              </div>
            </div>

            {/* Analysis Stats */}
            {analysis && (
              <div className="bg-[#0f0f0f] rounded-lg p-4 border border-gray-700">
                <h3 className="text-md font-semibold mb-3">Results Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Findings</span>
                    <span className="text-red-400">12</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Risk Score</span>
                    <span className="text-yellow-400">7.2/10</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Files Scanned</span>
                    <span className="text-blue-400">47</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Terminal Output */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between p-3 bg-[#1a1a1a] border-b border-gray-800">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">Analysis Output</span>
            </div>
            {isAnalyzing && (
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Streaming...</span>
              </div>
            )}
          </div>

          <div 
            ref={outputRef}
            className="flex-1 bg-[#0f0f0f] p-4 overflow-y-auto font-mono text-sm dark-scrollbar"
          >
            {streamOutput.length === 0 && !isAnalyzing ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Terminal className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg mb-2">Ready to analyze</p>
                <p className="text-sm text-center">
                  Select a repository and click "Start Analysis" to begin<br />
                  intelligent code analysis with AI
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {streamOutput.map((line, index) => (
                  <AnalysisLine key={index} content={line} />
                ))}
                {isAnalyzing && (
                  <div className="flex items-center space-x-2 text-gray-400 mt-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                    <span>Analyzing...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Component for rendering individual analysis lines
function AnalysisLine({ content }: { content: string }) {
  const isCommand = content.includes('🔄 Executing command:')
  const isError = content.includes('❌') || content.includes('[STDERR]')
  const isSuccess = content.includes('✅') || content.includes('🎉')
  const isWarning = content.includes('⚠️')
  const isCode = content.includes('```')
  
  let className = 'text-gray-300'
  
  if (isError) className = 'text-red-400'
  else if (isSuccess) className = 'text-green-400'
  else if (isWarning) className = 'text-yellow-400'
  else if (isCommand) className = 'text-blue-400 font-semibold'
  
  // Handle code blocks
  if (isCode) {
    return (
      <div className="bg-gray-900 rounded p-2 my-2 border border-gray-700">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({node, inline, className, children, ...props}) {
              const match = /language-(\w+)/.exec(className || '')
              return !inline && match ? (
                <SyntaxHighlighter
                  style={vscDarkPlus}
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
              )
            }
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    )
  }
  
  return (
    <div className={`whitespace-pre-wrap leading-relaxed ${className}`}>
      {content}
    </div>
  )
} 