import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AIService } from '@/lib/openai'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Verify HubSpot webhook signature
    const body = await request.json()
    
    if (body.subscriptionType === 'contact.creation' || body.subscriptionType === 'contact.propertyChange') {
      await handleContactWebhook(body)
    }
    
    if (body.subscriptionType === 'contact.deletion') {
      await handleContactDeletionWebhook(body)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('HubSpot webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleContactWebhook(data: any) {
  try {
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
      if (!user.googleTokens || !user.hubspotTokens) continue

      const aiService = new AIService(
        user.id,
        {
          accessToken: user.googleTokens.accessToken,
          refreshToken: user.googleTokens.refreshToken || undefined,
        },
        {
          accessToken: user.hubspotTokens.accessToken,
        }
      )

      const shouldAct = await checkOngoingInstructions(user.instructions, 'hubspot_contact', data)
      
      if (shouldAct) {
        await processContactWithAI(aiService, data, user.instructions)
      }
    }
  } catch (error) {
    console.error('Error handling contact webhook:', error)
  }
}

async function handleContactDeletionWebhook(data: any) {
  try {
    // Handle contact deletion if needed
    console.log('Contact deleted:', data.objectId)
  } catch (error) {
    console.error('Error handling contact deletion webhook:', error)
  }
}

async function checkOngoingInstructions(
  instructions: any[],
  trigger: string,
  data: any
): Promise<boolean> {
  const triggerKeywords = {
    hubspot_contact: ['contact', 'hubspot', 'client', 'customer'],
  }

  const keywords = triggerKeywords[trigger as keyof typeof triggerKeywords] || []
  
  return instructions.some(instruction => 
    keywords.some(keyword => 
      instruction.instruction.toLowerCase().includes(keyword)
    )
  )
}

async function processContactWithAI(aiService: AIService, contactData: any, instructions: any[]) {
  try {
    const systemPrompt = `You are an AI assistant that processes HubSpot contact changes and takes actions based on ongoing instructions.

Ongoing instructions:
${instructions.map(i => `- ${i.instruction}`).join('\n')}

Contact event:
- Contact ID: ${contactData.objectId}
- Event Type: ${contactData.subscriptionType}
- Properties: ${JSON.stringify(contactData.properties)}

Analyze this contact event and determine if any ongoing instructions apply. If so, take the appropriate action.`

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Process this contact event and take any necessary actions based on my ongoing instructions.' }
    ]

    await aiService.generateResponse(messages)
  } catch (error) {
    console.error('Error processing contact with AI:', error)
  }
}
