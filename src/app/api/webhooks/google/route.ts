import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AIService } from '@/lib/openai'
import { AutomationService } from '@/lib/automation'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (implement proper verification)
    const body = await request.json()
    
    // For Gmail push notifications, we'd receive notification about new emails
    if (body.type === 'email') {
      await handleEmailWebhook(body)
    }
    
    // For Calendar notifications
    if (body.type === 'calendar') {
      await handleCalendarWebhook(body)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Google webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleEmailWebhook(data: any) {
  try {
    // Find all users who might be affected by this email
    const users = await prisma.user.findMany({
      include: {
        googleTokens: true,
        hubspotTokens: true,
        instructions: {
          where: { isActive: true },
        },
      },
    })

    for (const user of users) {
      if (!user.googleTokens) continue

      const automationService = new AutomationService(
        user.id,
        {
          accessToken: user.googleTokens.accessToken,
          refreshToken: user.googleTokens.refreshToken || undefined,
        },
        user.hubspotTokens ? {
          accessToken: user.hubspotTokens.accessToken,
        } : undefined
      )

      // Process email webhook through automation system
      await automationService.processWebhook({
        id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'EMAIL_RECEIVED',
        userId: user.id,
        data: {
          from: data.from,
          subject: data.subject,
          body: data.body,
          timestamp: data.timestamp,
        },
        timestamp: new Date(),
        processed: false,
      })

      // Also process with ongoing instructions for backward compatibility
      const shouldAct = await checkOngoingInstructions(user.instructions, 'email', data)
      
      if (shouldAct) {
        const aiService = new AIService(
          user.id,
          {
            accessToken: user.googleTokens.accessToken,
            refreshToken: user.googleTokens.refreshToken || undefined,
          },
          user.hubspotTokens ? {
            accessToken: user.hubspotTokens.accessToken,
          } : undefined
        )
        await processEmailWithAI(aiService, data, user.instructions)
      }
    }
  } catch (error) {
    console.error('Error handling email webhook:', error)
  }
}

async function handleCalendarWebhook(data: any) {
  try {
    // Similar logic for calendar events
    const users = await prisma.user.findMany({
      include: {
        googleTokens: true,
        hubspotTokens: true,
        instructions: {
          where: { isActive: true },
        },
      },
    })

    for (const user of users) {
      if (!user.googleTokens) continue

      const automationService = new AutomationService(
        user.id,
        {
          accessToken: user.googleTokens.accessToken,
          refreshToken: user.googleTokens.refreshToken || undefined,
        },
        user.hubspotTokens ? {
          accessToken: user.hubspotTokens.accessToken,
        } : undefined
      )

      // Determine calendar event type
      let eventType = 'CALENDAR_EVENT_CREATED'
      if (data.action === 'updated') {
        eventType = 'CALENDAR_EVENT_UPDATED'
      } else if (data.action === 'cancelled') {
        eventType = 'CALENDAR_EVENT_CANCELLED'
      }

      // Process calendar webhook through automation system
      await automationService.processWebhook({
        id: `calendar_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: eventType as any,
        userId: user.id,
        data: {
          eventId: data.eventId,
          summary: data.summary,
          description: data.description,
          start: data.start,
          end: data.end,
          attendees: data.attendees,
          action: data.action,
        },
        timestamp: new Date(),
        processed: false,
      })

      // Also process with ongoing instructions for backward compatibility
      const shouldAct = await checkOngoingInstructions(user.instructions, 'calendar', data)
      
      if (shouldAct) {
        const aiService = new AIService(
          user.id,
          {
            accessToken: user.googleTokens.accessToken,
            refreshToken: user.googleTokens.refreshToken || undefined,
          },
          user.hubspotTokens ? {
            accessToken: user.hubspotTokens.accessToken,
          } : undefined
        )
        await processCalendarWithAI(aiService, data, user.instructions)
      }
    }
  } catch (error) {
    console.error('Error handling calendar webhook:', error)
  }
}

async function checkOngoingInstructions(
  instructions: any[],
  trigger: string,
  data: any
): Promise<boolean> {
  // Simple keyword matching for now
  // In production, you'd use more sophisticated NLP
  const triggerKeywords = {
    email: ['email', 'message', 'inbox'],
    calendar: ['calendar', 'meeting', 'event', 'appointment'],
  }

  const keywords = triggerKeywords[trigger as keyof typeof triggerKeywords] || []
  
  return instructions.some(instruction => 
    keywords.some(keyword => 
      instruction.instruction.toLowerCase().includes(keyword)
    )
  )
}

async function processEmailWithAI(aiService: AIService, emailData: any, instructions: any[]) {
  try {
    const systemPrompt = `You are an AI assistant that processes incoming emails and takes actions based on ongoing instructions.

Ongoing instructions:
${instructions.map(i => `- ${i.instruction}`).join('\n')}

New email received:
- From: ${emailData.from}
- Subject: ${emailData.subject}
- Body: ${emailData.body}

Analyze this email and determine if any ongoing instructions apply. If so, take the appropriate action.`

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Process this email and take any necessary actions based on my ongoing instructions.' }
    ]

    await aiService.generateResponse(messages)
  } catch (error) {
    console.error('Error processing email with AI:', error)
  }
}

async function processCalendarWithAI(aiService: AIService, calendarData: any, instructions: any[]) {
  try {
    const systemPrompt = `You are an AI assistant that processes calendar events and takes actions based on ongoing instructions.

Ongoing instructions:
${instructions.map(i => `- ${i.instruction}`).join('\n')}

New calendar event:
- Summary: ${calendarData.summary}
- Attendees: ${calendarData.attendees?.join(', ')}
- Start: ${calendarData.start}
- End: ${calendarData.end}

Analyze this calendar event and determine if any ongoing instructions apply. If so, take the appropriate action.`

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Process this calendar event and take any necessary actions based on my ongoing instructions.' }
    ]

    await aiService.generateResponse(messages)
  } catch (error) {
    console.error('Error processing calendar with AI:', error)
  }
}
