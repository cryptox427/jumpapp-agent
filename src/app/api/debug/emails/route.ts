import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get all emails for this user
    const emails = await prisma.emailData.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        messageId: true,
        subject: true,
        sender: true,
        date: true,
      },
      orderBy: { date: 'desc' },
      take: 10,
    })

    // Test search
    const searchResults = await prisma.emailData.findMany({
      where: {
        userId: user.id,
        OR: [
          { subject: { contains: 'crypto' } },
          { body: { contains: 'crypto' } },
          { sender: { contains: 'crypto' } },
        ],
      },
      select: {
        id: true,
        subject: true,
        sender: true,
      },
      take: 3,
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
      totalEmails: emails.length,
      recentEmails: emails,
      searchResults: {
        query: 'crypto',
        count: searchResults.length,
        results: searchResults,
      },
    })

  } catch (error) {
    console.error('Email debug error:', error)
    return NextResponse.json({ 
      error: 'Failed to debug emails',
      details: (error as Error)?.message ?? String(error)
    }, { status: 500 })
  }
}
