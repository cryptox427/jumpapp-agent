'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

export default function DebugPage() {
  const { data: session, status } = useSession()
  const [dbUsers, setDbUsers] = useState<any[]>([])

  useEffect(() => {
    // Fetch users from database
    fetch('/api/debug/users')
      .then(res => res.json())
      .then(data => setDbUsers(data.users || []))
      .catch(err => console.error('Error fetching users:', err))
  }, [])

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Information</h1>
      
      <div className="space-y-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Session Status</h2>
          <p><strong>Status:</strong> {status}</p>
          <pre className="mt-2 p-2 bg-gray-100 rounded text-sm overflow-auto">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Database Users</h2>
          <p><strong>Count:</strong> {dbUsers.length}</p>
          <pre className="mt-2 p-2 bg-gray-100 rounded text-sm overflow-auto">
            {JSON.stringify(dbUsers, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Environment</h2>
          <ul className="text-sm space-y-1">
            <li><strong>NEXTAUTH_URL:</strong> {process.env.NEXT_PUBLIC_APP_URL}</li>
            <li><strong>Google Client ID:</strong> {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? 'Set' : 'Not set'}</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
