'use client'

import { Avatar } from './Avatar'

interface MeetingCardProps {
  meeting: {
    id: string
    title: string
    date: string
    time: string
    attendees: Array<{
      name: string
      email: string
      avatar?: string
    }>
    description?: string
    location?: string
  }
}

export function MeetingCard({ meeting }: MeetingCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const day = date.getDate()
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
    return `${day} ${dayName}`
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium text-gray-600">
          {formatDate(meeting.date)}
        </div>
        <div className="text-sm text-gray-500">
          {meeting.time}
        </div>
      </div>
      
      <h3 className="font-semibold text-gray-900 mb-3">
        {meeting.title}
      </h3>
      
      {meeting.description && (
        <p className="text-sm text-gray-600 mb-3">
          {meeting.description}
        </p>
      )}
      
      {meeting.location && (
        <p className="text-sm text-gray-500 mb-3">
          📍 {meeting.location}
        </p>
      )}
      
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {meeting.attendees.slice(0, 5).map((attendee, index) => (
            <Avatar
              key={index}
              name={attendee.name}
              src={attendee.avatar}
              size="xs"
              className="border-2 border-white"
            />
          ))}
          {meeting.attendees.length > 5 && (
            <div className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center">
              <span className="text-xs text-gray-600">+{meeting.attendees.length - 5}</span>
            </div>
          )}
        </div>
        <span className="text-xs text-gray-500 ml-2">
          {meeting.attendees.length} attendee{meeting.attendees.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}
