import GoogleProvider from 'next-auth/providers/google';
import LinkedInProvider from 'next-auth/providers/linkedin';
import YandexProvider from 'next-auth/providers/yandex';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { compare } from 'bcryptjs';
import { prisma } from '@/lib/db';

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID || 'missing', clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'missing' }),
    LinkedInProvider({ clientId: process.env.LINKEDIN_CLIENT_ID || 'missing', clientSecret: process.env.LINKEDIN_CLIENT_SECRET || 'missing' }),
    YandexProvider({ clientId: process.env.YANDEX_CLIENT_ID || 'missing', clientSecret: process.env.YANDEX_CLIENT_SECRET || 'missing' }),
    CredentialsProvider({
      id: 'credentials',
      name: 'Email and password',
      credentials: { email: { label: 'Email', type: 'email' }, password: { label: 'Password', type: 'password' } },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password || '';
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, name: user.name || undefined, email: user.email, image: user.image || undefined };
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  callbacks: {
    async session({ session, token }: any) {
      if (session.user) (session.user as any).id = token.sub;
      return session;
    },
  },
} as const;
