import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID!
const HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET!

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code) {
      // Initiate OAuth flow
      const redirectUri = new URL('/api/connections/hubspot/connect', request.url).toString()
      const authUrl = new URL('https://app.hubspot.com/oauth/authorize')
      
      authUrl.searchParams.set('client_id', HUBSPOT_CLIENT_ID)
      authUrl.searchParams.set('redirect_uri', redirectUri)
      authUrl.searchParams.set('scope', 'crm.objects.contacts.read crm.objects.contacts.write')
      authUrl.searchParams.set('state', session.user.email)

      return NextResponse.redirect(authUrl.toString())
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: HUBSPOT_CLIENT_ID,
        client_secret: HUBSPOT_CLIENT_SECRET,
        redirect_uri: new URL('/api/connections/hubspot/connect', request.url).toString(),
        code,
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for tokens')
    }

    const tokens = await tokenResponse.json()

    // Get user from database
    const { prisma } = await import('@/lib/prisma')
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Save HubSpot tokens
    await prisma.hubspotTokens.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        scope: tokens.scope || '',
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        scope: tokens.scope || '',
      },
    })

    return NextResponse.redirect(new URL('/?connected=hubspot', request.url))

  } catch (error) {
    console.error('HubSpot connection error:', error)
    return NextResponse.redirect(new URL('/?error=hubspot_connection', request.url))
  }
}
