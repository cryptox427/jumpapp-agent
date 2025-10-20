import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { pollingService } from '@/lib/polling'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, interval } = await request.json()

    switch (action) {
      case 'start':
        pollingService.start(interval || 60000)
        return NextResponse.json({ success: true, message: 'Polling service started' })
      
      case 'stop':
        pollingService.stop()
        return NextResponse.json({ success: true, message: 'Polling service stopped' })
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Polling API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    return NextResponse.json({ 
      status: 'Polling service status endpoint',
      note: 'Use POST to start/stop the service'
    })
  } catch (error) {
    console.error('Polling API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
