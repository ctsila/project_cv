'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getUiLang, setUiLang, ui, type UiLang } from '@/lib/i18n';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [lang, setLang] = useState<UiLang>('en');
  const [noLies, setNoLies] = useState(true);
  useEffect(() => { setLang(getUiLang()); setNoLies(localStorage.getItem('noLiesMode') !== 'off'); }, []);
  const t = ui[lang];
  const nav = [['/dashboard', t.dashboard], ['/workspace', t.compare], ['/profile', t.profile], ['/vacancy', t.vacancies], ['/history', t.history], ['/tracker', t.tracker]];
  function changeLang(v: UiLang) { setLang(v); setUiLang(v); window.dispatchEvent(new Event('storage')); }
  function toggleNoLies() { const next = !noLies; setNoLies(next); localStorage.setItem('noLiesMode', next ? 'on' : 'off'); }
  return <div className="min-h-screen bg-[#f7f8fc]"><aside className="fixed left-0 top-0 h-full w-60 border-r bg-white"><Link href="/" className="flex items-center gap-3 px-6 py-5 font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-blue-500 text-white">▣</span>AI Resume</Link><div className="px-4 text-xs font-bold uppercase tracking-widest text-slate-400">{t.workspace}</div><nav className="mt-2 space-y-1 px-3">{nav.map(([href,label])=><Link key={href} href={href} className={`block rounded-xl px-4 py-3 text-sm font-bold ${path===href?'bg-emerald-50 text-emerald-700':'text-slate-600 hover:bg-slate-50'}`}>{label}</Link>)}</nav><div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-slate-50 p-4 text-xs text-slate-500"><b>{t.noLies}</b><br/>{t.evidence}</div></aside><main className="ml-60"><header className="sticky top-0 z-10 flex h-16 items-center justify-end gap-3 border-b bg-white/90 px-6 backdrop-blur"><select className="input max-w-36 py-2 text-sm" value={lang} onChange={e=>changeLang(e.target.value as UiLang)}><option value="en">Web: EN</option><option value="ru">Web: RU</option><option value="es">Web: ES</option></select><button onClick={toggleNoLies} className={`pill ${noLies?'bg-emerald-50 text-emerald-700':'bg-rose-50 text-rose-700'}`}>{noLies?t.noLiesOn:t.noLiesOff}</button><span className="grid h-9 w-9 place-items-center rounded-full bg-indigo-600 font-bold text-white">U</span></header><div className="p-8">{children}</div></main></div>;
}
