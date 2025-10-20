'use client'

import { useSession } from 'next-auth/react'
import { useState } from 'react'

export default function TestPage() {
  const { data: session, status } = useSession()
  const [dbUsers, setDbUsers] = useState<any[]>([])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/debug/users')
      const data = await response.json()
      setDbUsers(data.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const clearSessions = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
      alert('Sessions cleared!')
    } catch (error) {
      console.error('Error clearing sessions:', error)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Test & Debug Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Session Info</h2>
          <p><strong>Status:</strong> {status}</p>
          <p><strong>Email:</strong> {session?.user?.email || 'Not signed in'}</p>
          <p><strong>Name:</strong> {session?.user?.name || 'N/A'}</p>
          <p><strong>Image:</strong> {session?.user?.image ? 'Yes' : 'No'}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Database Info</h2>
          <p><strong>Users in DB:</strong> {dbUsers.length}</p>
          <div className="space-y-2 mt-4">
            <button
              onClick={fetchUsers}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Fetch Users
            </button>
            <button
              onClick={clearSessions}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 ml-2"
            >
              Clear Sessions
            </button>
          </div>
        </div>
      </div>

      {dbUsers.length > 0 && (
        <div className="mt-6 bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Database Users</h3>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(dbUsers, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
