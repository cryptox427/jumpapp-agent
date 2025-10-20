import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AIService } from '@/lib/openai'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, conversationId } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        googleTokens: true,
        hubspotTokens: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Initialize AI service with user's tokens
    const aiService = new AIService(
      user.id,
      user.googleTokens ? {
        accessToken: user.googleTokens.accessToken,
        refreshToken: user.googleTokens.refreshToken || undefined,
      } : undefined,
      user.hubspotTokens ? {
        accessToken: user.hubspotTokens.accessToken,
      } : undefined
    )

    // Get or create conversation
    let conversation
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { messages: true },
      })
    } else {
      conversation = await prisma.conversation.create({
        data: {
          userId: user.id,
          title: message.substring(0, 50),
        },
        include: { messages: true },
      })
    }

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Get recent messages for context
    const recentMessages = conversation.messages
      .slice(-10) // Last 10 messages
      .map(msg => ({
        role: msg.role.toLowerCase() as 'user' | 'assistant' | 'system',
        content: msg.content,
      }))

    // Add current user message
    recentMessages.push({
      role: 'user',
      content: message,
    })

    // Get RAG context
    const ragContext = await aiService.getRAGContext(message)

    // Generate AI response
    const aiResponse = await aiService.generateResponse(recentMessages, ragContext)

    // Save messages to database
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: message,
      },
    })

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: aiResponse.content || 'I apologize, but I encountered an error.',
      },
    })

    return NextResponse.json({
      message: aiResponse.content || 'I apologize, but I encountered an error.',
      conversationId: conversation.id,
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
