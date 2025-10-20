const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function clearGoogleTokens() {
  try {
    console.log('🔄 Clearing all Google tokens...')
    
    // Clear GoogleTokens table
    const deletedGoogleTokens = await prisma.googleTokens.deleteMany({})
    console.log(`✅ Deleted ${deletedGoogleTokens.count} GoogleTokens records`)
    
    // Clear Account table Google entries
    const deletedAccounts = await prisma.account.deleteMany({
      where: { provider: 'google' }
    })
    console.log(`✅ Deleted ${deletedAccounts.count} Google Account records`)
    
    // Clear all sessions
    const deletedSessions = await prisma.session.deleteMany({})
    console.log(`✅ Deleted ${deletedSessions.count} Session records`)
    
    console.log('🎉 All Google tokens and sessions cleared!')
    console.log('💡 Now sign in again to get fresh tokens with refresh capability')
    
  } catch (error) {
    console.error('❌ Error clearing tokens:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearGoogleTokens()
