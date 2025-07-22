import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/userinfo.profile"
        }
      }
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user && user) {
        (session.user as { id: string }).id = user.id;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      console.log('SignIn callback:', { user, account, profile });
      return true;
    },
  },
  events: {
    async createUser({ user }) {
      console.log('User created:', user);
      if (user.email) {
        const username = user.email.split('@')[0];
        await prisma.user.update({
          where: { id: user.id },
          data: {
            username: username,
            displayName: user.name || username,
            avatarUrl: user.image
          }
        });
        console.log('User updated with additional info');
      }
    },
  },
  session: {
    strategy: "database",
  },
}