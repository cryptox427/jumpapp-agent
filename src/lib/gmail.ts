import { google } from 'googleapis'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'

export class GmailService {
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  private getGmailClient() {
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: this.accessToken })
    
    return google.gmail({ version: 'v1', auth })
  }

  async getEmails(query: string = '', maxResults: number = 10) {
    try {
      const gmail = this.getGmailClient()
      
      // Get list of message IDs
      const listResponse = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults,
      })

      if (!listResponse.data.messages) {
        return []
      }

      // Get full message details for each email
      const emails = await Promise.all(
        listResponse.data.messages.map(async (message) => {
          const messageResponse = await gmail.users.messages.get({
            userId: 'me',
            id: message.id!,
            format: 'full',
          })

          return this.parseEmail(messageResponse.data)
        })
      )

      return emails
    } catch (error) {
      console.error('Error fetching emails:', error)
      throw error
    }
  }

  private parseEmail(message: any) {
    const headers = message.payload?.headers || []
    
    const getHeader = (name: string) => {
      const header = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())
      return header?.value || ''
    }

    const getBody = (payload: any): string => {
      if (payload.body?.data) {
        return Buffer.from(payload.body.data, 'base64').toString()
      }
      
      if (payload.parts) {
        for (const part of payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            return Buffer.from(part.body.data, 'base64').toString()
          }
          if (part.parts) {
            const nestedBody = getBody(part)
            if (nestedBody) return nestedBody
          }
        }
      }
      
      return ''
    }

    return {
      id: message.id,
      threadId: message.threadId,
      subject: getHeader('Subject'),
      sender: getHeader('From'),
      recipient: getHeader('To'),
      date: new Date(parseInt(message.internalDate)),
      body: getBody(message.payload),
      labels: message.labelIds || [],
    }
  }

  async searchEmails(query: string, limit: number = 10) {
    return this.getEmails(query, limit)
  }

  async getRecentEmails(limit: number = 10) {
    return this.getEmails('', limit)
  }

  async getEmailsBySender(sender: string, limit: number = 10) {
    return this.getEmails(`from:${sender}`, limit)
  }

  async getEmailsBySubject(subject: string, limit: number = 10) {
    return this.getEmails(`subject:${subject}`, limit)
  }
}

export async function getGmailService() {
  const session = await getServerSession(authOptions)
  
  if (!session?.accessToken) {
    throw new Error('No Gmail access token found')
  }

  return new GmailService(session.accessToken as string)
}
