'use client'
import { useAuth, useUser } from '@clerk/nextjs'
import MainWebsite from './components/websiteComp/mainWebsite';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Brain, Github, User } from 'lucide-react';

interface GitHubInstallation {
  _id: string;
  installationId: number;
  account: {
    login: string;
    id: number;
    avatarUrl: string;
  };
  installedAt: string;
}

export default function Home() {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [installations, setInstallations] = useState<GitHubInstallation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiUser, setApiUser] = useState<any | null>(null);

  useEffect(() => {
    const fetchUserFromApi = async () => {
      if (isSignedIn) {
        try {
          const token = await getToken();
          const response = await fetch('http://localhost:3001/api/user', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error('Failed to fetch user data from your API');
          }

          const data = await response.json();
          setApiUser(data.data);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'An error occurred');
          console.error('Error fetching user from API:', err);
        }
      }
    };

    fetchUserFromApi();
  }, [isSignedIn, getToken]);

  const fetchInstallations = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Fetching installations...")
      const token = await getToken();
      console.log("Token:", token)
      const response = await fetch('http://localhost:3001/api/github', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch installations');
      }
      
      const data = await response.json();
      setInstallations(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching installations:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isSignedIn || !user) return <MainWebsite />
  console.log(isSignedIn, "isSignedIn", user)

  // Extract fields for database saving
  const fieldsForDB = {
    id: user.id,
    email: user.primaryEmailAddress?.emailAddress,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username || user.externalAccounts?.[0]?.username,
    imageUrl: user.imageUrl,
    providerAccounts: user.externalAccounts?.map(acc => acc.provider),
  }

  return (
    <div className="p-6 space-y-8">
      {/* Navigation Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">👋 Welcome, {user.firstName}!</h1>
        <div className="flex space-x-4">
          <Link
            href="/analysis"
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Brain className="w-4 h-4" />
            <span>Code Analysis</span>
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link
          href="/analysis"
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Brain className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Code Analysis</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Analyze repositories with AI</p>
            </div>
          </div>
        </Link>

        <button
          onClick={fetchInstallations}
          disabled={loading}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow text-left"
        >
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Github className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">GitHub Installations</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {loading ? 'Loading...' : 'Manage GitHub integrations'}
              </p>
            </div>
          </div>
        </button>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <User className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">User Profile</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">View account information</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {installations.length > 0 && (
        <div className="bg-white shadow-md rounded-xl p-6 border">
          <h2 className="text-xl font-semibold mb-4">GitHub Installations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {installations.map((installation) => (
              <div key={installation._id} className="border p-4 rounded-lg">
                <div className="flex items-center space-x-3">
                  <img
                    src={installation.account.avatarUrl}
                    alt={installation.account.login}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <p className="font-medium">{installation.account.login}</p>
                    <p className="text-sm text-gray-500">
                      Installed on: {new Date(installation.installedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {apiUser && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <h2 className="text-lg font-bold text-indigo-800 mb-2">👤 User Data from API</h2>
          <pre className="text-xs bg-gray-100 rounded-lg p-2 overflow-x-auto">
            {JSON.stringify(apiUser, null, 2)}
          </pre>
        </div>
      )}

      {/* Basic Info Card */}
      <div className="bg-white shadow-md rounded-xl p-6 border">
        <div className="flex items-center space-x-4">
          <img
            src={user.imageUrl}
            alt="Profile"
            width={64}
            height={64}
            className="w-16 h-16 rounded-full border"
          />
          <div>
            <p className="text-lg font-semibold">{user.fullName}</p>
            <p className="text-sm text-gray-500">{user.primaryEmailAddress?.emailAddress}</p>
            <p className="text-sm text-gray-500">
              Auth Providers: {fieldsForDB.providerAccounts.join(', ')}
            </p>
          </div>
        </div>
      </div>

      {/* Fields to Save in Database */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <h2 className="text-lg font-bold text-green-800 mb-2">🗄️ Data to Save in DB</h2>
        <ul className="text-sm text-gray-800 space-y-1">
          {Object.entries(fieldsForDB).map(([key, value]) => (
            <li key={key}>
              <strong className="capitalize">{key}:</strong>{' '}
              {Array.isArray(value) ? value.join(', ') : value || 'null'}
            </li>
          ))}
        </ul>
      </div>

      {/* Full User Metadata (Expandable/Raw JSON) */}
      <div className="bg-gray-50 border rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-2">🔍 Full Clerk User Object</h2>
        <pre className="text-xs bg-gray-100 rounded-lg p-2 overflow-x-auto">
          {JSON.stringify(user, null, 2)}
        </pre>
      </div>
    </div>
  )
}
