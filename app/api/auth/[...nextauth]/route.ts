import NextAuth, { type NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import axios from "axios"
import { API_BASE_URL } from "@/lib/api-base"

const requireApiBaseUrl = () => {
  if (!API_BASE_URL) {
    throw new Error("NEXTPUBLICBASEURL is not configured")
  }
  return API_BASE_URL
}

const decodeJwt = (token: string): { exp?: number } => {
  try {
    const base64Payload = token.split(".")[1]
    const payload = Buffer.from(base64Payload, "base64").toString("utf8")
    return JSON.parse(payload) as { exp?: number }
  } catch {
    return {}
  }
}

const getTokenExpiry = (token: string) => {
  const decoded = decodeJwt(token)
  if (!decoded.exp) return null
  return decoded.exp * 1000
}

const refreshAccessToken = async (token: any) => {
  try {
    const response = await axios.post(
      `${requireApiBaseUrl()}/auth/refresh-token`,
      { refreshToken: token.refreshToken },
      { headers: { "Content-Type": "application/json" } }
    )

    const refreshed = response.data?.data
    const nextAccessToken = refreshed?.accessToken
    const nextRefreshToken = refreshed?.refreshToken

    if (!nextAccessToken || !nextRefreshToken) {
      return { ...token, error: "RefreshAccessTokenError" }
    }

    return {
      ...token,
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken,
      accessTokenExpires: getTokenExpiry(nextAccessToken) ?? Date.now() + 1000 * 60 * 15,
      error: undefined,
    }
  } catch (error) {
    return { ...token, error: "RefreshAccessTokenError" }
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          throw new Error("Email and password are required")
        }

        const response = await axios.post(
          `${requireApiBaseUrl()}/auth/login`,
          {
            email: credentials.email,
            password: credentials.password,
          },
          { headers: { "Content-Type": "application/json" } }
        )

        const payload = response.data
        if (!payload?.success) {
          throw new Error(payload?.message ?? "Login failed")
        }

        const data = payload.data
        if (!data?.accessToken) {
          throw new Error("Login failed")
        }

        return {
          id: data._id,
          email: data.user?.email ?? credentials.email,
          name: data.user?.name ?? data.user?.email ?? "User",
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          role: data.role,
          _id: data._id,
          user: data.user,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const accessToken = (user as any).accessToken as string
        const refreshToken = (user as any).refreshToken as string
        return {
          ...token,
          accessToken,
          refreshToken,
          accessTokenExpires: getTokenExpiry(accessToken) ?? Date.now() + 1000 * 60 * 15,
          role: (user as any).role,
          _id: (user as any)._id,
          user: (user as any).user,
        }
      }

      if (token.accessToken && token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
        return token
      }

      return refreshAccessToken(token)
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined
      session.refreshToken = token.refreshToken as string | undefined
      session.role = token.role as string | undefined
      session._id = token._id as string | undefined
      session.user = (token.user as any) ?? session.user
      session.error = token.error as string | undefined
      return session
    },
  },
  pages: {
    signIn: "/auth/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
