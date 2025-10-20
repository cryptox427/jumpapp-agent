import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { RAGService } from '@/lib/rag'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database
    const { prisma } = await import('@/lib/prisma')
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Test multiple search queries
    const ragService = new RAGService(user.id)
    
    const testQueries = [
      'financial planning',
      'investment',
      'meeting',
      'client',
      'planning'
    ]

    const results = {}
    
    for (const query of testQueries) {
      try {
        const searchResults = await ragService.searchEmails(query, 3)
        ;(results as Record<string, unknown>)[query] = {
          count: Array.isArray(searchResults) ? searchResults.length : 0,
          emails: Array.isArray(searchResults)
            ? searchResults.map((e: any) => ({
                subject: e.subject,
                sender: e.sender,
                bodyPreview: typeof e.body === 'string' ? e.body.substring(0, 100) + '...' : ''
              }))
            : []
        }
      } catch (error) {
        ;(results as Record<string, unknown>)[query] = { error: (error as Error)?.message ?? String(error) }
      }

    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
      searchResults: results,
    })

  } catch (error) {
    console.error('Test search error:', error)
    return NextResponse.json({ 
      error: 'Failed to test search',
      details: (error as Error)?.message ?? String(error)
    }, { status: 500 })
  }
}
