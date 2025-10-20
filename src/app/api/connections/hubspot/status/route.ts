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

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { hubspotTokens: true },
    })

    if (!user) {
      return NextResponse.json({ connected: false })
    }

    const isConnected = !!user.hubspotTokens && 
      user.hubspotTokens.expiresAt > new Date()

    return NextResponse.json({ connected: isConnected })

  } catch (error) {
    console.error('HubSpot status error:', error)
    return NextResponse.json({ connected: false })
  }
}
