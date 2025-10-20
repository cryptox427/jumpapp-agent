const { PrismaClient } = require('@prisma/client')
const { google } = require('googleapis')

const prisma = new PrismaClient()

async function refreshGoogleTokens() {
  try {
    console.log('🔄 Attempting to refresh Google tokens...')
    
    const user = await prisma.user.findUnique({
      where: { email: 'realgentle0427@gmail.com' },
      include: { 
        googleTokens: true,
        accounts: {
          where: { provider: 'google' }
        }
      }
    })

    if (!user?.accounts[0]) {
      console.log('❌ No Google account found')
      return
    }

    const googleAccount = user.accounts[0]
    console.log('📊 Current token info:', {
      expires_at: googleAccount.expires_at,
      expires_at_date: new Date(googleAccount.expires_at * 1000),
      isExpired: googleAccount.expires_at < Math.floor(Date.now() / 1000),
      hasRefreshToken: !!googleAccount.refresh_token
    })

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    )

    oauth2Client.setCredentials({
      access_token: googleAccount.access_token,
      refresh_token: googleAccount.refresh_token,
    })

    // Try to refresh the token
    try {
      console.log('🔄 Attempting token refresh...')
      const { credentials } = await oauth2Client.refreshAccessToken()
      
      console.log('✅ Token refreshed successfully!')
      console.log('📊 New token info:', {
        access_token: credentials.access_token?.substring(0, 20) + '...',
        expiry_date: credentials.expiry_date,
        expiry_date_formatted: new Date(credentials.expiry_date),
        hasRefreshToken: !!credentials.refresh_token
      })

      // Update both Account and GoogleTokens tables
      const expiresAt = new Date(credentials.expiry_date)
      
      // Update Account table
      await prisma.account.update({
        where: { id: googleAccount.id },
        data: {
          access_token: credentials.access_token,
          refresh_token: credentials.refresh_token || googleAccount.refresh_token,
          expires_at: Math.floor(credentials.expiry_date / 1000),
        }
      })

      // Update GoogleTokens table
      if (user.googleTokens) {
        await prisma.googleTokens.update({
          where: { userId: user.id },
          data: {
            accessToken: credentials.access_token,
            refreshToken: credentials.refresh_token || user.googleTokens.refreshToken,
            expiresAt: expiresAt,
          }
        })
      } else {
        await prisma.googleTokens.create({
          data: {
            userId: user.id,
            accessToken: credentials.access_token,
            refreshToken: credentials.refresh_token,
            expiresAt: expiresAt,
            scope: googleAccount.scope || 'openid email profile'
          }
        })
      }

      console.log('💾 Updated tokens in both Account and GoogleTokens tables')
      
    } catch (refreshError) {
      console.log('❌ Token refresh failed:', refreshError.message)
      
      if (refreshError.message.includes('invalid_grant')) {
        console.log('🔄 Refresh token is invalid, user needs to re-authenticate')
        console.log('💡 Try signing out and signing back in')
      }
    }
    
  } catch (error) {
    console.error('❌ Refresh failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

refreshGoogleTokens()
