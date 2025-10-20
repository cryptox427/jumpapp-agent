import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { google } from 'googleapis'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.accessToken) {
      return NextResponse.json({ 
        error: 'No Gmail access token found in session',
        sessionKeys: Object.keys(session)
      }, { status: 400 })
    }

    // Test Gmail API connection
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: session.accessToken })
    
    const gmail = google.gmail({ version: 'v1', auth })
    
    try {
      // Try to get user profile first (simpler API call)
      const profile = await gmail.users.getProfile({
        userId: 'me',
      })
      
      return NextResponse.json({
        success: true,
        message: 'Gmail API is working!',
        profile: {
          emailAddress: profile.data.emailAddress,
          messagesTotal: profile.data.messagesTotal,
          threadsTotal: profile.data.threadsTotal,
        }
      })
    } catch (apiError) {
      return NextResponse.json({
        success: false,
        error: 'Gmail API Error',
        details: apiError.message,
        code: apiError.code,
        status: apiError.status
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Gmail test error:', error)
    return NextResponse.json({ 
      error: 'Failed to test Gmail API',
      details: error.message 
    }, { status: 500 })
  }
}
