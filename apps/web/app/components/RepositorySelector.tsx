'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Search, GitBranch, ExternalLink, Star } from 'lucide-react'

interface Repository {
  id: number
  name: string
  full_name: string
  html_url: string
  description: string | null
  language: string | null
  stargazers_count: number
  updated_at: string
}

interface RepositorySelectorProps {
  selectedRepo: string
  onRepoSelect: (repo: string) => void
}

export default function RepositorySelector({ selectedRepo, onRepoSelect }: RepositorySelectorProps) {
  const { getToken } = useAuth()
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [customRepo, setCustomRepo] = useState('')

  useEffect(() => {
    fetchRepositories()
  }, [])

  const fetchRepositories = async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const response = await fetch('http://localhost:3001/api/github', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        // This would need to be adapted based on your actual API response structure
        setRepositories(data.repositories || [])
      }
    } catch (error) {
      console.error('Error fetching repositories:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredRepos = repositories.filter(repo =>
    repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    repo.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCustomRepoSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (customRepo.trim()) {
      onRepoSelect(customRepo.trim())
    }
  }

  return (
    <div className="bg-[#1a1a1a] border border-gray-700 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <GitBranch className="w-5 h-5 mr-2 text-blue-400" />
        Select Repository
      </h3>

      {/* Custom Repository URL Input */}
      <form onSubmit={handleCustomRepoSubmit} className="mb-4">
        <div className="flex space-x-2">
          <input
            type="url"
            value={customRepo}
            onChange={(e) => setCustomRepo(e.target.value)}
            placeholder="Enter GitHub repository URL..."
            className="flex-1 bg-[#0f0f0f] border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Use URL
          </button>
        </div>
      </form>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search your repositories..."
          className="w-full bg-[#0f0f0f] border border-gray-600 rounded-lg pl-10 pr-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Repository List */}
      <div className="max-h-64 overflow-y-auto space-y-2">
        {loading ? (
          <div className="text-center py-4 text-gray-400">Loading repositories...</div>
        ) : filteredRepos.length > 0 ? (
          filteredRepos.map((repo) => (
            <div
              key={repo.id}
              onClick={() => onRepoSelect(repo.html_url)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedRepo === repo.html_url
                  ? 'bg-blue-600/20 border-blue-500'
                  : 'bg-[#0f0f0f] border-gray-600 hover:border-gray-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-white">{repo.name}</h4>
                    <ExternalLink className="w-3 h-3 text-gray-400" />
                  </div>
                  {repo.description && (
                    <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                      {repo.description}
                    </p>
                  )}
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    {repo.language && (
                      <span className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full" />
                        <span>{repo.language}</span>
                      </span>
                    )}
                    <span className="flex items-center space-x-1">
                      <Star className="w-3 h-3" />
                      <span>{repo.stargazers_count}</span>
                    </span>
                    <span>
                      Updated {new Date(repo.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-gray-400">
            {searchTerm ? 'No repositories found' : 'No repositories available'}
          </div>
        )}
      </div>
    </div>
  )
} 