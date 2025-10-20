import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create some sample emails for testing
    const sampleEmails = [
      {
        messageId: 'sample-1',
        threadId: 'thread-1',
        subject: 'Welcome to JumpApp!',
        sender: 'support@jumpapp.com',
        recipient: session.user.email,
        body: 'Welcome to your new AI assistant for financial advisors. This is a sample email to test the email search functionality.',
        date: new Date(),
        labels: 'inbox,important',
      },
      {
        messageId: 'sample-2',
        threadId: 'thread-2',
        subject: 'Meeting Request - Financial Planning',
        sender: 'john.doe@client.com',
        recipient: session.user.email,
        body: 'Hi, I would like to schedule a meeting to discuss my retirement planning. Please let me know your availability.',
        date: new Date(Date.now() - 86400000), // 1 day ago
        labels: 'inbox,meeting',
      },
      {
        messageId: 'sample-3',
        threadId: 'thread-3',
        subject: 'Investment Portfolio Review',
        sender: 'jane.smith@client.com',
        recipient: session.user.email,
        body: 'Could you please review my investment portfolio and provide recommendations for the upcoming quarter?',
        date: new Date(Date.now() - 172800000), // 2 days ago
        labels: 'inbox,investment',
      },
      {
        messageId: 'sample-4',
        threadId: 'thread-4',
        subject: 'Tax Planning Consultation',
        sender: 'mike.wilson@client.com',
        recipient: session.user.email,
        body: 'I need help with tax planning for this year. Can we schedule a consultation to discuss strategies?',
        date: new Date(Date.now() - 259200000), // 3 days ago
        labels: 'inbox,tax',
      },
      {
        messageId: 'sample-5',
        threadId: 'thread-5',
        subject: 'Market Update Newsletter',
        sender: 'newsletter@financialtimes.com',
        recipient: session.user.email,
        body: 'Weekly market update: Stocks are showing positive trends this week. Key sectors to watch include technology and healthcare.',
        date: new Date(Date.now() - 345600000), // 4 days ago
        labels: 'inbox,newsletter',
      },
    ]

    // Import sample emails to database
    const importedEmails = []
    
    for (const email of sampleEmails) {
      try {
        // Check if email already exists
        const existingEmail = await prisma.emailData.findUnique({
          where: { messageId: email.messageId },
        })

        if (existingEmail) {
          continue // Skip if already imported
        }

        // Import email to database
        const importedEmail = await prisma.emailData.create({
          data: {
            userId: user.id,
            messageId: email.messageId,
            threadId: email.threadId,
            subject: email.subject,
            sender: email.sender,
            recipient: email.recipient,
            body: email.body,
            date: email.date,
            labels: email.labels,
          },
        })

        console.log('📧 Imported email:', {
          id: importedEmail.id,
          userId: importedEmail.userId,
          subject: importedEmail.subject,
          sender: importedEmail.sender,
          bodyLength: importedEmail.body?.length || 0
        })

        importedEmails.push(importedEmail)
      } catch (error) {
        console.error(`Error importing sample email ${email.messageId}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      imported: importedEmails.length,
      total: sampleEmails.length,
      message: `Successfully imported ${importedEmails.length} sample emails for testing`,
    })

  } catch (error) {
    console.error('Sample email import error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to import sample emails', 
        details: typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error)
      },
      { status: 500 }
    )
  }
}
