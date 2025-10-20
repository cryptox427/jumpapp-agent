import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AIService } from '@/lib/openai'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, useRAG = true } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        googleTokens: true,
        hubspotTokens: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.hubspotTokens) {
      return NextResponse.json(
        { error: 'HubSpot connection required' },
        { status: 400 }
      )
    }

    // Initialize AI service with RAG capabilities
    const aiService = new AIService(
      user.id,
      user.googleTokens ? {
        accessToken: user.googleTokens.accessToken,
        refreshToken: user.googleTokens.refreshToken || undefined,
      } : undefined,
      {
        accessToken: user.hubspotTokens.accessToken,
      }
    )

    // Check if user has any data first
    const [emailCount, contactCount, noteCount] = await Promise.all([
      prisma.emailData.count({ where: { userId: user.id } }),
      prisma.hubspotContact.count({ where: { userId: user.id } }),
      prisma.hubspotNote.count({ where: { userId: user.id } })
    ])

    const totalDataCount = contactCount + noteCount // RAG focuses on HubSpot data

    // Get RAG context if enabled and data exists
    let ragContext = null
    if (useRAG && totalDataCount > 0) {
      try {
        ragContext = await aiService.getRAGContext(message, 10)
        console.log('🔍 RAG Context retrieved:', {
          emails: ragContext.emails?.length || 0,
          contacts: ragContext.contacts?.length || 0,
          notes: ragContext.notes?.length || 0
        })
      } catch (error) {
        console.error('Error getting RAG context:', error)
      }
    } else if (useRAG && totalDataCount === 0) {
      // No data available - provide helpful message
      return NextResponse.json({
        success: true,
        response: `I don't have any HubSpot data to search through yet. You need to import your HubSpot contacts and notes first.

To get started:
1. Make sure you're connected to HubSpot
2. Run the data import: POST /api/import/rag with {"type": "all"}

This will import your HubSpot contacts and notes with AI embeddings for intelligent search. Gmail emails can also be imported separately if you have Google OAuth connected.`,
        ragContext: {
          contactsFound: 0,
          notesFound: 0,
          summary: 'No data available - import required',
          dataCounts: {
            contacts: contactCount,
            notes: noteCount
          }
        }
      })
    }

    // Generate AI response with RAG context
    const messages = [
      { role: 'user', content: message }
    ]

    const response = await aiService.generateResponse(messages, ragContext)

    return NextResponse.json({
      success: true,
      response: response.content,
      ragContext: useRAG ? {
        contactsFound: ragContext?.contacts?.length || 0,
        notesFound: ragContext?.notes?.length || 0,
        summary: ragContext?.summary || 'No relevant context found'
      } : null
    })

  } catch (error) {
    console.error('RAG Chat API error:', error)
    return NextResponse.json(
      { error: 'Chat failed', details: error.message },
      { status: 500 }
    )
  }
}
