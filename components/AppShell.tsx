'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getUiLang, setUiLang, ui, type UiLang } from '@/lib/i18n';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [lang, setLang] = useState<UiLang>('en');
  const [noLies, setNoLies] = useState(true);
  const [user, setUser] = useState<{ name?: string | null; image?: string | null } | null>(null);

  useEffect(() => {
    setLang(getUiLang());
    setNoLies(localStorage.getItem('noLiesMode') !== 'off');
    let ignore = false;
    async function loadProfile() {
      try {
        const res = await fetch('/api/profile');
        const data = await res.json();
        if (!ignore) setUser({ name: data.profile?.name || data.profile?.email || 'User', image: data.profile?.photoDataUrl || null });
      } catch {
        if (!ignore) setUser({ name: 'User', image: null });
      }
    }
    loadProfile();
    const onStorage = () => {
      setLang(getUiLang());
      setNoLies(localStorage.getItem('noLiesMode') !== 'off');
    };
    const onAccountUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ name?: string | null; image?: string | null }>).detail;
      if (detail) setUser((current) => ({ ...current, ...detail }));
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('account-updated', onAccountUpdate as EventListener);
    return () => {
      ignore = true;
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('account-updated', onAccountUpdate as EventListener);
    };
  }, []);

  const t = ui[lang];
  const nav = [
    ['/dashboard', t.dashboard],
    ['/workspace', t.compare],
    ['/profile', t.profile],
    ['/vacancy', t.vacancies],
    ['/history', t.history],
    ['/tracker', t.tracker],
  ];

  const initials = useMemo(() => {
    const source = user?.name || 'U';
    return source.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || 'U';
  }, [user?.name]);

  function changeLang(value: UiLang) {
    setLang(value);
    setUiLang(value);
    window.dispatchEvent(new Event('storage'));
  }

  function toggleNoLies() {
    const next = !noLies;
    setNoLies(next);
    localStorage.setItem('noLiesMode', next ? 'on' : 'off');
    window.dispatchEvent(new Event('storage'));
  }

  return (
    <div className="min-h-screen bg-[#f7f8fc]">
      <aside className="fixed left-0 top-0 h-full w-60 border-r bg-white">
        <Link href="/" className="flex items-center gap-3 px-6 py-5 font-black">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-blue-500 text-white">▣</span>
          AI Resume
        </Link>
        <div className="px-4 text-xs font-bold uppercase tracking-widest text-slate-400">{t.workspace}</div>
        <nav className="mt-2 space-y-1 px-3">
          {nav.map(([href, label]) => (
            <Link key={href} href={href} className={`block rounded-xl px-4 py-3 text-sm font-bold ${path === href ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-slate-50 p-4 text-xs text-slate-500">
          <b>{t.noLies}</b><br />{t.evidence}
        </div>
      </aside>
      <main className="ml-60">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-end gap-3 border-b bg-white/90 px-6 backdrop-blur">
          <select className="input max-w-36 py-2 text-sm" value={lang} onChange={(e) => changeLang(e.target.value as UiLang)}>
            <option value="en">Web: EN</option>
            <option value="ru">Web: RU</option>
            <option value="es">Web: ES</option>
          </select>
          <button onClick={toggleNoLies} className={`pill ${noLies ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {noLies ? t.noLiesOn : t.noLiesOff}
          </button>
          <Link href="/profile" className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-indigo-600 font-bold text-white" aria-label="Open profile">
            {user?.image ? <img src={user.image} alt={user?.name || 'Profile'} className="h-full w-full object-cover" /> : initials}
          </Link>
        </header>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
