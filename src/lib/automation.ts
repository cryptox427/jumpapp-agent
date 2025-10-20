import { prisma } from './prisma'
import { AIService } from './openai'
import { GoogleService } from './google'
import { HubSpotService } from './hubspot'

export interface WebhookEvent {
  id: string
  type: 'EMAIL_RECEIVED' | 'CALENDAR_EVENT_CREATED' | 'CALENDAR_EVENT_UPDATED' | 'CALENDAR_EVENT_CANCELLED' | 'HUBSPOT_CONTACT_CREATED' | 'HUBSPOT_CONTACT_UPDATED' | 'HUBSPOT_DEAL_CREATED' | 'HUBSPOT_DEAL_UPDATED'
  userId: string
  data: any
  timestamp: Date
  processed: boolean
}

export interface AutomationRule {
  id: string
  userId: string
  name: string
  description: string
  trigger: {
    type: string
    conditions: any
  }
  actions: Array<{
    type: string
    parameters: any
  }>
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

export class AutomationService {
  private aiService: AIService

  constructor(userId: string, googleTokens?: { accessToken: string; refreshToken?: string }, hubspotTokens?: { accessToken: string }) {
    this.aiService = new AIService(userId, googleTokens, hubspotTokens)
  }

  async processWebhook(event: WebhookEvent) {
    try {
      // Store the webhook event
      await prisma.webhookEvent.create({
        data: {
          id: event.id,
          type: event.type,
          userId: event.userId,
          data: event.data,
          timestamp: event.timestamp,
          processed: false,
        },
      })

      // Find matching automation rules
      const rules = await this.getMatchingRules(event.type, event.data)
      
      // Execute automation actions
      for (const rule of rules) {
        await this.executeAutomationRule(rule, event)
      }

      // Mark event as processed
      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: { processed: true },
      })

      return { success: true, rulesExecuted: rules.length }
    } catch (error) {
      console.error('Webhook processing error:', error)
      throw error
    }
  }

  async getMatchingRules(eventType: string, eventData: any): Promise<AutomationRule[]> {
    // @ts-ignore - workaround for missing automationRule on some generated prisma types
    const rules = await (prisma as any).automationRule.findMany({
      where: {
        userId: (this.aiService as any).userId,
        enabled: true,
      },
    });

    // Filter by trigger type in app logic (Prisma JSON path filter removed for portability)
    const filteredRules: AutomationRule[] = rules.filter((r: AutomationRule) => r.trigger?.type === eventType);

    // Filter rules based on conditions
    const matchingRules: AutomationRule[] = [];
    for (const rule of filteredRules) {
      if (await this.evaluateConditions(rule.trigger.conditions, eventData)) {
        matchingRules.push(rule)
      }
    }

    return matchingRules
  }

  async evaluateConditions(conditions: any, eventData: any): Promise<boolean> {
    // Simple condition evaluation - can be enhanced
    for (const [key, value] of Object.entries(conditions)) {
      if (eventData[key] !== value) {
        return false
      }
    }
    return true
  }

  async executeAutomationRule(rule: AutomationRule, event: WebhookEvent) {
    try {
      for (const action of rule.actions) {
        await this.executeAction(action, event)
      }

      // Log the automation execution
      await prisma.automationExecution.create({
        data: {
          ruleId: rule.id,
          eventId: event.id,
          userId: this.aiService['userId'],
          userId: this.aiService['userId'],
          status: 'SUCCESS',
          executedAt: new Date(),
        },
      })
    } catch (error) {
      // Log failed execution
      await (prisma as any).automationExecution.create({
        data: {
          ruleId: rule.id,
          eventId: event.id,
          userId: this.aiService['userId'],
          status: 'FAILED',
          error: (error as Error).message,
          executedAt: new Date(),
        },
      })
      throw error
    }
  }

  async executeAction(action: { type: string; parameters: any }, event: WebhookEvent) {
    switch (action.type) {
      case 'SEND_EMAIL':
        await this.aiService.executeToolCall({
          function: {
            name: 'send_email',
            arguments: JSON.stringify({
              to: action.parameters.to,
              subject: action.parameters.subject,
              body: action.parameters.body,
            }),
          },
        })
        break

      case 'CREATE_CALENDAR_EVENT':
        await this.aiService.executeToolCall({
          function: {
            name: 'create_calendar_event',
            arguments: JSON.stringify({
              summary: action.parameters.summary,
              description: action.parameters.description,
              startDateTime: action.parameters.startDateTime,
              endDateTime: action.parameters.endDateTime,
              attendees: action.parameters.attendees,
            }),
          },
        })
        break

      case 'CREATE_HUBSPOT_CONTACT':
        await this.aiService.executeToolCall({
          function: {
            name: 'create_hubspot_contact',
            arguments: JSON.stringify({
              email: action.parameters.email,
              firstName: action.parameters.firstName,
              lastName: action.parameters.lastName,
              company: action.parameters.company,
            }),
          },
        })
        break

      case 'CREATE_TASK':
        await this.aiService.executeToolCall({
          function: {
            name: 'create_task',
            arguments: JSON.stringify({
              title: action.parameters.title,
              description: action.parameters.description,
              type: action.parameters.type,
              metadata: action.parameters.metadata,
            }),
          },
        })
        break

      case 'AI_ANALYSIS':
        // Use AI to analyze the event and take appropriate action
        const analysis = await this.aiService.generateResponse([
          {
            role: 'system',
            content: `Analyze this webhook event and suggest appropriate actions:

Event Type: ${event.type}
Event Data: ${JSON.stringify(event.data)}

Available actions: send_email, create_calendar_event, create_hubspot_contact, create_task

Provide a JSON response with suggested actions.`,
          },
        ])
        
        // Parse AI response and execute suggested actions
        try {
          const suggestions = JSON.parse(analysis)
          if (suggestions.actions) {
            for (const suggestedAction of suggestions.actions) {
              await this.executeAction(suggestedAction, event)
            }
          }
        } catch (parseError) {
          console.error('Failed to parse AI analysis:', parseError)
        }
        break

      default:
        console.warn(`Unknown action type: ${action.type}`)
    }
  }

  async createAutomationRule(rule: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt'>) {
    return await prisma.automationRule.create({
      data: {
        userId: this.aiService['userId'],
        name: rule.name,
        description: rule.description,
        trigger: rule.trigger,
        actions: rule.actions,
        enabled: rule.enabled,
      },
    })
  }

  async getAutomationRules() {
    return await prisma.automationRule.findMany({
      where: {
        userId: this.aiService['userId'],
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async updateAutomationRule(ruleId: string, updates: Partial<AutomationRule>) {
    return await prisma.automationRule.update({
      where: { id: ruleId },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
    })
  }

  async deleteAutomationRule(ruleId: string) {
    return await prisma.automationRule.delete({
      where: { id: ruleId },
    })
  }

  async getAutomationExecutions(ruleId?: string) {
    return await prisma.automationExecution.findMany({
      where: {
        userId: this.aiService['userId'],
        ...(ruleId && { ruleId }),
      },
      orderBy: { executedAt: 'desc' },
      take: 100,
    })
  }

  // Predefined automation templates
  async createEmailFollowUpRule() {
    return await this.createAutomationRule({
      userId: this.aiService['userId'],
      name: 'Email Follow-up',
      description: 'Automatically follow up on important emails',
      trigger: {
        type: 'EMAIL_RECEIVED',
        conditions: {
          from: 'important@client.com', // Example condition
        },
      },
      actions: [
        {
          type: 'CREATE_TASK',
          parameters: {
            title: 'Follow up on email',
            description: 'Follow up on important email received',
            type: 'EMAIL',
            metadata: { priority: 'high' },
          },
        },
      ],
      enabled: true,
    })
  }

  async createMeetingPreparationRule() {
    return await this.createAutomationRule({
      userId: this.aiService['userId'],
      name: 'Meeting Preparation',
      description: 'Automatically prepare for upcoming meetings',
      trigger: {
        type: 'CALENDAR_EVENT_CREATED',
        conditions: {
          summary: 'Client Meeting', // Example condition
        },
      },
      actions: [
        {
          type: 'CREATE_TASK',
          parameters: {
            title: 'Prepare for meeting',
            description: 'Prepare materials and agenda for upcoming meeting',
            type: 'CALENDAR',
            metadata: { priority: 'medium' },
          },
        },
      ],
      enabled: true,
    })
  }

  async createHubSpotSyncRule() {
    return await this.createAutomationRule({
      userId: this.aiService['userId'],
      name: 'HubSpot Contact Sync',
      description: 'Sync new HubSpot contacts with calendar',
      trigger: {
        type: 'HUBSPOT_CONTACT_CREATED',
        conditions: {},
      },
      actions: [
        {
          type: 'AI_ANALYSIS',
          parameters: {},
        },
      ],
      enabled: true,
    })
  }
}
