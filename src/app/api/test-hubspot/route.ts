import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID
    const HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET

    if (!HUBSPOT_CLIENT_ID) {
      return NextResponse.json({ 
        error: 'HUBSPOT_CLIENT_ID not found in environment variables' 
      }, { status: 400 })
    }

    if (!HUBSPOT_CLIENT_SECRET) {
      return NextResponse.json({ 
        error: 'HUBSPOT_CLIENT_SECRET not found in environment variables' 
      }, { status: 400 })
    }

    // Test the OAuth URL construction
    const redirectUri = 'http://localhost:3000/api/connections/hubspot/connect'
    const authUrl = new URL('https://app.hubspot.com/oauth/authorize')
    
    authUrl.searchParams.set('client_id', HUBSPOT_CLIENT_ID)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', 'crm.objects.contacts.read crm.objects.contacts.write')
    authUrl.searchParams.set('state', 'test-state')

    return NextResponse.json({
      success: true,
      clientId: HUBSPOT_CLIENT_ID.substring(0, 10) + '...', // Show only first 10 chars for security
      redirectUri,
      authUrl: authUrl.toString(),
      message: 'HubSpot credentials are configured correctly'
    })

  } catch (error) {
    console.error('HubSpot test error:', error)
    return NextResponse.json({ 
      error: 'Failed to test HubSpot configuration',
      details: error.message 
    }, { status: 500 })
  }
}
