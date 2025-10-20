'use client'

import { Avatar } from './Avatar'
import { MeetingCard } from './MeetingCard'

interface MessageProps {
  message: {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: Date
    metadata?: {
      meetings?: any[]
      contacts?: any[]
      type?: 'meeting_response' | 'contact_query' | 'general'
    }
  }
}

export function Message({ message }: MessageProps) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[80%] bg-gray-100 rounded-2xl px-4 py-3">
          <p className="text-gray-900 text-sm leading-relaxed">{message.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start mb-4">
      <div className="flex items-start gap-3 max-w-[80%]">
        <Avatar 
          name="AI Assistant" 
          src="/ai-avatar.png" 
          size="sm"
        />
        <div className="flex-1">
          <p className="text-gray-900 text-sm leading-relaxed mb-3">{message.content}</p>
          
          {/* Render meeting cards if present */}
          {message.metadata?.meetings && message.metadata.meetings.length > 0 && (
            <div className="space-y-3">
              {message.metadata.meetings.map((meeting, index) => (
                <MeetingCard key={index} meeting={meeting} />
              ))}
            </div>
          )}
          
          {/* Render contact tags if present */}
          {message.metadata?.contacts && message.metadata.contacts.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {message.metadata.contacts.map((contact, index) => (
                <div key={index} className="flex items-center gap-2 bg-blue-50 rounded-full px-3 py-1">
                  <Avatar 
                    name={contact.name} 
                    src={contact.avatar} 
                    size="xs"
                  />
                  <span className="text-sm text-blue-700">{contact.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
