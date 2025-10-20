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

    // Test email search
    const ragService = new RAGService(user.id)
    const searchResults = await ragService.searchEmails('crypto', 3)

    return NextResponse.json({
      success: true,
      query: 'crypto',
      results: searchResults,
      count: searchResults.length
    })

  } catch (error) {
    console.error('Email search test error:', error)
    return NextResponse.json({ 
      error: 'Failed to test email search',
      details: error.message 
    }, { status: 500 })
  }
}
