import GoogleProvider from 'next-auth/providers/google';
import LinkedInProvider from 'next-auth/providers/linkedin';
import YandexProvider from 'next-auth/providers/yandex';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { NextAuthOptions } from 'next-auth';
import type { OAuthConfig } from 'next-auth/providers/oauth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { compare } from 'bcryptjs';
import { prisma } from '@/lib/db';
import { isOAuthConfigured } from '@/lib/oauth-providers';

function hhProvider(): OAuthConfig<any> {
  return {
    id: 'hh',
    name: 'hh.ru',
    type: 'oauth',
    authorization: { url: 'https://hh.ru/oauth/authorize', params: { scope: '' } },
    token: 'https://api.hh.ru/token',
    userinfo: 'https://api.hh.ru/me',
    clientId: process.env.HH_CLIENT_ID,
    clientSecret: process.env.HH_CLIENT_SECRET,
    profile(profile) {
      return {
        id: String(profile.id || profile.email || profile.login),
        name: profile.first_name || profile.name || profile.login || 'hh.ru user',
        email: profile.email || `${profile.id}@hh.local`,
        image: null,
      };
    },
  };
}

const providers: NextAuthOptions['providers'] = [
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
];

if (isOAuthConfigured('google')) providers.push(GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! }));
if (isOAuthConfigured('linkedin')) providers.push(LinkedInProvider({ clientId: process.env.LINKEDIN_CLIENT_ID!, clientSecret: process.env.LINKEDIN_CLIENT_SECRET! }));
if (isOAuthConfigured('yandex')) providers.push(YandexProvider({ clientId: process.env.YANDEX_CLIENT_ID!, clientSecret: process.env.YANDEX_CLIENT_SECRET! }));
if (isOAuthConfigured('hh')) providers.push(hhProvider());

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  pages: { signIn: '/' },
  callbacks: {
    async session({ session, token }) {
      if (session.user) (session.user as any).id = token.sub;
      return session;
    },
  },
};
