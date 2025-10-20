'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'

interface ChatHeaderProps {
  onNewThread?: () => void
  onClose?: () => void
}

export function ChatHeader({ onNewThread, onClose }: ChatHeaderProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat')

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-black">Ask Anything</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={onNewThread}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4 mr-1 inline" />
              New thread
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'chat'
                ? 'bg-gray-200 text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-gray-200 text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            History
          </button>
        </div>
      </div>
    </div>
  )
}
