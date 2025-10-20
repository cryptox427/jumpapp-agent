import { prisma } from './prisma'
import { GoogleService } from './google'
import { HubSpotService } from './hubspot'
import { AIService } from './openai'

export class PollingService {
  private isRunning = false
  private intervalId: NodeJS.Timeout | null = null

  start(intervalMs: number = 60000) { // Default 1 minute
    if (this.isRunning) {
      console.log('Polling service is already running')
      return
    }

    this.isRunning = true
    console.log('Starting polling service...')

    this.intervalId = setInterval(async () => {
      try {
        await this.pollForChanges()
      } catch (error) {
        console.error('Error in polling service:', error)
      }
    }, intervalMs)

    // Run immediately
    this.pollForChanges()
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
    console.log('Polling service stopped')
  }

  private async pollForChanges() {
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

        await this.processUserChanges(user)
      }
    } catch (error) {
      console.error('Error polling for changes:', error)
    }
  }

  private async processUserChanges(user: any) {
    try {
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

      // Check for new emails
      await this.checkNewEmails(aiService, user)
      
      // Check for new calendar events
      await this.checkNewCalendarEvents(aiService, user)
      
      // Check for new HubSpot contacts
      await this.checkNewContacts(aiService, user)

    } catch (error) {
      console.error(`Error processing changes for user ${user.id}:`, error)
    }
  }

  private async checkNewEmails(aiService: AIService, user: any) {
    try {
      const googleService = new GoogleService(
        user.googleTokens.accessToken,
        user.googleTokens.refreshToken || undefined
      )

      // Get recent emails
      const recentEmails = await googleService.listEmails('me', 5)
      
      // Check if any are new since last check
      const lastCheck = await this.getLastCheckTime(user.id, 'emails')
      const newEmails = recentEmails.filter(email => 
        new Date(email.date) > lastCheck
      )

      if (newEmails.length > 0) {
        await this.processNewEmails(aiService, newEmails, user.instructions)
        await this.updateLastCheckTime(user.id, 'emails')
      }
    } catch (error) {
      console.error('Error checking new emails:', error)
    }
  }

  private async checkNewCalendarEvents(aiService: AIService, user: any) {
    try {
      const googleService = new GoogleService(
        user.googleTokens.accessToken,
        user.googleTokens.refreshToken || undefined
      )

      const events = await googleService.listCalendarEvents()
      const lastCheck = await this.getLastCheckTime(user.id, 'calendar')
      const newEvents = events.filter(event => 
        event.created && new Date(event.created) > lastCheck
      )

      if (newEvents.length > 0) {
        await this.processNewCalendarEvents(aiService, newEvents, user.instructions)
        await this.updateLastCheckTime(user.id, 'calendar')
      }
    } catch (error) {
      console.error('Error checking new calendar events:', error)
    }
  }

  private async checkNewContacts(aiService: AIService, user: any) {
    try {
      const hubspotService = new HubSpotService(user.hubspotTokens.accessToken)
      const contacts = await hubspotService.getContacts(10)
      
      const lastCheck = await this.getLastCheckTime(user.id, 'contacts')
      const newContacts = contacts.filter(contact => 
        contact.createdAt && contact.createdAt > lastCheck
      )

      if (newContacts.length > 0) {
        await this.processNewContacts(aiService, newContacts, user.instructions)
        await this.updateLastCheckTime(user.id, 'contacts')
      }
    } catch (error) {
      console.error('Error checking new contacts:', error)
    }
  }

  private async processNewEmails(aiService: AIService, emails: any[], instructions: any[]) {
    for (const email of emails) {
      const shouldProcess = await this.shouldProcessEmail(email, instructions)
      
      if (shouldProcess) {
        const systemPrompt = `You are an AI assistant that processes new emails and takes actions based on ongoing instructions.

Ongoing instructions:
${instructions.map(i => `- ${i.instruction}`).join('\n')}

New email received:
- From: ${email.sender}
- Subject: ${email.subject}
- Body: ${email.body}

Analyze this email and determine if any ongoing instructions apply. If so, take the appropriate action.`

        const messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Process this new email and take any necessary actions.' }
        ]

        await aiService.generateResponse(messages)
      }
    }
  }

  private async processNewCalendarEvents(aiService: AIService, events: any[], instructions: any[]) {
    for (const event of events) {
      const shouldProcess = await this.shouldProcessCalendarEvent(event, instructions)
      
      if (shouldProcess) {
        const systemPrompt = `You are an AI assistant that processes new calendar events and takes actions based on ongoing instructions.

Ongoing instructions:
${instructions.map(i => `- ${i.instruction}`).join('\n')}

New calendar event:
- Summary: ${event.summary}
- Attendees: ${event.attendees?.map((a: any) => a.email).join(', ')}
- Start: ${event.start?.dateTime}
- End: ${event.end?.dateTime}

Analyze this calendar event and determine if any ongoing instructions apply. If so, take the appropriate action.`

        const messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Process this new calendar event and take any necessary actions.' }
        ]

        await aiService.generateResponse(messages)
      }
    }
  }

  private async processNewContacts(aiService: AIService, contacts: any[], instructions: any[]) {
    for (const contact of contacts) {
      const shouldProcess = await this.shouldProcessContact(contact, instructions)
      
      if (shouldProcess) {
        const systemPrompt = `You are an AI assistant that processes new HubSpot contacts and takes actions based on ongoing instructions.

Ongoing instructions:
${instructions.map(i => `- ${i.instruction}`).join('\n')}

New contact created:
- Name: ${contact.firstName} ${contact.lastName}
- Email: ${contact.email}
- Company: ${contact.company}

Analyze this new contact and determine if any ongoing instructions apply. If so, take the appropriate action.`

        const messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Process this new contact and take any necessary actions.' }
        ]

        await aiService.generateResponse(messages)
      }
    }
  }

  private async shouldProcessEmail(email: any, instructions: any[]): Promise<boolean> {
    // Simple keyword matching for now
    return instructions.some(instruction => 
      instruction.instruction.toLowerCase().includes('email') ||
      instruction.instruction.toLowerCase().includes('message')
    )
  }

  private async shouldProcessCalendarEvent(event: any, instructions: any[]): Promise<boolean> {
    return instructions.some(instruction => 
      instruction.instruction.toLowerCase().includes('calendar') ||
      instruction.instruction.toLowerCase().includes('meeting') ||
      instruction.instruction.toLowerCase().includes('event')
    )
  }

  private async shouldProcessContact(contact: any, instructions: any[]): Promise<boolean> {
    return instructions.some(instruction => 
      instruction.instruction.toLowerCase().includes('contact') ||
      instruction.instruction.toLowerCase().includes('hubspot') ||
      instruction.instruction.toLowerCase().includes('client')
    )
  }

  private async getLastCheckTime(userId: string, type: string): Promise<Date> {
    // Store last check times in a simple table or use metadata
    // For now, return a date 1 hour ago
    return new Date(Date.now() - 60 * 60 * 1000)
  }

  private async updateLastCheckTime(userId: string, type: string): Promise<void> {
    // Update last check time
    // Implementation depends on how you want to store this
  }
}

// Global polling service instance
export const pollingService = new PollingService()
