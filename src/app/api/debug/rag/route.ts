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

    console.log('🔍 Debug RAG - User:', {
      id: user.id,
      email: user.email
    })

    // Test RAG service
    const ragService = new RAGService(user.id)
    const searchResults = await ragService.searchEmails('financial planning', 3)

    // Also test direct database query
    const directResults = await prisma.emailData.findMany({
      where: {
        userId: user.id,
        OR: [
          { subject: { contains: 'financial' } },
          { body: { contains: 'financial' } },
          { sender: { contains: 'financial' } },
        ],
      },
      select: {
        id: true,
        subject: true,
        sender: true,
        body: true,
      },
      take: 3,
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
      ragResults: {
        query: 'financial planning',
        count: searchResults.length,
        results: searchResults,
      },
      directResults: {
        query: 'financial',
        count: directResults.length,
        results: directResults,
      },
    })

  } catch (error) {
    console.error('RAG debug error:', error)
    return NextResponse.json({ 
      error: 'Failed to debug RAG',
      details: error.message 
    }, { status: 500 })
  }
}
