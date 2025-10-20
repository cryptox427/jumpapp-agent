#!/usr/bin/env node

/**
 * RAG Import and Test Script
 * 
 * This script demonstrates the RAG-based import and search functionality
 * Run with: node scripts/test-rag.js
 */

import { DataImportService } from '../src/lib/data-import.js'
import { RAGService } from '../src/lib/rag.js'
import { AIService } from '../src/lib/openai.js'

async function testRAGImport() {
  console.log('🚀 Starting RAG Import Test...\n')

  // Mock user data for testing
  const userId = 'test-user-123'
  const googleTokens = {
    accessToken: process.env.GOOGLE_ACCESS_TOKEN || 'mock-token',
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN
  }
  const hubspotTokens = {
    accessToken: process.env.HUBSPOT_ACCESS_TOKEN || 'mock-token'
  }

  try {
    // Step 1: Initialize RAG Import Service
    console.log('📥 Step 1: Initializing RAG Import Service...')
    const importService = new DataImportService(userId, googleTokens, hubspotTokens)
    
    // Step 2: Import emails with RAG embeddings
    console.log('📧 Step 2: Importing emails with RAG embeddings...')
    const emailResults = await importService.importEmails(10) // Import 10 emails for testing
    console.log(`✅ Imported ${emailResults.imported} emails, skipped ${emailResults.skipped}`)

    // Step 3: Import HubSpot contacts with RAG embeddings
    console.log('👥 Step 3: Importing HubSpot contacts with RAG embeddings...')
    const contactResults = await importService.importHubSpotContacts()
    console.log(`✅ Imported ${contactResults.imported} contacts, skipped ${contactResults.skipped}`)

    // Step 4: Import HubSpot notes with RAG embeddings
    console.log('📝 Step 4: Importing HubSpot notes with RAG embeddings...')
    const noteResults = await importService.importHubSpotNotes()
    console.log(`✅ Imported ${noteResults.imported} notes, skipped ${noteResults.skipped}`)

    // Step 5: Test RAG Search
    console.log('\n🔍 Step 5: Testing RAG Search...')
    const ragService = new RAGService(userId)
    
    const testQueries = [
      'client meeting',
      'investment portfolio',
      'financial advice',
      'John Smith',
      'company email'
    ]

    for (const query of testQueries) {
      console.log(`\n🔎 Searching for: "${query}"`)
      
      const [emails, contacts, notes] = await Promise.all([
        ragService.searchEmails(query, 3),
        ragService.searchContacts(query, 3),
        ragService.searchNotes(query, 3)
      ])

      console.log(`  📧 Found ${emails.length} relevant emails`)
      console.log(`  👥 Found ${contacts.length} relevant contacts`)
      console.log(`  📝 Found ${notes.length} relevant notes`)

      if (emails.length > 0) {
        console.log(`  📧 Top email: ${emails[0].subject} (relevance: ${emails[0].relevance.toFixed(3)})`)
      }
      if (contacts.length > 0) {
        console.log(`  👥 Top contact: ${contacts[0].name} (relevance: ${contacts[0].relevance.toFixed(3)})`)
      }
      if (notes.length > 0) {
        console.log(`  📝 Top note: ${notes[0].content.substring(0, 50)}... (relevance: ${notes[0].relevance.toFixed(3)})`)
      }
    }

    // Step 6: Test AI with RAG Context
    console.log('\n🤖 Step 6: Testing AI with RAG Context...')
    const aiService = new AIService(userId, googleTokens, hubspotTokens)
    
    const testQuestions = [
      'What clients have I been in contact with recently?',
      'Are there any investment opportunities mentioned in my emails?',
      'What meetings do I have scheduled?'
    ]

    for (const question of testQuestions) {
      console.log(`\n❓ Question: "${question}"`)
      
      try {
        const ragContext = await aiService.getRAGContext(question, 5)
        console.log(`  🔍 RAG Context: ${ragContext.summary}`)
        
        const response = await aiService.generateResponse([
          { role: 'user', content: question }
        ], ragContext)
        
        console.log(`  🤖 AI Response: ${response.content?.substring(0, 200)}...`)
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`)
      }
    }

    console.log('\n✅ RAG Import and Test completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`  - Emails imported: ${emailResults.imported}`)
    console.log(`  - Contacts imported: ${contactResults.imported}`)
    console.log(`  - Notes imported: ${noteResults.imported}`)
    console.log('  - All data now has embeddings for intelligent search')
    console.log('  - AI can now answer questions using your imported data as context')

  } catch (error) {
    console.error('❌ RAG Import Test failed:', error)
    process.exit(1)
  }
}

// Run the test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testRAGImport()
}

export { testRAGImport }
