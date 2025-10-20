import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getGmailService } from '@/lib/gmail'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { maxResults = 50 } = await request.json()

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get Gmail service
    const gmailService = await getGmailService()

    // Fetch emails from Gmail
    const emails = await gmailService.getRecentEmails(maxResults)
    
    if (!emails || emails.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        total: 0,
        message: 'No emails found to import',
      })
    }

    // Import emails to database
    const importedEmails = []
    
    for (const email of emails) {
      try {
        // Check if email already exists
        const existingEmail = await prisma.emailData.findUnique({
          where: { messageId: email.id },
        })

        if (existingEmail) {
          continue // Skip if already imported
        }

        // Import email to database
        const importedEmail = await prisma.emailData.create({
          data: {
            userId: user.id,
            messageId: email.id,
            threadId: email.threadId,
            subject: email.subject,
            sender: email.sender,
            recipient: email.recipient,
            body: email.body,
            date: email.date,
            labels: email.labels.join(','), // Store as comma-separated string
          },
        })

        importedEmails.push(importedEmail)
      } catch (error) {
        console.error(`Error importing email ${email.id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      imported: importedEmails.length,
      total: emails.length,
      message: `Successfully imported ${importedEmails.length} new emails`,
    })

  } catch (error) {
    console.error('Email import error:', error)
    return NextResponse.json(
      { error: 'Failed to import emails', details: error.message },
      { status: 500 }
    )
  }
}
