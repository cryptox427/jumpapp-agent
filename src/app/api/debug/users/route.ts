import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    // Get all users from database
    const users = await prisma.user.findMany({
      include: {
        accounts: true,
        googleTokens: true,
        hubspotTokens: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ 
      users,
      session,
      totalUsers: users.length 
    })

  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
