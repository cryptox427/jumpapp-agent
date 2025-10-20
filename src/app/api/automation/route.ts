import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AutomationService } from '@/lib/automation'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, ruleId, ...data } = body

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
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

    let result

    switch (action) {
      case 'create':
        result = await automationService.createAutomationRule(data)
        break

      case 'update':
        result = await automationService.updateAutomationRule(ruleId, data)
        break

      case 'delete':
        result = await automationService.deleteAutomationRule(ruleId)
        break

      case 'create_email_followup':
        result = await automationService.createEmailFollowUpRule()
        break

      case 'create_meeting_prep':
        result = await automationService.createMeetingPreparationRule()
        break

      case 'create_hubspot_sync':
        result = await automationService.createHubSpotSyncRule()
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Automation management error:', error)
    return NextResponse.json(
      { error: 'Failed to manage automation', details: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'get_rules'
    const ruleId = searchParams.get('ruleId')

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
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

    let result

    switch (action) {
      case 'get_rules':
        result = await automationService.getAutomationRules()
        break

      case 'get_executions':
        result = await automationService.getAutomationExecutions(ruleId || undefined)
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Automation management error:', error)
    return NextResponse.json(
      { error: 'Failed to get automation data', details: (error as Error).message },
      { status: 500 }
    )
  }
}
