'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface ConnectionStatusProps {}

export function ConnectionStatus({}: ConnectionStatusProps) {
  const { data: session } = useSession()
  const [connections, setConnections] = useState({
    google: false,
    hubspot: false,
  })

  useEffect(() => {
    // Check connection status
    if (session?.accessToken) {
      setConnections(prev => ({ ...prev, google: true }))
    } else {
      setConnections(prev => ({ ...prev, google: false }))
    }
    
    // Check HubSpot connection
    fetch('/api/connections/hubspot/status')
      .then(res => res.json())
      .then(data => {
        setConnections(prev => ({ ...prev, hubspot: data.connected }))
      })
      .catch(() => {
        setConnections(prev => ({ ...prev, hubspot: false }))
      })
  }, [session])

  if (!session) return null

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {connections.google ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
            <span className="text-sm font-medium">Google</span>
          </div>
          
          <div className="flex items-center gap-2">
            {connections.hubspot ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-yellow-500" />
            )}
            <span className="text-sm font-medium">HubSpot</span>
            {!connections.hubspot && (
              <a
                href="/api/connections/hubspot/connect"
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Connect
              </a>
            )}
          </div>
        </div>
        
        <div className="text-xs text-gray-500">
          {session.user?.email}
        </div>
      </div>
    </div>
  )
}
