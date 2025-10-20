'use client'

import { useSearchParams } from 'next/navigation'

export default function AuthError() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h1>
          <p className="text-gray-600 mb-4">
            There was an error during authentication:
          </p>
          <p className="text-sm bg-gray-100 p-3 rounded mb-4">
            {error || 'Unknown error'}
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <p>Common solutions:</p>
            <ul className="text-left space-y-1">
              <li>• Check if your Google OAuth redirect URI is set to:</li>
              <li className="font-mono text-xs bg-gray-100 p-2 rounded">
                http://localhost:3000/api/auth/callback/google
              </li>
              <li>• Make sure your email is added as a test user</li>
              <li>• Verify your Google Client ID and Secret are correct</li>
            </ul>
          </div>
          <a 
            href="/"
            className="mt-6 inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Try Again
          </a>
        </div>
      </div>
    </div>
  )
}
