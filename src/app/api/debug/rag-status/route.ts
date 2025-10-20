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
      include: {
        googleTokens: true,
        hubspotTokens: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check what data exists for this user
    const [emailCount, contactCount, noteCount] = await Promise.all([
      prisma.emailData.count({ where: { userId: user.id } }),
      prisma.hubspotContact.count({ where: { userId: user.id } }),
      prisma.hubspotNote.count({ where: { userId: user.id } })
    ])

    // Check if tokens exist
    const hasGoogleTokens = !!user.googleTokens
    const hasHubspotTokens = !!user.hubspotTokens

    // Get sample data if it exists
    const sampleEmails = await prisma.emailData.findMany({
      where: { userId: user.id },
      take: 3,
      orderBy: { date: 'desc' },
      select: {
        subject: true,
        sender: true,
        date: true,
        embedding: true
      }
    })

    const sampleContacts = await prisma.hubspotContact.findMany({
      where: { userId: user.id },
      take: 3,
      select: {
        firstName: true,
        lastName: true,
        email: true,
        company: true,
        embedding: true
      }
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        hasGoogleTokens,
        hasHubspotTokens
      },
      dataCounts: {
        emails: emailCount,
        contacts: contactCount,
        notes: noteCount
      },
      sampleData: {
        emails: sampleEmails,
        contacts: sampleContacts
      },
      recommendations: {
        needsImport: contactCount === 0 && noteCount === 0,
        needsGoogleAuth: !hasGoogleTokens,
        needsHubspotAuth: !hasHubspotTokens,
        nextSteps: contactCount === 0 ? 
          'Run data import first: POST /api/import/rag with {"type": "all"}' :
          'Data is available for RAG search'
      }
    })

  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json(
      { error: 'Debug failed', details: (error as Error)?.message ?? String(error) },
      { status: 500 }
    )
  }
}
