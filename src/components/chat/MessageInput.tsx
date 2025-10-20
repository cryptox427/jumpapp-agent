'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { Send, Plus, ChevronDown, Mic } from 'lucide-react'

interface MessageInputProps {
  onSendMessage: (message: string, attachments?: File[]) => void
  disabled?: boolean
}

export function MessageInput({ onSendMessage, disabled }: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [contextFilter, setContextFilter] = useState('All meetings')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [attachments, setAttachments] = useState<File[]>([])

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim(), attachments.length > 0 ? attachments : undefined)
      setMessage('')
      setAttachments([])
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
    }
  }

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input is not supported in this browser')
      return
    }

    setIsRecording(true)
    
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    const recognition = new SpeechRecognition()
    
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setMessage(transcript)
      setIsRecording(false)
    }
    
    recognition.onerror = () => {
      setIsRecording(false)
    }
    
    recognition.onend = () => {
      setIsRecording(false)
    }
    
    recognition.start()
  }

  const contextOptions = [
    'All meetings',
    'This week',
    'This month',
    'With specific contacts',
    'Recent emails'
  ]

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value)
                handleInput()
              }}
              onKeyPress={handleKeyPress}
              placeholder="Ask anything about your meetings..."
              disabled={disabled}
              className="w-full resize-none border border-gray-300 rounded-2xl px-4 py-3 pr-12 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-32 bg-gray-50"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!message.trim() || disabled}
              className="absolute right-3 bottom-3 p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-3">
          <button 
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            title="Add attachment"
          >
            <Plus className="w-4 h-4 text-gray-600" />
          </button>
          
          <div className="relative">
            <select
              value={contextFilter}
              onChange={(e) => setContextFilter(e.target.value)}
              className="appearance-none bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {contextOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
          </div>
          
          <div className="flex items-center gap-2">
            <button
              className="w-8 h-8 rounded-full border-2 border-red-300 hover:border-red-400 flex items-center justify-center transition-colors"
              title="Integration 1"
            >
              <div className="w-4 h-4 bg-red-400 rounded-full"></div>
            </button>
            
            <button
              className="w-8 h-8 rounded-full border-2 border-blue-300 hover:border-blue-400 flex items-center justify-center transition-colors"
              title="Integration 2"
            >
              <div className="w-4 h-4 bg-blue-400 rounded-full"></div>
            </button>
          </div>
        </div>
        
        <button
          onClick={handleVoiceInput}
          disabled={disabled || isRecording}
          className={`w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors ${
            isRecording ? 'bg-red-100 hover:bg-red-200' : ''
          }`}
          title="Voice input"
        >
          <Mic className={`w-4 h-4 ${isRecording ? 'text-red-600' : 'text-gray-600'}`} />
        </button>
      </div>
    </div>
  )
}
