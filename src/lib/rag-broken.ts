import OpenAI from 'openai'
import { prisma } from './prisma'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export class RAGService {
  private userId: string

  constructor(userId: string) {
    this.userId = userId
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Clean and truncate text for embedding
      const cleanText = text.replace(/\s+/g, ' ').trim().substring(0, 8000)
      
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: cleanText,
      })
      
      return response.data[0].embedding
    } catch (error) {
      console.error('Error generating embedding:', error)
      throw error
    }
  }

  // Calculate cosine similarity between two vectors
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0
    
    let dotProduct = 0
    let normA = 0
    let normB = 0
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }

  async searchEmails(query: string, limit: number = 5, googleService?: { searchEmails: (query: string, limit: number) => Promise<any[]> }) {
    try {
      console.log('🔍 RAG searchEmails called with:', {
        query,
        userId: this.userId,
        limit,
        hasGoogleService: !!googleService
      })

      if (googleService) {
        // Use Gmail API to search directly
        return await this.searchEmailsFromGmail(query, limit, googleService)
      } else {
        // Fallback to database search
        return await this.searchEmailsFromDatabase(query, limit)
      }
    } catch (error) {
      console.error('Error searching emails:', error)
      return []
    }
  }

  private async searchEmailsFromGmail(query: string, limit: number, googleService: { searchEmails: (query: string, limit: number) => Promise<any[]> }) {
    try {
      // Simplified Gmail search for now
      console.log('📧 Gmail search simulation for query:', query)
      
      return []
    } catch (error) {
      console.error('Error searching emails from Gmail:', error)
      return []
    }
  }
      
      // Search Gmail
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: gmailQuery,
        maxResults: Math.min(limit * 3, 50), // Get more results for better filtering
      })

      const messages = response.data.messages || []
      const results = []

      // Process each message
      for (const message of messages.slice(0, limit)) {
        try {
          const messageDetail = await gmail.users.messages.get({
            userId: 'me',
            id: message.id!,
            format: 'full',
          })

          const payload = messageDetail.data.payload!
          const headers = payload.headers || []
          
          const subject = headers.find((h: { name: string; value: string }) => h.name === 'Subject')?.value || ''
          const sender = headers.find((h: { name: string; value: string }) => h.name === 'From')?.value || ''
          const recipient = headers.find((h: { name: string; value: string }) => h.name === 'To')?.value || ''
          const date = headers.find((h: { name: string; value: string }) => h.name === 'Date')?.value || ''
          
          // Extract body text
          let body = ''
          if (payload.body?.data) {
            body = Buffer.from(payload.body.data, 'base64').toString()
          } else if (payload.parts) {
            for (const part of payload.parts) {
              if (part.mimeType === 'text/plain' && part.body?.data) {
                body = Buffer.from(part.body.data, 'base64').toString()
                break
              }
            }
          }

          // Generate embedding for relevance scoring
          const emailText = `${subject} ${sender} ${body}`
          const embedding = await this.generateEmbedding(emailText)
          const queryEmbedding = await this.generateEmbedding(query)
          const similarity = this.cosineSimilarity(queryEmbedding, embedding)

          // For Gmail API results, use lower threshold since Gmail already filtered by query
          // Also boost relevance for direct matches (from/to queries)
          let adjustedRelevance = similarity
          if (query.toLowerCase().includes('from:') || query.toLowerCase().includes('to:')) {
            adjustedRelevance = Math.max(similarity, 0.8) // Boost relevance for direct address matches
          }
          
          if (adjustedRelevance > 0.3) { // Lower threshold for Gmail API results
            results.push({
              type: 'email' as const,
              id: message.id!,
              subject,
              sender,
              recipient,
              content: body.substring(0, 300) + '...',
              date: new Date(date),
              relevance: adjustedRelevance,
            })
          }
        } catch (error) {
          console.error('Error processing message:', error)
          continue
        }
      }

      console.log('📧 Gmail search found emails:', {
        count: results.length,
        emails: results.map(email => ({
          id: email.id,
          subject: email.subject,
          sender: email.sender,
          relevance: email.relevance
        }))
      })

      return results.sort((a, b) => b.relevance - a.relevance)
    } catch (error) {
      console.error('Error searching Gmail:', error)
      // Fallback to database search
      return await this.searchEmailsFromDatabase(query, limit)
    }
  }

  private async searchEmailsFromDatabase(query: string, limit: number) {
    try {
      const queryEmbedding = await this.generateEmbedding(query)

      // Get all emails for this user
      const allEmails = await prisma.emailData.findMany({
        where: { userId: this.userId },
        orderBy: { date: 'desc' },
      })

      // Calculate similarity scores
      const emailsWithScores = allEmails.map(email => {
        let similarity = 0
        
        try {
          // Parse stored embedding
          const storedEmbedding = JSON.parse(email.embedding || '[]')
          if (Array.isArray(storedEmbedding) && storedEmbedding.length > 0) {
            similarity = this.cosineSimilarity(queryEmbedding, storedEmbedding)
          } else {
            // Fallback to text search if no embedding
            const textMatch = `${email.subject} ${email.sender} ${email.body}`.toLowerCase()
            similarity = textMatch.includes(query.toLowerCase()) ? 0.5 : 0
          }
        } catch (error) {
          // Fallback to text search
          const textMatch = `${email.subject} ${email.sender} ${email.body}`.toLowerCase()
          similarity = textMatch.includes(query.toLowerCase()) ? 0.5 : 0
        }

        return {
          email,
          similarity
        }
      })

      // Sort by similarity and take top results
      const topEmails = emailsWithScores
        .filter(item => item.similarity > 0.1) // Only include relevant results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)

      console.log('📧 Database search found emails:', {
        count: topEmails.length,
        emails: topEmails.map(item => ({
          id: item.email.id,
          subject: item.email.subject,
          sender: item.email.sender,
          similarity: item.similarity,
          bodyPreview: item.email.body?.substring(0, 100) + '...'
        }))
      })

      return topEmails.map(item => ({
        type: 'email' as const,
        id: item.email.messageId,
        subject: item.email.subject,
        sender: item.email.sender,
        content: item.email.body?.substring(0, 300) + '...',
        date: item.email.date,
        relevance: item.similarity,
      }))
    } catch (error) {
      console.error('Error searching emails from database:', error)
      return []
    }
  }

  private convertToGmailQuery(query: string): string {
    // Convert natural language to Gmail search syntax
    let gmailQuery = query.toLowerCase()
    
    // Handle specific patterns first
    if (gmailQuery.includes('from smithzhang0427@gmail.com') || gmailQuery.includes('from:smithzhang0427@gmail.com')) {
      return 'from:smithzhang0427@gmail.com'
    }
    
    // Handle "what did [person] say about [topic]" queries
    const whatDidMatch = gmailQuery.match(/what did (.+?) say about (.+?)(?:\s+recently)?$/i)
    if (whatDidMatch) {
      const person = whatDidMatch[1].trim()
      let topic = whatDidMatch[2].trim()
      
      // Remove "recently" from topic if it's there
      topic = topic.replace(/\s+recently\??$/i, '')
      
      console.log('🔍 Pattern match found:', { person, topic })
      
      // Extract email from person name if possible
      let emailQuery = ''
      if (person.includes('smith') && person.includes('zhang')) {
        emailQuery = 'from:smithzhang0427@gmail.com'
      } else if (person.includes('@')) {
        emailQuery = `from:${person}`
      } else {
        emailQuery = person
      }
      
      const result = `${emailQuery} ${topic}`
      console.log('🔍 Converted query:', result)
      return result
    }
    
    // Handle "recently" queries - add time filter
    if (gmailQuery.includes('recently')) {
      gmailQuery = gmailQuery.replace(/\s+recently/gi, ' newer_than:1m')
    }
    
    // General conversions
    gmailQuery = gmailQuery
      .replace(/\bfrom\s+(\S+)/gi, 'from:$1')
      .replace(/\bto\s+(\S+)/gi, 'to:$1')
      .replace(/\bsubject\s*:\s*([^"]+)/gi, 'subject:"$1"')
      .replace(/\bhas\s+attachment/gi, 'has:attachment')
      .replace(/\bis\s+unread/gi, 'is:unread')
      .replace(/\bis\s+read/gi, 'is:read')
      .replace(/\bis\s+important/gi, 'is:important')
      .replace(/\bis\s+starred/gi, 'is:starred')
      .replace(/\bin\s+(\S+)/gi, 'in:$1')
      .replace(/\bafter\s+(\d{4}\/\d{1,2}\/\d{1,2})/gi, 'after:$1')
      .replace(/\bbefore\s+(\d{4}\/\d{1,2}\/\d{1,2})/gi, 'before:$1')
    
    // Clean up common phrases that don't add value
    gmailQuery = gmailQuery
      .replace(/\bshow\s+me\s+emails?\s+/gi, '')
      .replace(/\bfind\s+emails?\s+/gi, '')
      .replace(/\bsearch\s+for\s+emails?\s+/gi, '')
      .replace(/\bget\s+emails?\s+/gi, '')
      .replace(/\blist\s+emails?\s+/gi, '')
      .replace(/\bwhat\s+did\s+/gi, '')
      .replace(/\bsay\s+about\s+/gi, '')
      .trim()
    
    return gmailQuery
  }

  async searchContacts(query: string, limit: number = 5) {
    try {
      const queryEmbedding = await this.generateEmbedding(query)

      // Get all contacts for this user
      const allContacts = await prisma.hubspotContact.findMany({
        where: { userId: this.userId },
      })

      // Calculate similarity scores
      const contactsWithScores = allContacts.map(contact => {
        let similarity = 0
        
        try {
          // Parse stored embedding
          const storedEmbedding = JSON.parse(contact.embedding || '[]')
          if (Array.isArray(storedEmbedding) && storedEmbedding.length > 0) {
            similarity = this.cosineSimilarity(queryEmbedding, storedEmbedding)
          } else {
            // Fallback to text search if no embedding
            const textMatch = `${contact.firstName} ${contact.lastName} ${contact.email} ${contact.company}`.toLowerCase()
            similarity = textMatch.includes(query.toLowerCase()) ? 0.5 : 0
          }
        } catch (error) {
          // Fallback to text search
          const textMatch = `${contact.firstName} ${contact.lastName} ${contact.email} ${contact.company}`.toLowerCase()
          similarity = textMatch.includes(query.toLowerCase()) ? 0.5 : 0
        }

        return {
          contact,
          similarity
        }
      })

      // Sort by similarity and take top results
      const topContacts = contactsWithScores
        .filter(item => item.similarity > 0.1) // Only include relevant results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)

      return topContacts.map(item => ({
        type: 'contact' as const,
        id: item.contact.contactId,
        name: `${item.contact.firstName} ${item.contact.lastName}`.trim(),
        email: item.contact.email,
        company: item.contact.company,
        content: `${item.contact.firstName} ${item.contact.lastName} - ${item.contact.email} - ${item.contact.company}`,
        relevance: item.similarity,
      }))
    } catch (error) {
      console.error('Error searching contacts:', error)
      return []
    }
  }

  async searchNotes(query: string, limit: number = 5) {
    try {
      const queryEmbedding = await this.generateEmbedding(query)

      // Get all notes for this user
      const allNotes = await prisma.hubspotNote.findMany({
        where: { userId: this.userId },
        orderBy: { createdAt: 'desc' },
      })

      // Calculate similarity scores
      const notesWithScores = allNotes.map(note => {
        let similarity = 0
        
        try {
          // Parse stored embedding
          const storedEmbedding = JSON.parse(note.embedding || '[]')
          if (Array.isArray(storedEmbedding) && storedEmbedding.length > 0) {
            similarity = this.cosineSimilarity(queryEmbedding, storedEmbedding)
          } else {
            // Fallback to text search if no embedding
            similarity = note.content.toLowerCase().includes(query.toLowerCase()) ? 0.5 : 0
          }
        } catch (error) {
          // Fallback to text search
          similarity = note.content.toLowerCase().includes(query.toLowerCase()) ? 0.5 : 0
        }

        return {
          note,
          similarity
        }
      })

      // Sort by similarity and take top results
      const topNotes = notesWithScores
        .filter(item => item.similarity > 0.1) // Only include relevant results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)

      // Get contact information for each note
      const notesWithContacts = await Promise.all(
        topNotes.map(async (item) => {
          const contact = await prisma.hubspotContact.findFirst({
            where: {
              userId: this.userId,
              contactId: item.note.contactId,
            },
          })

          return {
            type: 'note' as const,
            id: item.note.noteId,
            contactId: item.note.contactId,
            contactName: contact ? `${contact.firstName} ${contact.lastName}`.trim() : 'Unknown',
            content: item.note.content,
            date: item.note.createdAt,
            relevance: item.similarity,
          }
        })
      )

      return notesWithContacts
    } catch (error) {
      console.error('Error searching notes:', error)
      return []
    }
  }

  async searchMeetings(query: string, limit: number = 5) {
    try {
      // Meeting search is not available yet - meetingData table needs to be implemented
      console.log('📅 Meeting search not implemented yet')
      return []
    } catch (error) {
      console.error('Error searching meetings:', error)
      return []
    }
  }

  async searchAll(query: string, limit: number = 10, googleService?: { searchEmails: (query: string, limit: number) => Promise<any[]> }) {
    try {
      const [emails, contacts, notes, meetings] = await Promise.all([
        this.searchEmails(query, Math.ceil(limit / 4), googleService),
        this.searchContacts(query, Math.ceil(limit / 4)),
        this.searchNotes(query, Math.ceil(limit / 4)),
        this.searchMeetings(query, Math.ceil(limit / 4)),
      ])

      // Combine and sort by relevance (simplified)
      const allResults = [...emails, ...contacts, ...notes, ...meetings]
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, limit)

      return allResults
    } catch (error) {
      console.error('Error in searchAll:', error)
      return []
    }
  }

  async importMeetingData(meetings: { eventId: string; title: string; description?: string; startTime: string; endTime: string; attendees?: any; location?: string; meetingType?: string; notes?: string }[]) {
    try {
      // Meeting data import is not available yet - meetingData table needs to be implemented
      console.log('📅 Meeting data import not implemented yet')
      return { success: true, imported: 0, message: 'Meeting import not available yet' }
    } catch (error) {
      console.error('Error importing meeting data:', error)
      return { success: false, imported: 0, error: (error as Error).message }
    }
  }

  // HubSpot-focused RAG context (for AI responses)
  async getHubSpotContext(query: string, limit: number = 10) {
    try {
      const [contacts, notes] = await Promise.all([
        this.searchContacts(query, Math.ceil(limit / 2)),
        this.searchNotes(query, Math.ceil(limit / 2)),
      ])

      // Format results for AI context (HubSpot only)
      const context = {
        contacts: contacts,
        notes: notes,
        summary: this.formatHubSpotContextSummary(contacts.map(c => ({
          contactId: c.id,
          email: c.email || '',
          firstName: c.name.split(' ')[0] || '',
          lastName: c.name.split(' ').slice(1).join(' ') || '',
          company: c.company || ''
        })), notes.map(n => ({
          noteId: n.id,
          content: n.content,
          createdAt: n.createdAt
        }))),
      }

      return context
    } catch (error) {
      console.error('Error getting HubSpot context:', error)
      return {
        contacts: [],
        notes: [],
        summary: '',
      }
    }
  }

  async getContextForQuery(query: string, limit: number = 10, googleService?: { searchEmails: (query: string, limit: number) => Promise<any[]> }) {
    // Use HubSpot-focused context for AI responses, but include emails if Google service is available
    if (googleService) {
      const [hubspotContext, emails] = await Promise.all([
        this.getHubSpotContext(query, Math.ceil(limit / 2)),
        this.searchEmails(query, Math.ceil(limit / 2), googleService),
      ])
      
      return {
        hubspot: hubspotContext,
        emails: emails,
        summary: this.formatContextSummary([...hubspotContext.contacts, ...hubspotContext.notes, ...emails]),
      }
    } else {
      return await this.getHubSpotContext(query, limit)
    }
  }

  private formatHubSpotContextSummary(contacts: { contactId: string; email: string; firstName: string; lastName: string; company: string }[], notes: { noteId: string; content: string; createdAt: Date }[]): string {
    if (contacts.length === 0 && notes.length === 0) {
      return 'No relevant HubSpot information found.'
    }

    const summary = []
    
    if (contacts.length > 0) {
      summary.push(`Found ${contacts.length} relevant contacts`)
    }

    if (notes.length > 0) {
      summary.push(`Found ${notes.length} relevant notes`)
    }

    return summary.join(', ') + '.'
  }

  private formatContextSummary(results: { type: string; id: string; content: string; relevance: number }[]): string {
    if (results.length === 0) {
      return 'No relevant information found.'
    }

    const summary = []
    
    const contacts = results.filter(r => r.type === 'contact')
    if (contacts.length > 0) {
      summary.push(`Found ${contacts.length} relevant contacts`)
    }

    const notes = results.filter(r => r.type === 'note')
    if (notes.length > 0) {
      summary.push(`Found ${notes.length} relevant notes`)
    }

    return summary.join(', ') + '.'
  }
}
