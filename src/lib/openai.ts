import OpenAI from 'openai'
import { GoogleService } from './google'
import { HubSpotService } from './hubspot'
import { rateLimiter } from './rate-limiter'
import { RAGService } from './rag'
import { prisma } from './prisma'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export class AIService {
  private googleService?: GoogleService
  private hubspotService?: HubSpotService
  private ragService: RAGService
  private userId: string

  constructor(userId: string, googleTokens?: { accessToken: string; refreshToken?: string }, hubspotTokens?: { accessToken: string }) {
    this.userId = userId
    this.ragService = new RAGService(userId)
    
    console.log('🔧 AIService constructor - Google tokens:', !!googleTokens)
    console.log('🔧 AIService constructor - HubSpot tokens:', !!hubspotTokens)
    
    if (googleTokens) {
      this.googleService = new GoogleService(googleTokens.accessToken, googleTokens.refreshToken)
      console.log('🔧 AIService constructor - Google service created')
    }
    
    if (hubspotTokens) {
      this.hubspotService = new HubSpotService(hubspotTokens.accessToken)
      console.log('🔧 AIService constructor - HubSpot service created')
    }
  }

  private getTools() {
    return [
      {
        type: "function" as const,
        function: {
          name: "send_email",
          description: "Send an email to a recipient",
          parameters: {
            type: "object",
            properties: {
              to: { type: "string", description: "Email address of the recipient" },
              subject: { type: "string", description: "Subject of the email" },
              body: { type: "string", description: "Body content of the email" },
            },
            required: ["to", "subject", "body"],
          },
        },
      },
      {
        type: "function" as const,
        function: {
          name: "create_calendar_event",
          description: "Create a calendar event",
          parameters: {
            type: "object",
            properties: {
              summary: { type: "string", description: "Title of the event" },
              description: { type: "string", description: "Description of the event" },
              startDateTime: { type: "string", description: "Start date and time (ISO string)" },
              endDateTime: { type: "string", description: "End date and time (ISO string)" },
              attendees: { 
                type: "array", 
                items: { type: "string" },
                description: "Email addresses of attendees" 
              },
            },
            required: ["summary", "startDateTime", "endDateTime"],
          },
        },
      },
      {
        type: "function" as const,
        function: {
          name: "get_available_time_slots",
          description: "Get available time slots for scheduling",
          parameters: {
            type: "object",
            properties: {
              startDate: { type: "string", description: "Start date for availability search (ISO string)" },
              endDate: { type: "string", description: "End date for availability search (ISO string)" },
              duration: { type: "number", description: "Duration of the meeting in minutes", default: 60 },
            },
            required: ["startDate", "endDate"],
          },
        },
      },
      {
        type: "function" as const,
        function: {
          name: "search_hubspot_contacts",
          description: "Search for contacts in HubSpot",
          parameters: {
            type: "object",
            properties: {
              email: { type: "string", description: "Email to search for" },
              name: { type: "string", description: "Name to search for" },
            },
          },
        },
      },
      {
        type: "function" as const,
        function: {
          name: "create_hubspot_contact",
          description: "Create a new contact in HubSpot",
          parameters: {
            type: "object",
            properties: {
              email: { type: "string", description: "Email address" },
              firstName: { type: "string", description: "First name" },
              lastName: { type: "string", description: "Last name" },
              company: { type: "string", description: "Company name" },
              phone: { type: "string", description: "Phone number" },
            },
            required: ["email"],
          },
        },
      },
      {
        type: "function" as const,
        function: {
          name: "create_hubspot_note",
          description: "Create a note for a contact in HubSpot",
          parameters: {
            type: "object",
            properties: {
              contactId: { type: "string", description: "HubSpot contact ID" },
              content: { type: "string", description: "Note content" },
            },
            required: ["contactId", "content"],
          },
        },
      },
      {
        type: "function" as const,
        function: {
          name: "create_task",
          description: "Create a task to track multi-step workflows",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "Task title" },
              description: { type: "string", description: "Task description" },
              type: { 
                type: "string", 
                enum: ["EMAIL", "CALENDAR", "HUBSPOT", "GENERAL"],
                description: "Type of task" 
              },
              metadata: { 
                type: "object", 
                description: "Additional metadata for the task" 
              },
              totalSteps: { type: "number", description: "Total number of steps", default: 1 },
            },
            required: ["title", "type"],
          },
        },
      },
      {
        type: "function" as const,
        function: {
          name: "update_task",
          description: "Update a task's status or step",
          parameters: {
            type: "object",
            properties: {
              taskId: { type: "string", description: "Task ID to update" },
              status: { 
                type: "string", 
                enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED", "CANCELLED"],
                description: "New status of the task" 
              },
              currentStep: { type: "number", description: "Current step number" },
              stepData: { type: "object", description: "Data for the current step" },
            },
            required: ["taskId"],
          },
        },
      },
      {
        type: "function" as const,
        function: {
          name: "get_active_tasks",
          description: "Get all active tasks for the user",
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "continue_task",
          description: "Continue with the next step of an existing task",
          parameters: {
            type: "object",
            properties: {
              taskId: { type: "string", description: "The ID of the task to continue" },
              userMessage: { type: "string", description: "Optional user message to provide context" }
            },
            required: ["taskId"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "cancel_task",
          description: "Cancel an active task",
          parameters: {
            type: "object",
            properties: {
              taskId: { type: "string", description: "The ID of the task to cancel" },
              reason: { type: "string", description: "Reason for cancellation" }
            },
            required: ["taskId"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "search_emails",
          description: "Search through imported Gmail emails",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query (sender, subject, keywords, etc.)" },
              limit: { type: "number", description: "Maximum number of emails to return", default: 5 },
            },
            required: ["query"],
          },
        },
      },
      {
        type: "function" as const,
        function: {
          name: "search_notes",
          description: "Search through HubSpot contact notes",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query for note content" },
              limit: { type: "number", description: "Maximum number of notes to return", default: 5 },
            },
            required: ["query"],
          },
        },
      },
      {
        type: "function" as const,
        function: {
          name: "update_calendar_event",
          description: "Update an existing calendar event",
          parameters: {
            type: "object",
            properties: {
              eventId: { type: "string", description: "ID of the event to update" },
              summary: { type: "string", description: "Event title" },
              description: { type: "string", description: "Event description" },
              start: { type: "object", description: "Start time with timezone" },
              end: { type: "object", description: "End time with timezone" },
              attendees: { type: "array", items: { type: "string" }, description: "List of attendee email addresses" }
            },
            required: ["eventId"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "delete_calendar_event",
          description: "Delete a calendar event",
          parameters: {
            type: "object",
            properties: {
              eventId: { type: "string", description: "ID of the event to delete" }
            },
            required: ["eventId"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "find_meeting_time",
          description: "Find optimal meeting time for multiple attendees",
          parameters: {
            type: "object",
            properties: {
              attendees: { type: "array", items: { type: "string" }, description: "List of attendee email addresses" },
              duration: { type: "number", description: "Meeting duration in minutes (default: 60)" },
              timeMin: { type: "string", description: "Earliest possible time (ISO string)" },
              timeMax: { type: "string", description: "Latest possible time (ISO string)" }
            },
            required: ["attendees"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "get_calendar_event",
          description: "Get details of a specific calendar event",
          parameters: {
            type: "object",
            properties: {
              eventId: { type: "string", description: "ID of the event to retrieve" }
            },
            required: ["eventId"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "create_recurring_event",
          description: "Create a recurring calendar event",
          parameters: {
            type: "object",
            properties: {
              summary: { type: "string", description: "Event title" },
              description: { type: "string", description: "Event description" },
              start: { type: "object", description: "Start time with timezone" },
              end: { type: "object", description: "End time with timezone" },
              attendees: { type: "array", items: { type: "string" }, description: "List of attendee email addresses" },
              recurrence: { type: "array", items: { type: "string" }, description: "Recurrence rules (e.g., ['RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR'])" }
            },
            required: ["summary", "start", "end"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "search_meetings",
          description: "Search through meeting data using RAG",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query for meeting content" },
              limit: { type: "number", description: "Maximum number of meetings to return", default: 5 },
            },
            required: ["query"],
          },
        },
      },
      {
        type: "function" as const,
        function: {
          name: "import_meeting_data",
          description: "Import meeting data from Google Calendar for RAG",
          parameters: {
            type: "object",
            properties: {
              meetings: { type: "array", items: { type: "object" }, description: "Array of meeting objects to import" },
            },
            required: ["meetings"],
          },
        },
      }
    ]
  }

  async executeToolCall(toolCall: any) {
    const { name, arguments: args } = toolCall.type === 'function' ? toolCall.function : toolCall
    const parsedArgs = JSON.parse(args)

    try {
      switch (name) {
        case "send_email":
          // Try HubSpot first if available, fallback to Google
          if (this.hubspotService && parsedArgs.useHubspot !== false) {
            console.log('📧 Sending email via HubSpot')
            return await this.hubspotService.sendEmail(parsedArgs.to, parsedArgs.subject, parsedArgs.body)
          } else if (this.googleService) {
            console.log('📧 Sending email via Google Gmail')
            return await this.googleService.sendEmail(parsedArgs.to, parsedArgs.subject, parsedArgs.body)
          } else {
            throw new Error("No email service available (Google or HubSpot)")
          }

        case "create_calendar_event":
          if (!this.googleService) throw new Error("Google service not available")
          return await this.googleService.createCalendarEvent({
            summary: parsedArgs.summary,
            description: parsedArgs.description,
            start: { dateTime: parsedArgs.startDateTime, timeZone: 'America/New_York' },
            end: { dateTime: parsedArgs.endDateTime, timeZone: 'America/New_York' },
            attendees: parsedArgs.attendees?.map((email: string) => ({ email })),
          })

        case "get_available_time_slots":
          if (!this.googleService) throw new Error("Google service not available")
          return await this.googleService.getAvailableTimeSlots(
            parsedArgs.startDate,
            parsedArgs.endDate,
            parsedArgs.duration
          )

        case "update_calendar_event":
          if (!this.googleService) throw new Error("Google service not available")
          return await this.googleService.updateCalendarEvent(parsedArgs.eventId, {
            summary: parsedArgs.summary,
            description: parsedArgs.description,
            start: parsedArgs.start,
            end: parsedArgs.end,
            attendees: parsedArgs.attendees?.map((email: string) => ({ email })),
          })

        case "delete_calendar_event":
          if (!this.googleService) throw new Error("Google service not available")
          return await this.googleService.deleteCalendarEvent(parsedArgs.eventId)

        case "find_meeting_time":
          if (!this.googleService) throw new Error("Google service not available")
          return await this.googleService.findMeetingTime(
            parsedArgs.attendees,
            parsedArgs.duration,
            parsedArgs.timeMin,
            parsedArgs.timeMax
          )

        case "get_calendar_event":
          if (!this.googleService) throw new Error("Google service not available")
          return await this.googleService.getCalendarEvent(parsedArgs.eventId)

        case "create_recurring_event":
          if (!this.googleService) throw new Error("Google service not available")
          return await this.googleService.createRecurringEvent({
            summary: parsedArgs.summary,
            description: parsedArgs.description,
            start: parsedArgs.start,
            end: parsedArgs.end,
            attendees: parsedArgs.attendees?.map((email: string) => ({ email })),
            recurrence: parsedArgs.recurrence,
          })

        case "search_meetings":
          return await this.ragService.searchMeetings(parsedArgs.query, parsedArgs.limit)

        case "import_meeting_data":
          return await this.ragService.importMeetingData(parsedArgs.meetings)

        case "search_hubspot_contacts":
          if (!this.hubspotService) throw new Error("HubSpot service not available")
          if (parsedArgs.email) {
            return await this.hubspotService.searchContactsByEmail(parsedArgs.email)
          }
          // Add name search logic if needed
          return null

        case "create_hubspot_contact":
          if (!this.hubspotService) throw new Error("HubSpot service not available")
          return await this.hubspotService.createContact(parsedArgs)

        case "create_hubspot_note":
          if (!this.hubspotService) throw new Error("HubSpot service not available")
          return await this.hubspotService.createContactNote(parsedArgs.contactId, parsedArgs.content)

        case "create_task":
          return await prisma.task.create({
            data: {
              userId: this.userId,
              title: parsedArgs.title,
              description: parsedArgs.description,
              type: parsedArgs.type,
              metadata: parsedArgs.metadata,
              totalSteps: parsedArgs.totalSteps,
            },
          })

        case "update_task":
          return await prisma.task.update({
            where: { id: parsedArgs.taskId },
            data: {
              status: parsedArgs.status,
              currentStep: parsedArgs.currentStep,
              stepData: parsedArgs.stepData,
            },
          })

        case "get_active_tasks":
          return await prisma.task.findMany({
            where: {
              userId: this.userId,
              status: {
                in: ['PENDING', 'IN_PROGRESS']
              }
            },
            orderBy: { createdAt: 'desc' }
          })

        case "continue_task":
          const task = await prisma.task.findUnique({
            where: { id: parsedArgs.taskId }
          })
          if (!task) {
            throw new Error('Task not found')
          }
          return { task, userMessage: parsedArgs.userMessage }

        case "cancel_task":
          return await prisma.task.update({
            where: { id: parsedArgs.taskId },
            data: {
              status: 'CANCELLED',
              stepData: { cancellationReason: parsedArgs.reason }
            }
          })

        case 'search_emails':
        case 'gmail_search_emails':
        case 'search_gmail_emails':
        case 'find_emails':
        case 'get_emails':
          console.log('🔍 Executing email search with query:', parsedArgs.query)
          const emailResults = await this.ragService.searchEmails(parsedArgs.query, Math.min(parsedArgs.limit || 3, 3), this.googleService)
          console.log('📧 Email search results:', emailResults.length, 'emails found')
          return emailResults

        case 'search_notes':
        case 'hubspot_search_notes':
          console.log('🔍 Executing note search with query:', parsedArgs.query)
          const noteResults = await this.ragService.searchNotes(parsedArgs.query, Math.min(parsedArgs.limit || 5, 5))
          console.log('📝 Note search results:', noteResults.length, 'notes found')
          return noteResults

        default:
          throw new Error(`Unknown tool: ${name}`)
      }
    } catch (error) {
      console.error(`Error executing tool ${name}:`, error)
      throw error
    }
  }

  async getRAGContext(query: string, limit: number = 10) {
    return await this.ragService.getContextForQuery(query, limit, this.googleService)
  }

  async generateResponse(messages: any[], context?: any) {
    // Rate limiting
    await rateLimiter.checkLimit()
    
    // Get RAG context for the user's query if not provided
    let ragContext = context
    if (!ragContext && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === 'user') {
        try {
          ragContext = await this.getRAGContext(lastMessage.content, 10)
        } catch (error) {
          console.error('Error getting RAG context:', error)
        }
      }
    }
    
    const systemMessage = {
      role: "system" as const,
      content: `You are an AI assistant for financial advisors. You have access to the user's HubSpot contacts and contact notes through RAG (Retrieval-Augmented Generation).

IMPORTANT: Always search for relevant information before answering questions about:
- Clients, contacts, or people
- Financial advice, investments, or portfolio information
- Any specific names, companies, or topics mentioned
- Contact notes and communication history

Available tools: search_contacts, search_notes, create_hubspot_contact, create_hubspot_note

${ragContext ? `Current context from RAG search:
${this.formatRAGContext(ragContext)}` : ''}

Use the search tools to find relevant information before providing answers. Be specific and cite sources when possible.`
    }

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [systemMessage, ...messages],
        tools: this.getTools(),
        tool_choice: "auto",
        max_tokens: 1000, // Limit response length
      })

      const message = response.choices[0].message

      if (message.tool_calls) {
        const toolResults = []
        
        for (const toolCall of message.tool_calls) {
          try {
            const result = await this.executeToolCall(toolCall)
            toolResults.push({
              tool_call_id: toolCall.id,
              role: "tool" as const,
              name: toolCall.type === 'function' ? toolCall.function.name : 'unknown',
              content: JSON.stringify(result),
            })
          } catch (error) {
            toolResults.push({
              tool_call_id: toolCall.id,
              role: "tool" as const,
              name: toolCall.type === 'function' ? toolCall.function.name : 'unknown',
              content: JSON.stringify({ error: (error as Error).message }),
            })
          }
        }

        // Get final response after tool execution
        const finalResponse = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [systemMessage, ...messages, message, ...toolResults],
        })

        return finalResponse.choices[0].message
      }

      return message
    } catch (error) {
      console.error('Error generating response:', error)
      throw error
    }
  }

  private formatRAGContext(context: any): string {
    if (!context) return ''
    
    let formatted = ''
    
    if (context.contacts && context.contacts.length > 0) {
      formatted += `\nRelevant Contacts (${context.contacts.length}):\n`
      context.contacts.forEach((contact: any, index: number) => {
        formatted += `${index + 1}. Name: ${contact.name}\n   Email: ${contact.email}\n   Company: ${contact.company}\n\n`
      })
    }
    
    if (context.notes && context.notes.length > 0) {
      formatted += `\nRelevant Notes (${context.notes.length}):\n`
      context.notes.forEach((note: any, index: number) => {
        formatted += `${index + 1}. Contact: ${note.contactName}\n   Content: ${note.content}\n   Date: ${note.date}\n\n`
      })
    }
    
    return formatted
  }
}
