'use client'
import { useAuth, useUser } from '@clerk/nextjs'
import { useState, useEffect } from 'react';

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

  console.log(isSignedIn, "isSignedIn", user)

  // if (!isSignedIn) {
  //   if (typeof window !== 'undefined') {
  //     window.location.href = '/login';
  //   } 
  //   return null; 
  // }

  if (!user) {
    return <div>Loading user...</div>
  }

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
    <div className="min-h-screen bg-gray-50">
      {/* Tailwind Test Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 text-center">
        <p className="text-lg font-semibold">🎉 Tailwind CSS is working! Design system ready.</p>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">👋 Welcome, {user.firstName}!</h1>
          <button
            onClick={fetchInstallations}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium px-6 py-3 rounded-lg transition-colors shadow-lg"
          >
            {loading ? 'Loading...' : 'List GitHub Installations'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 text-red-800 px-4 py-3 rounded-lg">
            <p className="font-medium">Error</p>
            <p>{error}</p>
          </div>
        )}

        {installations.length > 0 && (
          <div className="bg-white shadow-xl rounded-xl p-6 border border-gray-200">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">GitHub Installations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {installations.map((installation) => (
                <div key={installation._id} className="border border-gray-200 p-6 rounded-xl hover:shadow-lg transition-shadow">
                  <div className="flex items-center space-x-4">
                    <img
                      src={installation.account.avatarUrl}
                      alt={installation.account.login}
                      className="w-12 h-12 rounded-full ring-2 ring-gray-200"
                    />
                    <div>
                      <p className="font-semibold text-gray-900">{installation.account.login}</p>
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
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
            <h2 className="text-xl font-bold text-indigo-900 mb-4">👤 User Data from API</h2>
            <pre className="text-sm bg-white rounded-lg p-4 overflow-x-auto border">
              {JSON.stringify(apiUser, null, 2)}
            </pre>
          </div>
        )}

        {/* Basic Info Card */}
        <div className="bg-white shadow-xl rounded-xl p-6 border border-gray-200">
          <div className="flex items-center space-x-6">
            <img
              src={user.imageUrl}
              alt="Profile"
              width={80}
              height={80}
              className="w-20 h-20 rounded-full border-4 border-gray-200"
            />
            <div>
              <p className="text-2xl font-bold text-gray-900">{user.fullName}</p>
              <p className="text-gray-600">{user.primaryEmailAddress?.emailAddress}</p>
              <p className="text-sm text-gray-500 mt-1">
                Auth Providers: {fieldsForDB.providerAccounts.join(', ')}
              </p>
            </div>
          </div>
        </div>

        {/* Fields to Save in Database */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <h2 className="text-xl font-bold text-green-800 mb-4">🗄️ Data to Save in DB</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(fieldsForDB).map(([key, value]) => (
              <div key={key} className="bg-white rounded-lg p-3 border">
                <strong className="capitalize text-gray-700">{key}:</strong>{' '}
                <span className="text-gray-900">
                  {Array.isArray(value) ? value.join(', ') : value || 'null'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Full User Metadata (Expandable/Raw JSON) */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900">🔍 Full Clerk User Object</h2>
          <pre className="text-xs bg-white rounded-lg p-4 overflow-x-auto border max-h-96">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}
