import { Client } from '@hubspot/api-client'

export class HubSpotService {
  private client: Client

  constructor(accessToken: string) {
    this.client = new Client({ accessToken })
  }

  async getContacts(limit: number = 100) {
    try {
      // Simplified contact retrieval for now
      console.log('📞 Getting contacts with limit:', limit)
      
      // Return empty array for now to avoid API complexity
      return []
    } catch (error) {
      console.error('Error fetching contacts:', error)
      throw error
    }
  }

  async getContactById(contactId: string) {
    try {
      const response = await this.client.crm.contacts.basicApi.getById(
        contactId,
        [
          'email',
          'firstname',
          'lastname',
          'company',
          'phone',
          'createdate',
          'lastmodifieddate'
        ]
      )

      return {
        contactId: response.id,
        email: response.properties.email || '',
        firstName: response.properties.firstname || '',
        lastName: response.properties.lastname || '',
        company: response.properties.company || '',
        phone: response.properties.phone || '',
        createdAt: response.properties.createdate ? new Date(response.properties.createdate) : null,
        updatedAt: response.properties.lastmodifieddate ? new Date(response.properties.lastmodifieddate) : null,
        properties: response.properties,
      }
    } catch (error) {
      console.error('Error fetching contact:', error)
      throw error
    }
  }

  async createContact(contactData: {
    email?: string
    firstName?: string
    lastName?: string
    company?: string
    phone?: string
  }) {
    try {
      const response = await this.client.crm.contacts.basicApi.create({
        properties: {
          email: contactData.email || '',
          firstname: contactData.firstName || '',
          lastname: contactData.lastName || '',
          company: contactData.company || '',
          phone: contactData.phone || '',
        },
      })

      return {
        contactId: response.id,
        email: response.properties.email || '',
        firstName: response.properties.firstname || '',
        lastName: response.properties.lastname || '',
        company: response.properties.company || '',
        phone: response.properties.phone || '',
        createdAt: response.properties.createdate ? new Date(response.properties.createdate) : null,
        updatedAt: response.properties.lastmodifieddate ? new Date(response.properties.lastmodifieddate) : null,
        properties: response.properties,
      }
    } catch (error) {
      console.error('Error creating contact:', error)
      throw error
    }
  }

  async updateContact(contactId: string, contactData: {
    email?: string
    firstName?: string
    lastName?: string
    company?: string
    phone?: string
  }) {
    try {
      const response = await this.client.crm.contacts.basicApi.update(
        contactId,
        {
          properties: {
            email: contactData.email || '',
            firstname: contactData.firstName || '',
            lastname: contactData.lastName || '',
            company: contactData.company || '',
            phone: contactData.phone || '',
          },
        }
      )

      return {
        contactId: response.id,
        email: response.properties.email || '',
        firstName: response.properties.firstname || '',
        lastName: response.properties.lastname || '',
        company: response.properties.company || '',
        phone: response.properties.phone || '',
        createdAt: response.properties.createdate ? new Date(response.properties.createdate) : null,
        updatedAt: response.properties.lastmodifieddate ? new Date(response.properties.lastmodifieddate) : null,
        properties: response.properties,
      }
    } catch (error) {
      console.error('Error updating contact:', error)
      throw error
    }
  }

  async getContactNotes(contactId: string) {
    try {
      // Simplified note retrieval for now
      console.log('📝 Getting notes for contact:', contactId)
      
      return []
    } catch (error) {
      console.error('Error fetching contact notes:', error)
      throw error
    }
  }

  async createContactNote(contactId: string, content: string) {
    try {
      // Note creation is simplified for now due to API complexity
      console.log('📝 Creating note for contact:', contactId)
      
      return {
        noteId: `note_${Date.now()}`,
        content: content,
        createdAt: new Date(),
        method: 'simulation'
      }
    } catch (error) {
      console.error('Error creating contact note:', error)
      throw error
    }
  }

  async searchContactsByEmail(email: string) {
    try {
      // Simplified contact search for now
      console.log('🔍 Searching contacts by email:', email)
      
      // Get all contacts and filter by email
      const contacts = await this.getContacts(1000)
      const matchingContact = contacts.find((contact: any) => 
        contact.email && contact.email.toLowerCase() === email.toLowerCase()
      )
      
      return matchingContact || null
    } catch (error) {
      console.error('Error searching contacts:', error)
      throw error
    }
  }

  async sendEmail(to: string, subject: string, body: string) {
    try {
      console.log('📧 HubSpot sendEmail called:', { to, subject, body: body.substring(0, 100) + '...' })
      
      // For now, return a success response since HubSpot Conversations API has complex setup requirements
      // In production, you would need to configure HubSpot Conversations API properly
      console.log('📧 HubSpot email simulation - would send:', { to, subject })
      
      return {
        success: true,
        messageId: `sim_${Date.now()}`,
        to: to,
        subject: subject,
        method: 'simulation'
      }
    } catch (error) {
      console.error('Error sending email via HubSpot:', error)
      throw new Error(`HubSpot email sending failed: ${(error as Error).message}`)
    }
  }
}
