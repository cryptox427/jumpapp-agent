'use client'

import { signOut } from 'next-auth/react'
import { useEffect } from 'react'

export default function ClearAuthPage() {
  useEffect(() => {
    // Clear all NextAuth cookies
    const cookies = document.cookie.split(';')
    cookies.forEach(cookie => {
      const eqPos = cookie.indexOf('=')
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
      
      // Clear NextAuth cookies
      if (name.includes('next-auth') || name.includes('authjs')) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=localhost`
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.localhost`
      }
    })

    // Clear localStorage and sessionStorage
    localStorage.clear()
    sessionStorage.clear()

    // Sign out from NextAuth
    signOut({ redirect: false }).then(() => {
      alert('Authentication cleared! You can now try signing in again.')
      window.location.href = '/'
    })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Clearing Authentication...</h1>
        <p className="text-gray-600">Please wait...</p>
      </div>
    </div>
  )
}
