import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token
    
    // セッションがない場合はトップページにリダイレクト
    if (!token) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    // /medical/* へのアクセス制御
    if (req.nextUrl.pathname.startsWith('/medical')) {
      if (!token) {
        return NextResponse.redirect(new URL('/', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
  }
)

export const config = {
  matcher: ["/dashboard/:path*", "/medical/:path*", "/admin/:path*"]
}
