const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function migrateGoogleTokens() {
  try {
    console.log('🔄 Starting Google tokens migration...')
    
    // Find all users with Google accounts but no GoogleTokens record
    const users = await prisma.user.findMany({
      include: {
        accounts: {
          where: {
            provider: 'google'
          }
        },
        googleTokens: true
      }
    })

    console.log(`📊 Found ${users.length} users to check`)

    let migratedCount = 0

    for (const user of users) {
      const googleAccount = user.accounts.find(acc => acc.provider === 'google')
      
      if (googleAccount) {
        // Convert expires_at from Unix timestamp to DateTime
        const expiresAt = googleAccount.expires_at 
          ? new Date(googleAccount.expires_at * 1000)
          : new Date(Date.now() + 3600 * 1000) // Default to 1 hour from now

        if (!user.googleTokens) {
          console.log(`🔄 Creating new GoogleTokens for user: ${user.email}`)
          
          await prisma.googleTokens.create({
            data: {
              userId: user.id,
              accessToken: googleAccount.access_token || '',
              refreshToken: googleAccount.refresh_token,
              expiresAt: expiresAt,
              scope: googleAccount.scope || 'openid email profile'
            }
          })

          console.log(`✅ Created tokens for ${user.email}`)
          migratedCount++
        } else {
          console.log(`🔄 Updating existing GoogleTokens for user: ${user.email}`)
          
          await prisma.googleTokens.update({
            where: { userId: user.id },
            data: {
              accessToken: googleAccount.access_token || '',
              refreshToken: googleAccount.refresh_token,
              expiresAt: expiresAt,
              scope: googleAccount.scope || 'openid email profile'
            }
          })

          console.log(`✅ Updated tokens for ${user.email}`)
          migratedCount++
        }
      } else {
        console.log(`⏭️  User ${user.email} has no Google account, skipping`)
      }
    }

    console.log(`🎉 Migration completed! Migrated ${migratedCount} users`)
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

migrateGoogleTokens()
