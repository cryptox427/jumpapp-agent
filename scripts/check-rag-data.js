#!/usr/bin/env node

/**
 * RAG Data Status Checker and Importer
 * 
 * This script helps you check if you have data imported and guides you through the import process
 * Run with: node scripts/check-rag-data.js
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkRAGData() {
  console.log('🔍 Checking RAG Data Status...\n')

  try {
    // Get all users
    const users = await prisma.user.findMany({
      include: {
        googleTokens: true,
        hubspotTokens: true,
      }
    })

    if (users.length === 0) {
      console.log('❌ No users found in database')
      console.log('   Make sure you have signed in to the application first')
      return
    }

    for (const user of users) {
      console.log(`👤 User: ${user.email}`)
      console.log(`   ID: ${user.id}`)
      
      // Check authentication status
      const hasGoogleTokens = !!user.googleTokens
      const hasHubspotTokens = !!user.hubspotTokens
      
      console.log(`   🔐 Google Auth: ${hasGoogleTokens ? '✅ Connected' : '❌ Not connected'}`)
      console.log(`   🔐 HubSpot Auth: ${hasHubspotTokens ? '✅ Connected' : '❌ Not connected'}`)

      // Check data counts
      const [emailCount, contactCount, noteCount] = await Promise.all([
        prisma.emailData.count({ where: { userId: user.id } }),
        prisma.hubspotContact.count({ where: { userId: user.id } }),
        prisma.hubspotNote.count({ where: { userId: user.id } })
      ])

      console.log(`   📧 Emails: ${emailCount}`)
      console.log(`   👥 Contacts: ${contactCount}`)
      console.log(`   📝 Notes: ${noteCount}`)

      const totalData = emailCount + contactCount + noteCount

      if (totalData === 0) {
        console.log(`   ⚠️  No data imported yet!`)
        
        if (!hasGoogleTokens || !hasHubspotTokens) {
          console.log(`   🔧 Action needed: Connect your accounts first`)
          console.log(`      - Go to the app and connect Google and HubSpot`)
          console.log(`      - Then run: curl -X POST http://localhost:3000/api/import/rag -H "Content-Type: application/json" -d '{"type": "all"}'`)
        } else {
          console.log(`   🚀 Ready to import! Run this command:`)
          console.log(`      curl -X POST http://localhost:3000/api/import/rag \\`)
          console.log(`        -H "Content-Type: application/json" \\`)
          console.log(`        -d '{"type": "all", "maxEmails": 100}'`)
        }
      } else {
        console.log(`   ✅ Data available for RAG search!`)
        console.log(`   🧪 Test with: curl -X POST http://localhost:3000/api/chat/rag -H "Content-Type: application/json" -d '{"message": "What clients have I been in contact with recently?"}'`)
      }

      // Show sample data if available
      if (emailCount > 0) {
        const sampleEmail = await prisma.emailData.findFirst({
          where: { userId: user.id },
          orderBy: { date: 'desc' },
          select: {
            subject: true,
            sender: true,
            date: true
          }
        })
        console.log(`   📧 Latest email: "${sampleEmail?.subject}" from ${sampleEmail?.sender}`)
      }

      if (contactCount > 0) {
        const sampleContact = await prisma.hubspotContact.findFirst({
          where: { userId: user.id },
          select: {
            firstName: true,
            lastName: true,
            email: true,
            company: true
          }
        })
        console.log(`   👥 Sample contact: ${sampleContact?.firstName} ${sampleContact?.lastName} (${sampleContact?.company})`)
      }

      console.log('')
    }

    console.log('📋 Summary:')
    console.log('   - If you see "No data imported yet", you need to run the import')
    console.log('   - If you see "Data available", you can start asking questions')
    console.log('   - Make sure your .env file has OPENAI_API_KEY set for embeddings')

  } catch (error) {
    console.error('❌ Error checking RAG data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the check if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkRAGData()
}

export { checkRAGData }
