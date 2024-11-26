import type { NextAuthOptions } from 'next-auth'
import LineProvider from "next-auth/providers/line"
import { JWT } from 'next-auth/jwt'

interface Profile {
  name?: string
  email?: string
  picture?: string
}

interface ExtendedToken extends JWT {
  profile?: Profile
}

export const options: NextAuthOptions = {
  providers: [
    LineProvider({
      clientId: process.env.LINE_CHANNEL_ID as string,
      clientSecret: process.env.LINE_CHANNEL_SECRET as string,
      authorization: {
        params: {
          scope: 'profile openid email',
          response_type: 'code'
        }
      }
    })
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // 完全なURLを構築
      const dashboardUrl = new URL('/dashboard', baseUrl).toString()
      
      // URLがbaseUrlで始まる場合（内部URL）
      if (url.startsWith(baseUrl)) {
        if (url.includes('/dashboard')) {
          return url
        }
        return dashboardUrl
      }
      
      // 外部URLの場合はダッシュボードにリダイレクト
      return dashboardUrl
    },
    async jwt({ token, user, account, profile }): Promise<ExtendedToken> {
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          userId: user.id,
          profile: profile as Profile
        }
      }
      return token
    },
    async session({ session, token }) {
      const extendedToken = token as ExtendedToken
      if (extendedToken) {
        session.user.id = extendedToken.userId as string
        // プロフィール情報をセッションに追加
        if (extendedToken.profile) {
          session.user.name = extendedToken.profile.name || session.user.name
          session.user.email = extendedToken.profile.email || session.user.email
          session.user.image = extendedToken.profile.picture || session.user.image
        }
      }
      return session
    }
  },
  pages: {
    signIn: '/',
    error: '/auth/error',
    signOut: '/'
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
  debug: process.env.NODE_ENV === 'development',
  useSecureCookies: process.env.NODE_ENV === 'production'
}
