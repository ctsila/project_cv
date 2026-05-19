'use client';

import AppShell from '@/components/AppShell';
import { safeJson } from '@/lib/http';
import { getUiLang, type UiLang } from '@/lib/i18n';
import { useEffect, useState } from 'react';

const STATUSES = ['Saved', 'Applied', 'HR Screen', 'Interview', 'Offer', 'Rejected'];
const copy: any = {
  en: { title: 'Application Tracker', kanban: 'Kanban', list: 'List', calendar: 'Calendar', empty: 'No items yet' },
  ru: { title: 'Трекер откликов', kanban: 'Канбан', list: 'Список', calendar: 'Календарь', empty: 'Пока пусто' },
  es: { title: 'Seguimiento de candidaturas', kanban: 'Kanban', list: 'Lista', calendar: 'Calendario', empty: 'Sin elementos' },
};

export default function Tracker() {
  const [items, setItems] = useState<any[]>([]);
  const [view, setView] = useState<'kanban' | 'list' | 'calendar'>('kanban');
  const [lang, setLang] = useState<UiLang>('en');

  useEffect(() => {
    setLang(getUiLang());
    let ignore = false;
    async function load() {
      const res = await fetch('/api/applications');
      const data = await safeJson(res);
      if (!ignore) setItems(data.items || []);
    }
    load();
    return () => { ignore = true; };
  }, []);

  const t = copy[lang];
  const cols: Record<string, any[]> = STATUSES.reduce((acc, status) => {
    acc[status] = items.filter((x) => x.status === status);
    return acc;
  }, {} as Record<string, any[]>);
  const days = Array.from({ length: 35 }, (_, i) => { const d = new Date(); d.setDate(1 + i); return d; });

  return (
    <AppShell>
      <div className="flex justify-between">
        <h1 className="text-3xl font-black">{t.title}</h1>
        <div className="rounded-xl bg-slate-100 p-1 text-sm">
          <button onClick={() => setView('kanban')} className={`px-4 py-2 ${view === 'kanban' ? 'rounded-lg bg-white font-bold shadow-sm' : 'text-slate-500'}`}>{t.kanban}</button>
          <button onClick={() => setView('list')} className={`px-4 py-2 ${view === 'list' ? 'rounded-lg bg-white font-bold shadow-sm' : 'text-slate-500'}`}>{t.list}</button>
          <button onClick={() => setView('calendar')} className={`px-4 py-2 ${view === 'calendar' ? 'rounded-lg bg-white font-bold shadow-sm' : 'text-slate-500'}`}>{t.calendar}</button>
        </div>
      </div>
      {view === 'kanban' && <div className="mt-8 grid grid-cols-6 gap-4">{Object.keys(cols).map((c) => <section key={c}><div className="mb-3 flex justify-between rounded-xl bg-slate-100 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-500"><span>{c}</span><span>{cols[c].length}</span></div>{cols[c].length ? cols[c].map((x: any) => <div className="card mb-3 p-4" key={x.id}><b>{x.jobPosting?.title || 'Untitled role'}</b><p className="mt-3 text-xs text-slate-500">{x.jobPosting?.targetMarket || 'EU'} · {x.jobPosting?.language || 'EN'}</p><div className="mt-3 h-1.5 rounded-full bg-slate-100"><div className="h-1.5 w-4/5 rounded-full bg-gradient-to-r from-emerald-400 to-blue-500" /></div></div>) : <div className="rounded-2xl border border-dashed p-5 text-center text-sm text-slate-400">{t.empty}</div>}</section>)}</div>}
      {view === 'list' && <section className="card mt-8 p-5">{items.length ? items.map((x: any) => <div key={x.id} className="grid grid-cols-4 gap-4 border-b py-4 text-sm last:border-0"><b>{x.jobPosting?.title || 'Untitled role'}</b><span>{x.status}</span><span>{x.jobPosting?.targetMarket || 'EU'}</span><span>{new Date(x.createdAt).toLocaleDateString()}</span></div>) : <p className="text-slate-500">{t.empty}</p>}</section>}
      {view === 'calendar' && <section className="card mt-8 p-5"><div className="grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-widest text-slate-400">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((x) => <div key={x}>{x}</div>)}</div><div className="mt-3 grid grid-cols-7 gap-2">{days.map((d) => <div key={d.toISOString()} className="min-h-28 rounded-2xl border bg-white p-2 text-left"><div className="text-xs font-bold text-slate-400">{d.getDate()}</div>{items.filter((x: any) => x.reminderAt && new Date(x.reminderAt).toDateString() === d.toDateString()).map((x: any) => <div key={x.id} className="mt-2 rounded-lg bg-emerald-50 p-2 text-xs font-bold text-emerald-700">{x.jobPosting?.title}</div>)}</div>)}</div></section>}
    </AppShell>
  );
}
