import { Client } from '@hubspot/api-client'

export class HubSpotService {
  private client: Client

  constructor(accessToken: string) {
    this.client = new Client({ accessToken })
  }

  async getContacts(limit: number = 100) {
    try {
      const response = await this.client.crm.contacts.getAll(
        undefined,
        undefined,
        undefined,
        limit,
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

      return response.results.map(contact => ({
        contactId: contact.id,
        email: contact.properties.email,
        firstName: contact.properties.firstname,
        lastName: contact.properties.lastname,
        company: contact.properties.company,
        phone: contact.properties.phone,
        createdAt: contact.properties.createdate ? new Date(contact.properties.createdate) : null,
        updatedAt: contact.properties.lastmodifieddate ? new Date(contact.properties.lastmodifieddate) : null,
        properties: contact.properties,
      }))
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
        email: response.properties.email,
        firstName: response.properties.firstname,
        lastName: response.properties.lastname,
        company: response.properties.company,
        phone: response.properties.phone,
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
          email: contactData.email,
          firstname: contactData.firstName,
          lastname: contactData.lastName,
          company: contactData.company,
          phone: contactData.phone,
        },
      })

      return {
        contactId: response.id,
        email: response.properties.email,
        firstName: response.properties.firstname,
        lastName: response.properties.lastname,
        company: response.properties.company,
        phone: response.properties.phone,
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
            email: contactData.email,
            firstname: contactData.firstName,
            lastname: contactData.lastName,
            company: contactData.company,
            phone: contactData.phone,
          },
        }
      )

      return {
        contactId: response.id,
        email: response.properties.email,
        firstName: response.properties.firstname,
        lastName: response.properties.lastname,
        company: response.properties.company,
        phone: response.properties.phone,
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
      const response = await this.client.crm.objects.notes.basicApi.getPage(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        [`hs_associated_contact=${contactId}`]
      )

      return response.results.map(note => ({
        noteId: note.id,
        content: note.properties.hs_note_body,
        createdAt: note.properties.createdate ? new Date(note.properties.createdate) : null,
      }))
    } catch (error) {
      console.error('Error fetching contact notes:', error)
      throw error
    }
  }

  async createContactNote(contactId: string, content: string) {
    try {
      const response = await this.client.crm.objects.notes.basicApi.create({
        properties: {
          hs_note_body: content,
        },
        associations: [
          {
            to: { id: contactId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 214 }]
          }
        ]
      })

      return {
        noteId: response.id,
        content: response.properties.hs_note_body,
        createdAt: response.properties.createdate ? new Date(response.properties.createdate) : null,
      }
    } catch (error) {
      console.error('Error creating contact note:', error)
      throw error
    }
  }

  async searchContactsByEmail(email: string) {
    try {
      const response = await this.client.crm.contacts.searchApi.doSearch({
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'email',
                operator: 'EQ',
                value: email,
              },
            ],
          },
        ],
        sorts: [],
        properties: [
          'email',
          'firstname',
          'lastname',
          'company',
          'phone',
          'createdate',
          'lastmodifieddate'
        ],
        limit: 1,
      })

      if (response.results.length > 0) {
        const contact = response.results[0]
        return {
          contactId: contact.id,
          email: contact.properties.email,
          firstName: contact.properties.firstname,
          lastName: contact.properties.lastname,
          company: contact.properties.company,
          phone: contact.properties.phone,
          createdAt: contact.properties.createdate ? new Date(contact.properties.createdate) : null,
          updatedAt: contact.properties.lastmodifieddate ? new Date(contact.properties.lastmodifieddate) : null,
          properties: contact.properties,
        }
      }

      return null
    } catch (error) {
      console.error('Error searching contacts:', error)
      throw error
    }
  }

  async sendEmail(to: string, subject: string, body: string) {
    try {
      console.log('📧 HubSpot sendEmail called:', { to, subject, body: body.substring(0, 100) + '...' })
      
      // Use HubSpot Conversations API to send transactional emails
      const response = await this.client.conversations.conversationsApi.create({
        type: 'EMAIL',
        properties: {
          subject: subject,
          text: body,
          to: to,
          from: 'noreply@yourcompany.com', // This should be configured
        }
      })

      console.log('📧 HubSpot email sent successfully:', response.id)
      return {
        success: true,
        messageId: response.id,
        to: to,
        subject: subject
      }
    } catch (error) {
      console.error('Error sending email via HubSpot:', error)
      
      // If HubSpot Conversations API fails, try alternative approach
      try {
        console.log('📧 Trying alternative HubSpot email method...')
        
        // Create a conversation thread and send message
        const conversationResponse = await this.client.conversations.conversationsApi.create({
          type: 'EMAIL',
          properties: {
            subject: subject,
            text: body,
            to: to,
          }
        })

        console.log('📧 HubSpot email sent via alternative method:', conversationResponse.id)
        return {
          success: true,
          messageId: conversationResponse.id,
          to: to,
          subject: subject,
          method: 'alternative'
        }
      } catch (altError) {
        console.error('Alternative HubSpot email method also failed:', altError)
        throw new Error(`HubSpot email sending failed: ${error.message}`)
      }
    }
  }
}
