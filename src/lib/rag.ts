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

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      })
      return response.data[0].embedding
    } catch (error) {
      console.error('Error generating embedding:', error)
      return []
    }
  }

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

  async searchEmails(query: string, limit: number = 5, googleService?: { searchEmails: (query: string, limit: number) => Promise<unknown[]> }) {
    try {
      console.log('🔍 RAG searchEmails called with:', {
        query,
        userId: this.userId,
        limit,
        hasGoogleService: !!googleService
      })

      if (googleService) {
        return await this.searchEmailsFromGmail(query, limit, googleService)
      } else {
        return await this.searchEmailsFromDatabase(query, limit)
      }
    } catch (error) {
      console.error('Error searching emails:', error)
      return []
    }
  }

  private async searchEmailsFromGmail(query: string, _limit: number, _googleService: { searchEmails: (query: string, limit: number) => Promise<unknown[]> }) {
    try {
      // Simplified Gmail search for now
      console.log('📧 Gmail search simulation for query:', query)
      return []
    } catch {
      console.error('Error searching emails from Gmail')
      return []
    }
  }

  private async searchEmailsFromDatabase(query: string, limit: number) {
    try {
      const queryEmbedding = await this.generateEmbedding(query)

      // Get all emails for this user
      const allEmails = await prisma.emailData.findMany({
        where: { userId: this.userId },
        take: 100, // Get more records for better similarity matching
      })

      const results = allEmails
        .map(email => {
          let similarity = 0
          
          try {
            // Parse stored embedding
            const storedEmbedding = JSON.parse(email.embedding || '[]')
            if (Array.isArray(storedEmbedding) && storedEmbedding.length > 0) {
              similarity = this.cosineSimilarity(queryEmbedding, storedEmbedding)
            } else {
              // Fallback to text search if no embedding
              const textMatch = `${email.subject} ${email.body}`.toLowerCase()
              similarity = textMatch.includes(query.toLowerCase()) ? 0.5 : 0
            }
          } catch (error) {
            // Fallback to text search
            const textMatch = `${email.subject} ${email.body}`.toLowerCase()
            similarity = textMatch.includes(query.toLowerCase()) ? 0.5 : 0
          }

          return {
            email,
            similarity
          }
        })
        .filter(item => item.similarity > 0.3) // Only include relevant results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)

      return results.map(item => ({
        type: 'email' as const,
        id: item.email.id,
        subject: item.email.subject,
        sender: item.email.sender,
        content: item.email.body,
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
      const allContacts = await prisma.emailData.findMany({
        where: { userId: this.userId },
        take: 100, // Get more records for better similarity matching
      })

      const results = allContacts
        .map((contact: { id: string; userId: string; createdAt: Date; updatedAt: Date; messageId: string; threadId: string; subject: string; sender: string; recipient: string; body: string; date: Date; labels: string; embedding: string | null }) => {
          let similarity = 0
          
          try {
            // Parse stored embedding
            const storedEmbedding = JSON.parse(contact.embedding || '[]')
            if (Array.isArray(storedEmbedding) && storedEmbedding.length > 0) {
              similarity = this.cosineSimilarity(queryEmbedding, storedEmbedding)
            } else {
              // Fallback to text search if no embedding
              const textMatch = `${contact.subject} ${contact.body} ${contact.sender}`.toLowerCase()
              similarity = textMatch.includes(query.toLowerCase()) ? 0.5 : 0
            }
          } catch (error) {
            // Fallback to text search
            const textMatch = `${contact.subject} ${contact.body} ${contact.sender}`.toLowerCase()
            similarity = textMatch.includes(query.toLowerCase()) ? 0.5 : 0
          }

          return {
            contact,
            similarity
          }
        })
        .filter((item: { contact: { id: string; userId: string; createdAt: Date; updatedAt: Date; messageId: string; threadId: string; subject: string; sender: string; recipient: string; body: string; date: Date; labels: string; embedding: string | null }; similarity: number }) => item.similarity > 0.3) // Only include relevant results
        .sort((a: { similarity: number }, b: { similarity: number }) => b.similarity - a.similarity)
        .slice(0, limit)

      return results.map((item: { contact: { id: string; userId: string; createdAt: Date; updatedAt: Date; messageId: string; threadId: string; subject: string; sender: string; recipient: string; body: string; date: Date; labels: string; embedding: string | null }; similarity: number }) => ({
        type: 'contact' as const,
        id: item.contact.id,
        name: item.contact.sender,
        email: item.contact.sender,
        company: '',
        content: `${item.contact.subject} - ${item.contact.sender}`,
        relevance: item.similarity,
      }))
    } catch {
      console.error('Error searching contacts')
      return []
    }
  }

  async searchNotes(query: string, limit: number = 5) {
    try {
      const queryEmbedding = await this.generateEmbedding(query)

      // Get all notes for this user
      const allNotes = await prisma.emailData.findMany({
        where: { userId: this.userId },
        take: 100, // Get more records for better similarity matching
      })

      const results = allNotes
        .map((note: { id: string; userId: string; createdAt: Date; updatedAt: Date; subject: string; body: string; messageId: string; threadId: string; sender: string; recipient: string; date: Date; labels: string; embedding: string | null }) => {
          let similarity = 0
          
          try {
            // Parse stored embedding
            const storedEmbedding = JSON.parse(note.embedding || '[]')
            if (Array.isArray(storedEmbedding) && storedEmbedding.length > 0) {
              similarity = this.cosineSimilarity(queryEmbedding, storedEmbedding)
            } else {
              // Fallback to text search if no embedding
              const textMatch = `${note.subject} ${note.body}`.toLowerCase()
              similarity = textMatch.includes(query.toLowerCase()) ? 0.5 : 0
            }
          } catch (error) {
            // Fallback to text search
            const textMatch = `${note.subject} ${note.body}`.toLowerCase()
            similarity = textMatch.includes(query.toLowerCase()) ? 0.5 : 0
          }

          return {
            note,
            similarity
          }
        })
        .filter((item: { note: { id: string; userId: string; createdAt: Date; updatedAt: Date; subject: string; body: string; messageId: string; threadId: string; sender: string; recipient: string; date: Date; labels: string; embedding: string | null }; similarity: number }) => item.similarity > 0.3) // Only include relevant results
        .sort((a: { similarity: number }, b: { similarity: number }) => b.similarity - a.similarity)
        .slice(0, limit)

      return results.map((item: { note: { id: string; userId: string; createdAt: Date; updatedAt: Date; subject: string; body: string; messageId: string; threadId: string; sender: string; recipient: string; date: Date; labels: string; embedding: string | null }; similarity: number }) => ({
        type: 'note' as const,
        id: item.note.id,
        content: `${item.note.subject} - ${item.note.body}`,
        createdAt: item.note.createdAt,
        relevance: item.similarity,
      }))
    } catch {
      console.error('Error searching notes')
      return []
    }
  }

  async searchMeetings(query: string, _limit: number = 5) {
    try {
      // Meeting search is not available yet - meetingData table needs to be implemented
      console.log('📅 Meeting search not implemented yet for query:', query)
      return []
    } catch {
      console.error('Error searching meetings')
      return []
    }
  }

  async searchAll(query: string, limit: number = 10, googleService?: { searchEmails: (query: string, limit: number) => Promise<unknown[]> }) {
    try {
      const [emails, contacts, notes, meetings] = await Promise.all([
        this.searchEmails(query, Math.ceil(limit / 4), googleService),
        this.searchContacts(query, Math.ceil(limit / 4)),
        this.searchNotes(query, Math.ceil(limit / 4)),
        this.searchMeetings(query, Math.ceil(limit / 4)),
      ])

      return [...emails, ...contacts, ...notes, ...meetings]
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, limit)
    } catch (error) {
      console.error('Error in searchAll:', error)
      return []
    }
  }

  async importMeetingData(_meetings: { eventId: string; title: string; description?: string; startTime: string; endTime: string; attendees?: unknown; location?: string; meetingType?: string; notes?: string }[]) {
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
        summary: this.formatHubSpotContextSummary(contacts.map((c: { id: string; name: string; email?: string; company?: string }) => ({
          contactId: c.id,
          email: c.email || '',
          firstName: c.name.split(' ')[0] || '',
          lastName: c.name.split(' ').slice(1).join(' ') || '',
          company: c.company || ''
        })), notes.map((n: { id: string; content: string; createdAt: Date }) => ({
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

  async getContextForQuery(query: string, limit: number = 10, googleService?: { searchEmails: (query: string, limit: number) => Promise<unknown[]> }) {
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
      summary.push(`${contacts.length} relevant contact${contacts.length > 1 ? 's' : ''}`)
    }

    if (notes.length > 0) {
      summary.push(`${notes.length} relevant note${notes.length > 1 ? 's' : ''}`)
    }

    return summary.join(', ') + '.'
  }

  private formatContextSummary(results: { type: string; id: string; content: string; relevance: number }[]): string {
    if (results.length === 0) {
      return 'No relevant information found.'
    }

    const summary = []

    for (const result of results) {
      summary.push(`${result.type} (${Math.round(result.relevance * 100)}% relevant)`)
    }

    return summary.join(', ') + '.'
  }
}
