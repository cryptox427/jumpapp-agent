'use client'

import { useState } from 'react'

interface AvatarProps {
  name: string
  src?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg'
}

export function Avatar({ name, src, size = 'sm', className = '' }: AvatarProps) {
  const [imageError, setImageError] = useState(false)
  
  const initials = name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const handleImageError = () => {
    setImageError(true)
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center bg-gray-200 text-gray-600 font-medium ${className}`}>
      {src && !imageError ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full rounded-full object-cover"
          onError={handleImageError}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  )
}
