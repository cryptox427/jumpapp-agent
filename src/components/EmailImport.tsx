'use client'

import { useState } from 'react'

export function EmailImport() {
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)

  const handleImport = async () => {
    setIsImporting(true)
    setImportResult(null)

    try {
      const response = await fetch('/api/import/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ maxResults: 50 }),
      })

      const result = await response.json()

      if (result.success) {
        setImportResult(`✅ ${result.message}`)
      } else {
        let errorMessage = result.error || 'Unknown error'
        
        // Handle specific Gmail API errors
        if (errorMessage.includes('Gmail API has not been used')) {
          errorMessage = 'Gmail API is not enabled. Please enable it in Google Cloud Console.'
        } else if (errorMessage.includes('403')) {
          errorMessage = 'Permission denied. Please check your Gmail API settings.'
        }
        
        setImportResult(`❌ Error: ${errorMessage}`)
      }
    } catch (error) {
      setImportResult(`❌ Error: ${(error as Error)?.message ?? String(error)}`)
    } finally {
      setIsImporting(false)
    }
  }

  const handleImportSampleEmails = async () => {
    setIsImporting(true)
    setImportResult('Importing sample emails...')

    try {
      const response = await fetch('/api/import/sample-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (result.success) {
        setImportResult(`✅ ${result.message}`)
      } else {
        setImportResult(`❌ Error: ${result.error}`)
      }
    } catch (error) {
      setImportResult(`❌ Error: ${(error as Error)?.message ?? String(error)}`)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-4">
      <h3 className="text-lg font-semibold mb-3">📧 Import Gmail Emails</h3>
      <p className="text-gray-600 mb-4">
        Import your recent Gmail emails so the AI can search through them and provide insights.
      </p>
      
      <div className="flex gap-3">
        <button
          onClick={handleImport}
          disabled={isImporting}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
        >
          {isImporting ? 'Importing...' : 'Import Recent Emails'}
        </button>
        
        <button
          onClick={handleImportSampleEmails}
          disabled={isImporting}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
        >
          {isImporting ? 'Importing...' : 'Import Sample Emails (Test)'}
        </button>
      </div>

      {importResult && (
        <div className="mt-3 p-3 bg-gray-100 rounded">
          {importResult}
        </div>
      )}
    </div>
  )
}
