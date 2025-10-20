import OpenAI from 'openai'
import { GoogleService } from './google'
import { HubSpotService } from './hubspot'
import { prisma } from './prisma'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export class DataImportService {
  private googleService?: GoogleService
  private hubspotService: HubSpotService
  private userId: string

  constructor(
    userId: string,
    googleTokens?: { accessToken: string; refreshToken?: string },
    hubspotTokens: { accessToken: string }
  ) {
    this.userId = userId
    if (googleTokens) {
      this.googleService = new GoogleService(googleTokens.accessToken, googleTokens.refreshToken)
    }
    this.hubspotService = new HubSpotService(hubspotTokens.accessToken)
  }

  async generateEmbedding(text: string): Promise<string> {
    try {
      // Clean and truncate text for embedding
      const cleanText = text.replace(/\s+/g, ' ').trim().substring(0, 8000)
      
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: cleanText,
      })
      
      // Convert embedding vector to JSON string for storage
      return JSON.stringify(response.data[0].embedding)
    } catch (error) {
      console.error('Error generating embedding:', error)
      // Fallback to simple text storage
      return text.toLowerCase()
    }
  }

  async importEmails(maxEmails: number = 100) {
    if (!this.googleService) {
      throw new Error('Google service not available - Gmail import requires Google OAuth')
    }

    try {
      console.log('Starting email import...')
      
      const emails = await this.googleService.listEmails('me', maxEmails)
      let imported = 0
      let skipped = 0

      for (const email of emails) {
        try {
          // Check if email already exists
          const existing = await prisma.emailData.findUnique({
            where: { messageId: email.messageId },
          })

          if (existing) {
            skipped++
            continue
          }

          // Generate embedding for search
          const textForEmbedding = `${email.subject} ${email.sender} ${email.body}`
          const embedding = await this.generateEmbedding(textForEmbedding)

          // Store email data
          await prisma.emailData.create({
            data: {
              userId: this.userId,
              messageId: email.messageId,
              threadId: email.threadId,
              subject: email.subject,
              sender: email.sender,
              recipient: email.recipient,
              body: email.body,
              date: email.date,
              labels: email.labels,
              embedding,
            },
          })

          imported++
          console.log(`Imported email: ${email.subject}`)
        } catch (error) {
          console.error(`Error importing email ${email.messageId}:`, error)
        }
      }

      console.log(`Email import complete. Imported: ${imported}, Skipped: ${skipped}`)
      return { imported, skipped }
    } catch (error) {
      console.error('Error importing emails:', error)
      throw error
    }
  }

  async importHubSpotContacts() {
    try {
      console.log('Starting HubSpot contacts import...')
      
      const contacts = await this.hubspotService.getContacts(1000)
      let imported = 0
      let skipped = 0

      for (const contact of contacts) {
        try {
          // Check if contact already exists
          const existing = await prisma.hubspotContact.findUnique({
            where: { contactId: contact.contactId },
          })

          if (existing) {
            skipped++
            continue
          }

          // Generate embedding for search
          const textForEmbedding = `${contact.firstName} ${contact.lastName} ${contact.email} ${contact.company}`
          const embedding = await this.generateEmbedding(textForEmbedding)

          // Store contact data
          await prisma.hubspotContact.create({
            data: {
              userId: this.userId,
              contactId: contact.contactId,
              email: contact.email,
              firstName: contact.firstName,
              lastName: contact.lastName,
              company: contact.company,
              phone: contact.phone,
              notes: '', // Will be populated separately
              properties: contact.properties,
              embedding,
            },
          })

          imported++
          console.log(`Imported contact: ${contact.firstName} ${contact.lastName}`)
        } catch (error) {
          console.error(`Error importing contact ${contact.contactId}:`, error)
        }
      }

      console.log(`HubSpot contacts import complete. Imported: ${imported}, Skipped: ${skipped}`)
      return { imported, skipped }
    } catch (error) {
      console.error('Error importing HubSpot contacts:', error)
      throw error
    }
  }

  async importHubSpotNotes() {
    try {
      console.log('Starting HubSpot notes import...')
      
      // Get all contacts to fetch their notes
      const contacts = await prisma.hubspotContact.findMany({
        where: { userId: this.userId },
      })

      let imported = 0
      let skipped = 0

      for (const contact of contacts) {
        try {
          const notes = await this.hubspotService.getContactNotes(contact.contactId)
          
          for (const note of notes) {
            // Check if note already exists
            const existing = await prisma.hubspotNote.findUnique({
              where: { noteId: note.noteId },
            })

            if (existing) {
              skipped++
              continue
            }

            // Generate embedding for search
            const embedding = await this.generateEmbedding(note.content)

            // Store note data
            await prisma.hubspotNote.create({
              data: {
                userId: this.userId,
                noteId: note.noteId,
                contactId: contact.contactId,
                content: note.content,
                createdAt: note.createdAt || new Date(),
                embedding,
              },
            })

            imported++
            console.log(`Imported note for contact: ${contact.firstName} ${contact.lastName}`)
          }
        } catch (error) {
          console.error(`Error importing notes for contact ${contact.contactId}:`, error)
        }
      }

      console.log(`HubSpot notes import complete. Imported: ${imported}, Skipped: ${skipped}`)
      return { imported, skipped }
    } catch (error) {
      console.error('Error importing HubSpot notes:', error)
      throw error
    }
  }

  async importAllData() {
    try {
      console.log('Starting full data import...')
      
      const results: any = {
        contacts: await this.importHubSpotContacts(),
        notes: await this.importHubSpotNotes(),
      }

      // Only import emails if Google service is available
      if (this.googleService) {
        results.emails = await this.importEmails()
      } else {
        console.log('Skipping email import - Google service not available')
        results.emails = { imported: 0, skipped: 0, note: 'Google OAuth required for email import' }
      }

      console.log('Full data import complete:', results)
      return results
    } catch (error) {
      console.error('Error in full data import:', error)
      throw error
    }
  }
}
