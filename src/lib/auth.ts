import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./prisma"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      if (account) {
        console.log('JWT callback - account:', account.provider, account.type)
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
        token.scope = account.scope
      }
      if (user) {
        console.log('JWT callback - user:', user.email)
        token.userId = user.id
      }
      return token
    },
    async session({ session, token, user }) {
      console.log('Session callback - session:', session.user?.email)
      console.log('Session callback - token:', token?.userId)
      
      if (user) {
        // When using Prisma adapter, fetch tokens from database
        const dbUser = await prisma.user.findUnique({
          where: { email: session.user?.email! },
          include: {
            accounts: {
              where: { provider: 'google' }
            },
            googleTokens: true,
            hubspotTokens: true
          }
        })
        
        if (dbUser?.accounts[0]) {
          const account = dbUser.accounts[0]
          session.accessToken = account.access_token || undefined
          session.refreshToken = account.refresh_token || undefined
          session.expiresAt = account.expires_at || undefined
          session.scope = account.scope || undefined
          session.userId = dbUser.id
          console.log('Session callback - Google tokens loaded from DB:', !!session.accessToken)
        }
        
        // Also load HubSpot tokens if available
        if (dbUser?.hubspotTokens) {
          session.hubspotAccessToken = dbUser.hubspotTokens.accessToken
          console.log('Session callback - HubSpot tokens loaded from DB:', !!session.hubspotAccessToken)
        }
      } else if (token) {
        // Fallback for JWT strategy
        session.accessToken = token.accessToken as string | undefined
        session.refreshToken = token.refreshToken as string | undefined
        session.expiresAt = token.expiresAt as number | undefined
        session.scope = token.scope as string | undefined
        session.userId = token.userId as string | undefined
      }
      return session
    },
    async signIn({ user, account, profile }) {
      console.log('SignIn callback - user:', user.email)
      console.log('SignIn callback - account:', account?.provider)
      return true
    },
    async redirect({ url, baseUrl }) {
      console.log('Redirect callback - url:', url, 'baseUrl:', baseUrl)
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
  pages: {
    error: "/auth/error",
  },
}
