'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Check, X } from 'lucide-react'

interface Instruction {
  id: string
  title: string
  instruction: string
  isActive: boolean
  createdAt: Date
}

interface InstructionsManagerProps {
  onClose?: () => void
}

export function InstructionsManager({ onClose }: InstructionsManagerProps) {
  const [instructions, setInstructions] = useState<Instruction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newInstruction, setNewInstruction] = useState({ title: '', instruction: '' })

  useEffect(() => {
    fetchInstructions()
  }, [])

  const fetchInstructions = async () => {
    try {
      const response = await fetch('/api/instructions')
      const data = await response.json()
      setInstructions(data.instructions || [])
    } catch (error) {
      console.error('Error fetching instructions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addInstruction = async () => {
    if (!newInstruction.title || !newInstruction.instruction) return

    try {
      const response = await fetch('/api/instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInstruction),
      })

      if (response.ok) {
        setNewInstruction({ title: '', instruction: '' })
        setIsAdding(false)
        fetchInstructions()
      }
    } catch (error) {
      console.error('Error adding instruction:', error)
    }
  }

  const updateInstruction = async (id: string, updates: Partial<Instruction>) => {
    try {
      const response = await fetch('/api/instructions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      })

      if (response.ok) {
        setEditingId(null)
        fetchInstructions()
      }
    } catch (error) {
      console.error('Error updating instruction:', error)
    }
  }

  const deleteInstruction = async (id: string) => {
    if (!confirm('Are you sure you want to delete this instruction?')) return

    try {
      const response = await fetch(`/api/instructions?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchInstructions()
      }
    } catch (error) {
      console.error('Error deleting instruction:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Ongoing Instructions</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Instruction
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {isAdding && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Instruction title"
              value={newInstruction.title}
              onChange={(e) => setNewInstruction(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              placeholder="Describe what the AI should do..."
              value={newInstruction.instruction}
              onChange={(e) => setNewInstruction(prev => ({ ...prev, instruction: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={addInstruction}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={() => {
                  setIsAdding(false)
                  setNewInstruction({ title: '', instruction: '' })
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {instructions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No ongoing instructions yet. Add one to get started!
          </div>
        ) : (
          instructions.map((instruction) => (
            <div key={instruction.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900">{instruction.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      instruction.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {instruction.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {editingId === instruction.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        defaultValue={instruction.title}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <textarea
                        defaultValue={instruction.instruction}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-700">{instruction.instruction}</p>
                  )}
                </div>
                <div className="flex gap-1 ml-4">
                  <button
                    onClick={() => setEditingId(instruction.id)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => updateInstruction(instruction.id, { isActive: !instruction.isActive })}
                    className={`p-2 ${
                      instruction.isActive 
                        ? 'text-green-600 hover:text-green-700' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteInstruction(instruction.id)}
                    className="p-2 text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
