import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

export class GoogleService {
  private oauth2Client: OAuth2Client

  constructor(accessToken: string, refreshToken?: string) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    )
    
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
  }

  async getGmailService() {
    return google.gmail({ version: 'v1', auth: this.oauth2Client })
  }

  async getCalendarService() {
    return google.calendar({ version: 'v3', auth: this.oauth2Client })
  }

  async listEmails(userId: string, maxResults: number = 100) {
    const gmail = await this.getGmailService()
    
    try {
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults,
      })

      const messages = response.data.messages || []
      const emailDetails = []

      for (const message of messages) {
        const messageDetail = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'full',
        })

        const payload = messageDetail.data.payload!
        const headers = payload.headers || []
        
        const subject = headers.find(h => h.name === 'Subject')?.value || ''
        const sender = headers.find(h => h.name === 'From')?.value || ''
        const recipient = headers.find(h => h.name === 'To')?.value || ''
        const date = headers.find(h => h.name === 'Date')?.value || ''
        
        let body = ''
        if (payload.body?.data) {
          body = Buffer.from(payload.body.data, 'base64').toString()
        } else if (payload.parts) {
          // Handle multipart messages
          for (const part of payload.parts) {
            if (part.mimeType === 'text/plain' && part.body?.data) {
              body = Buffer.from(part.body.data, 'base64').toString()
              break
            }
          }
        }

        emailDetails.push({
          messageId: message.id!,
          threadId: messageDetail.data.threadId!,
          subject,
          sender,
          recipient,
          body,
          date: new Date(date),
          labels: (messageDetail.data.labelIds || []).join(','),
        })
      }

      return emailDetails
    } catch (error) {
      console.error('Error fetching emails:', error)
      throw error
    }
  }

  async sendEmail(to: string, subject: string, body: string) {
    const gmail = await this.getGmailService()
    
    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      '',
      body
    ].join('\n')

    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

    try {
      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      })
      return response.data
    } catch (error) {
      console.error('Error sending email:', error)
      throw error
    }
  }

  async listCalendarEvents(timeMin?: string, timeMax?: string) {
    const calendar = await this.getCalendarService()
    
    try {
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin || new Date().toISOString(),
        timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        singleEvents: true,
        orderBy: 'startTime',
      })

      return response.data.items || []
    } catch (error) {
      console.error('Error fetching calendar events:', error)
      throw error
    }
  }

  async createCalendarEvent(event: {
    summary: string
    description?: string
    start: { dateTime: string; timeZone?: string }
    end: { dateTime: string; timeZone?: string }
    attendees?: { email: string }[]
  }) {
    const calendar = await this.getCalendarService()
    
    try {
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      })
      return response.data
    } catch (error) {
      console.error('Error creating calendar event:', error)
      throw error
    }
  }

  async getAvailableTimeSlots(startDate: string, endDate: string, duration: number = 60) {
    const calendar = await this.getCalendarService()
    
    try {
      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: startDate,
          timeMax: endDate,
          items: [{ id: 'primary' }],
        },
      })

      const busyTimes = response.data.calendars?.primary?.busy || []
      
      // Generate available time slots (simplified logic)
      const availableSlots = []
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      // This is a simplified implementation - in practice, you'd want more sophisticated logic
      for (let time = new Date(start); time < end; time.setMinutes(time.getMinutes() + duration)) {
        const slotEnd = new Date(time.getTime() + duration * 60 * 1000)
        
        // Check if this slot conflicts with busy times
        const isBusy = busyTimes.some(busy => {
          const busyStart = new Date(busy.start!)
          const busyEnd = new Date(busy.end!)
          return (time < busyEnd && slotEnd > busyStart)
        })
        
        if (!isBusy) {
          availableSlots.push({
            start: new Date(time),
            end: new Date(slotEnd),
          })
        }
      }
      
      return availableSlots
    } catch (error) {
      console.error('Error getting available time slots:', error)
      throw error
    }
  }

  async updateCalendarEvent(eventId: string, event: {
    summary?: string
    description?: string
    start?: { dateTime: string; timeZone?: string }
    end?: { dateTime: string; timeZone?: string }
    attendees?: { email: string }[]
  }) {
    const calendar = await this.getCalendarService()
    
    try {
      const response = await calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        requestBody: event,
      })
      return response.data
    } catch (error) {
      console.error('Error updating calendar event:', error)
      throw error
    }
  }

  async deleteCalendarEvent(eventId: string) {
    const calendar = await this.getCalendarService()
    
    try {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
      })
      return { success: true }
    } catch (error) {
      console.error('Error deleting calendar event:', error)
      throw error
    }
  }

  async getCalendarEvent(eventId: string) {
    const calendar = await this.getCalendarService()
    
    try {
      const response = await calendar.events.get({
        calendarId: 'primary',
        eventId: eventId,
      })
      return response.data
    } catch (error) {
      console.error('Error getting calendar event:', error)
      throw error
    }
  }

  async findMeetingTime(attendees: string[], duration: number = 60, timeMin?: string, timeMax?: string) {
    const calendar = await this.getCalendarService()
    
    try {
      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: timeMin || new Date().toISOString(),
          timeMax: timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          items: [
            { id: 'primary' },
            ...attendees.map(email => ({ id: email }))
          ],
        },
      })

      // Find common free time slots
      const calendars = response.data.calendars || {}
      const busyTimes = Object.values(calendars).flatMap(cal => cal.busy || [])
      
      // Sort busy times by start time
      busyTimes.sort((a, b) => new Date(a.start!).getTime() - new Date(b.start!).getTime())
      
      // Find gaps between busy times
      const freeSlots = []
      const start = new Date(timeMin || new Date())
      const end = new Date(timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
      
      let currentTime = new Date(start)
      
      for (const busy of busyTimes) {
        const busyStart = new Date(busy.start!)
        const busyEnd = new Date(busy.end!)
        
        // Check if there's a gap before this busy time
        if (currentTime < busyStart) {
          const gapDuration = busyStart.getTime() - currentTime.getTime()
          if (gapDuration >= duration * 60 * 1000) {
            freeSlots.push({
              start: new Date(currentTime),
              end: new Date(busyStart),
            })
          }
        }
        
        // Move current time to after this busy period
        if (busyEnd > currentTime) {
          currentTime = new Date(busyEnd)
        }
      }
      
      // Check for free time after the last busy period
      if (currentTime < end) {
        const remainingDuration = end.getTime() - currentTime.getTime()
        if (remainingDuration >= duration * 60 * 1000) {
          freeSlots.push({
            start: new Date(currentTime),
            end: new Date(end),
          })
        }
      }
      
      return freeSlots.slice(0, 10) // Return top 10 available slots
    } catch (error) {
      console.error('Error finding meeting time:', error)
      throw error
    }
  }

  async getCalendarList() {
    const calendar = await this.getCalendarService()
    
    try {
      const response = await calendar.calendarList.list()
      return response.data.items || []
    } catch (error) {
      console.error('Error getting calendar list:', error)
      throw error
    }
  }

  async createRecurringEvent(event: {
    summary: string
    description?: string
    start: { dateTime: string; timeZone?: string }
    end: { dateTime: string; timeZone?: string }
    attendees?: { email: string }[]
    recurrence?: string[]
  }) {
    const calendar = await this.getCalendarService()
    
    try {
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          ...event,
          recurrence: event.recurrence,
        },
      })
      return response.data
    } catch (error) {
      console.error('Error creating recurring event:', error)
      throw error
    }
  }
}
