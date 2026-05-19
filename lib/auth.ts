import GoogleProvider from 'next-auth/providers/google';
import LinkedInProvider from 'next-auth/providers/linkedin';
import YandexProvider from 'next-auth/providers/yandex';
import EmailProvider from 'next-auth/providers/email';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { AuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { compare } from 'bcryptjs';
import { prisma } from '@/lib/db';
import { sendSignInLinkEmail } from '@/lib/email';

function buildHhProvider(): any {
  if (!process.env.HH_CLIENT_ID || !process.env.HH_CLIENT_SECRET) return null;

  return {
    id: 'hh',
    name: 'hh.ru',
    type: 'oauth',
    clientId: process.env.HH_CLIENT_ID,
    clientSecret: process.env.HH_CLIENT_SECRET,
    authorization: 'https://hh.ru/oauth/authorize',
    token: 'https://hh.ru/oauth/token',
    userinfo: 'https://api.hh.ru/me',
    profile(profile: any) {
      const firstName = profile.first_name || profile.firstName || '';
      const lastName = profile.last_name || profile.lastName || '';
      const name = `${firstName} ${lastName}`.trim() || profile.name || profile.email || 'hh.ru user';

      return {
        id: String(profile.id ?? profile.email ?? name),
        name,
        email: profile.email ?? null,
        image: profile.photo?.small ?? profile.photo?.medium ?? profile.photo?.large ?? profile.avatar_url ?? null,
      };
    },
  };
}

const hhProvider = buildHhProvider();

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })] : []),
    ...(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET ? [LinkedInProvider({ clientId: process.env.LINKEDIN_CLIENT_ID, clientSecret: process.env.LINKEDIN_CLIENT_SECRET })] : []),
    ...(process.env.YANDEX_CLIENT_ID && process.env.YANDEX_CLIENT_SECRET ? [YandexProvider({ clientId: process.env.YANDEX_CLIENT_ID, clientSecret: process.env.YANDEX_CLIENT_SECRET })] : []),
    ...(hhProvider ? [hhProvider] : []),
    EmailProvider({
      server: {
        host: process.env.SMTP_HOST || 'localhost',
        port: Number(process.env.SMTP_PORT || 587),
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      },
      from: process.env.SMTP_FROM || 'no-reply@airesume.local',
      async sendVerificationRequest({ identifier, url }) {
        await sendSignInLinkEmail(identifier, url);
      },
    }),
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
};
