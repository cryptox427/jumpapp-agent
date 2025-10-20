'use client'

import { useState, useRef } from 'react'
import { Upload, File, X, Mic } from 'lucide-react'

interface FileAttachment {
  id: string
  file: File
  name: string
  size: number
  type: string
}

interface AttachmentInputProps {
  onAttachmentsChange: (attachments: FileAttachment[]) => void
  maxFiles?: number
  maxSize?: number // in MB
  acceptedTypes?: string[]
}

export function AttachmentInput({ 
  onAttachmentsChange, 
  maxFiles = 5, 
  maxSize = 10,
  acceptedTypes = ['image/*', 'application/pdf', 'text/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
}: AttachmentInputProps) {
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return

    const newAttachments: FileAttachment[] = []
    
    Array.from(files).forEach(file => {
      // Check file size
      if (file.size > maxSize * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is ${maxSize}MB.`)
        return
      }

      // Check file type
      const isAccepted = acceptedTypes.some(type => {
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.slice(0, -1))
        }
        return file.type === type
      })

      if (!isAccepted) {
        alert(`File type ${file.type} is not supported.`)
        return
      }

      // Check max files
      if (attachments.length + newAttachments.length >= maxFiles) {
        alert(`Maximum ${maxFiles} files allowed.`)
        return
      }

      const attachment: FileAttachment = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
      }

      newAttachments.push(attachment)
    })

    if (newAttachments.length > 0) {
      const updatedAttachments = [...attachments, ...newAttachments]
      setAttachments(updatedAttachments)
      onAttachmentsChange(updatedAttachments)
    }
  }

  const removeAttachment = (id: string) => {
    const updatedAttachments = attachments.filter(att => att.id !== id)
    setAttachments(updatedAttachments)
    onAttachmentsChange(updatedAttachments)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  return (
    <div className="space-y-3">
      {/* File Input */}
      <div
        className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
          isDragOver 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="text-center">
          <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 mb-2">
            Drag and drop files here, or{' '}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              browse
            </button>
          </p>
          <p className="text-xs text-gray-500">
            Max {maxFiles} files, {maxSize}MB each
          </p>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Attachments:</h4>
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
            >
              <div className="flex items-center space-x-3">
                <File className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {attachment.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(attachment.size)}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => removeAttachment(attachment.id)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
