import { NextRequest, NextResponse } from 'next/server'
import { AutomationService } from '@/lib/automation'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body

    // Get user ID from the webhook data or headers
    const userId = request.headers.get('x-user-id') || data?.userId
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Get user tokens
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        googleTokens: true,
        hubspotTokens: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const automationService = new AutomationService(
      user.id,
      user.googleTokens ? {
        accessToken: user.googleTokens.accessToken,
        refreshToken: user.googleTokens.refreshToken || undefined,
      } : undefined,
      user.hubspotTokens ? {
        accessToken: user.hubspotTokens.accessToken,
      } : undefined
    )

    // Process the webhook event
    const result = await automationService.processWebhook({
      id: `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: type as any,
      userId: user.id,
      data,
      timestamp: new Date(),
      processed: false,
    })

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook', details: (error as Error).message },
      { status: 500 }
    )
  }
}
