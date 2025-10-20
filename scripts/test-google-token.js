const { PrismaClient } = require('@prisma/client')
const { google } = require('googleapis')

const prisma = new PrismaClient()

async function testGoogleToken() {
  try {
    console.log('🔄 Testing Google token...')
    
    const user = await prisma.user.findUnique({
      where: { email: 'realgentle0427@gmail.com' },
      include: { googleTokens: true }
    })

    if (!user?.googleTokens) {
      console.log('❌ No Google tokens found')
      return
    }

    console.log('📊 Token info:', {
      expiresAt: user.googleTokens.expiresAt,
      isExpired: new Date() > new Date(user.googleTokens.expiresAt),
      hasRefreshToken: !!user.googleTokens.refreshToken
    })

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    )

    oauth2Client.setCredentials({
      access_token: user.googleTokens.accessToken,
      refresh_token: user.googleTokens.refreshToken,
    })

    // Try to make a simple API call
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    
    try {
      const response = await gmail.users.getProfile({ userId: 'me' })
      console.log('✅ Token is valid! User profile:', response.data.emailAddress)
    } catch (error) {
      console.log('❌ Token error:', error.message)
      
      if (error.message.includes('invalid_grant') || error.message.includes('expired')) {
        console.log('🔄 Token is expired, attempting refresh...')
        
        try {
          const { credentials } = await oauth2Client.refreshAccessToken()
          console.log('✅ Token refreshed successfully!')
          
          // Update the database with new tokens
          await prisma.googleTokens.update({
            where: { userId: user.id },
            data: {
              accessToken: credentials.access_token,
              refreshToken: credentials.refresh_token || user.googleTokens.refreshToken,
              expiresAt: new Date(Date.now() + (credentials.expiry_date || 3600) * 1000),
            }
          })
          
          console.log('💾 Updated tokens in database')
          
        } catch (refreshError) {
          console.log('❌ Token refresh failed:', refreshError.message)
          console.log('🔄 User needs to re-authenticate')
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testGoogleToken()
