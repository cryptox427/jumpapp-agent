'use client'

import { useSession, signOut, getSession } from 'next-auth/react'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { SignInButton } from '@/components/auth/SignInButton'
import { ConnectionStatus } from '@/components/ConnectionStatus'
import { EmailImport } from '@/components/EmailImport'

export default function Home() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to JumpApp</h1>
            <p className="text-gray-600 mb-6">
              Your AI assistant for managing meetings, emails, and client relationships.
            </p>
            <SignInButton />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto h-screen flex flex-col">
        {/* Header with user info and sign out */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {session.user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{session.user?.name}</p>
              <p className="text-xs text-gray-500">{session.user?.email}</p>
            </div>
          </div>
          <button
            onClick={async () => {
              await signOut({ callbackUrl: '/' })
              // Force refresh the session to clear any cached state
              await getSession()
              // Force a hard refresh to clear any cached session state
              window.location.href = '/'
            }}
            className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
          >
            Sign Out
          </button>
        </div>
        
        <ConnectionStatus />
        <div className="p-4">
          <EmailImport />
        </div>
        <div className="flex-1">
          <ChatInterface />
        </div>
      </div>
    </div>
  )
}