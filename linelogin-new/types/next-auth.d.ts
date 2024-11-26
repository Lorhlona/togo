import NextAuth from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id?: string
      name?: string
      email?: string
      image?: string
      lineId?: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    lineId?: string
    accessToken?: string
  }
}
