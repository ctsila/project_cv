'use client';
import { SessionProvider } from 'next-auth/react';
import { WebLanguageProvider } from '@/components/WebLanguageProvider';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <WebLanguageProvider>{children}</WebLanguageProvider>
    </SessionProvider>
  );
}
