import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DataImportService } from '@/lib/data-import'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type, maxEmails } = await request.json()

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

    // Initialize data import service with RAG capabilities
    const importService = new DataImportService(
      user.id,
      user.googleTokens ? {
        accessToken: user.googleTokens.accessToken,
        refreshToken: user.googleTokens.refreshToken || undefined,
      } : undefined,
      {
        accessToken: user.hubspotTokens.accessToken,
      }
    )

    let results

    switch (type) {
      case 'emails':
        if (!user.googleTokens) {
          return NextResponse.json({ error: 'Google connection required for email import' }, { status: 400 })
        }
        results = await importService.importEmails(maxEmails || 100)
        break
      case 'contacts':
        results = await importService.importHubSpotContacts()
        break
      case 'notes':
        results = await importService.importHubSpotNotes()
        break
      case 'all':
        results = await importService.importAllData()
        break
      default:
        return NextResponse.json({ error: 'Invalid import type. Use: emails, contacts, notes, or all' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      type,
      results,
      message: `RAG-based import completed successfully. Data has been processed with embeddings for intelligent search.`
    })

  } catch (error) {
    console.error('RAG Import API error:', error)
    return NextResponse.json(
      { error: 'Import failed', details: error.message },
      { status: 500 }
    )
  }
}
