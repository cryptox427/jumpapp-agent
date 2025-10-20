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

    const { type } = await request.json()

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

    if (!user.googleTokens || !user.hubspotTokens) {
      return NextResponse.json(
        { error: 'Google and HubSpot connections required' },
        { status: 400 }
      )
    }

    // Initialize data import service
    const importService = new DataImportService(
      user.id,
      {
        accessToken: user.googleTokens.accessToken,
        refreshToken: user.googleTokens.refreshToken || undefined,
      },
      {
        accessToken: user.hubspotTokens.accessToken,
      }
    )

    let results

    switch (type) {
      case 'emails':
        results = await importService.importEmails()
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
        return NextResponse.json({ error: 'Invalid import type' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      type,
      results,
    })

  } catch (error) {
    console.error('Import API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
