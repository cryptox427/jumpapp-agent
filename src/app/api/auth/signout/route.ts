import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (session?.user?.email) {
      // Clear all sessions for this user from the database
      await prisma.session.deleteMany({
        where: {
          user: {
            email: session.user.email
          }
        }
      })
      
      console.log('Cleared all sessions for user:', session.user.email)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Signout API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
