'use client';

import AppShell from '@/components/AppShell';
import { safeJson } from '@/lib/http';
import { getUiLang, type UiLang } from '@/lib/i18n';
import { useEffect, useState } from 'react';

const STATUSES = ['Saved', 'Applied', 'HR Screen', 'Interview', 'Offer', 'Rejected'];
const copy: any = {
  en: { title: 'Application Tracker', kanban: 'Kanban', list: 'List', calendar: 'Calendar', empty: 'No items yet', status: 'Status', interview: 'Interview date/time', reminder: 'Reminder date/time', notes: 'Notes', save: 'Update', updated: 'Updated', move: 'Move to' },
  ru: { title: 'Трекер откликов', kanban: 'Канбан', list: 'Список', calendar: 'Календарь', empty: 'Пока пусто', status: 'Статус', interview: 'Дата и время интервью', reminder: 'Дата и время напоминания', notes: 'Заметки', save: 'Обновить', updated: 'Обновлено', move: 'Переместить в' },
  es: { title: 'Seguimiento de candidaturas', kanban: 'Kanban', list: 'Lista', calendar: 'Calendario', empty: 'Sin elementos', status: 'Estado', interview: 'Fecha/hora de entrevista', reminder: 'Recordatorio', notes: 'Notas', save: 'Actualizar', updated: 'Actualizado', move: 'Mover a' },
};
const statusStyle: Record<string, string> = {
  Saved: 'bg-slate-50 text-slate-700 border-slate-200',
  Applied: 'bg-blue-50 text-blue-700 border-blue-200',
  'HR Screen': 'bg-amber-50 text-amber-700 border-amber-200',
  Interview: 'bg-purple-50 text-purple-700 border-purple-200',
  Offer: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200',
};
function toDateTimeLocal(value: any) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}
function sameDay(a: any, b: Date) {
  if (!a) return false;
  const d = new Date(a);
  return !Number.isNaN(d.getTime()) && d.toDateString() === b.toDateString();
}

export default function Tracker() {
  const [items, setItems] = useState<any[]>([]);
  const [view, setView] = useState<'kanban' | 'list' | 'calendar'>('kanban');
  const [lang, setLang] = useState<UiLang>('en');
  const [editing, setEditing] = useState<any | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const t = copy[lang];

  async function load() {
    const res = await fetch('/api/applications');
    const data = await safeJson(res);
    setItems(data.items || []);
  }
  useEffect(() => { setLang(getUiLang()); load(); }, []);

  async function patchApplication(id: string, payload: any) {
    setError(''); setMessage('');
    const res = await fetch('/api/applications', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, ...payload }) });
    const data = await safeJson(res);
    if (!res.ok) { setError(data.error || 'Update failed.'); return; }
    await load();
    setMessage(t.updated);
    setEditing(null);
  }
  function openEdit(item: any) {
    setEditing({ ...item, interviewAtLocal: toDateTimeLocal(item.interviewAt), reminderAtLocal: toDateTimeLocal(item.reminderAt) });
  }
  const cols: Record<string, any[]> = STATUSES.reduce((acc, status) => { acc[status] = items.filter((x) => x.status === status); return acc; }, {} as Record<string, any[]>);
  const days = Array.from({ length: 42 }, (_, i) => { const d = new Date(); d.setDate(1 + i); return d; });

  const Card = ({ item }: { item: any }) => <div className={`mb-3 rounded-2xl border p-4 ${statusStyle[item.status] || statusStyle.Saved}`}><b>{item.jobPosting?.title || 'Untitled role'}</b><p className="mt-2 text-xs opacity-80">{item.jobPosting?.targetMarket || 'EU'} · {item.jobPosting?.language || 'EN'}</p>{item.interviewAt && <p className="mt-2 rounded-lg bg-white/70 p-2 text-xs font-bold">Interview: {new Date(item.interviewAt).toLocaleString()}</p>}<select className="input mt-3 bg-white text-sm" value={item.status} onChange={(e) => patchApplication(item.id, { status: e.target.value, interviewAt: e.target.value === 'Interview' ? item.interviewAt : item.interviewAt })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>{item.status === 'Interview' && <input className="input mt-2 bg-white text-sm" type="datetime-local" value={toDateTimeLocal(item.interviewAt)} onChange={(e) => patchApplication(item.id, { status: 'Interview', interviewAt: e.target.value })}/>}<button onClick={() => openEdit(item)} className="mt-3 text-xs font-black underline">Edit details</button></div>;

  return <AppShell><div className="flex justify-between"><h1 className="text-3xl font-black">{t.title}</h1><div className="rounded-xl bg-slate-100 p-1 text-sm"><button onClick={() => setView('kanban')} className={`px-4 py-2 ${view === 'kanban' ? 'rounded-lg bg-white font-bold shadow-sm' : 'text-slate-500'}`}>{t.kanban}</button><button onClick={() => setView('list')} className={`px-4 py-2 ${view === 'list' ? 'rounded-lg bg-white font-bold shadow-sm' : 'text-slate-500'}`}>{t.list}</button><button onClick={() => setView('calendar')} className={`px-4 py-2 ${view === 'calendar' ? 'rounded-lg bg-white font-bold shadow-sm' : 'text-slate-500'}`}>{t.calendar}</button></div></div>{message && <div className="mt-4 rounded-xl bg-emerald-50 p-4 font-bold text-emerald-700">{message}</div>}{error && <div className="mt-4 rounded-xl bg-rose-50 p-4 font-bold text-rose-700">{error}</div>}
  {view === 'kanban' && <div className="mt-8 grid grid-cols-6 gap-4">{STATUSES.map((c) => <section key={c}><div className={`mb-3 flex justify-between rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-widest ${statusStyle[c]}`}><span>{c}</span><span>{cols[c].length}</span></div>{cols[c].length ? cols[c].map((x: any) => <Card key={x.id} item={x}/>) : <div className="rounded-2xl border border-dashed p-5 text-center text-sm text-slate-400">{t.empty}</div>}</section>)}</div>}
  {view === 'list' && <section className="card mt-8 p-5">{items.length ? items.map((x: any) => <div key={x.id} className="grid grid-cols-[1.5fr_.9fr_.9fr_1fr_.5fr] items-center gap-4 border-b py-4 text-sm last:border-0"><b>{x.jobPosting?.title || 'Untitled role'}</b><select className="input text-sm" value={x.status} onChange={(e) => patchApplication(x.id, { status: e.target.value })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select><span>{x.jobPosting?.targetMarket || 'EU'}</span><span>{x.interviewAt ? `Interview: ${new Date(x.interviewAt).toLocaleString()}` : x.reminderAt ? `Reminder: ${new Date(x.reminderAt).toLocaleString()}` : new Date(x.createdAt).toLocaleDateString()}</span><button className="font-bold text-emerald-700" onClick={() => openEdit(x)}>Edit</button></div>) : <p className="text-slate-500">{t.empty}</p>}</section>}
  {view === 'calendar' && <section className="card mt-8 p-5"><div className="grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-widest text-slate-400">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((x) => <div key={x}>{x}</div>)}</div><div className="mt-3 grid grid-cols-7 gap-2">{days.map((d) => { const dayItems = items.filter((x) => sameDay(x.interviewAt, d) || sameDay(x.reminderAt, d)); return <div key={d.toISOString()} className="min-h-32 rounded-2xl border bg-white p-2 text-left"><div className="text-xs font-bold text-slate-400">{d.getDate()}</div>{dayItems.map((x: any) => { const isInterview = sameDay(x.interviewAt, d); return <button key={x.id} onClick={() => openEdit(x)} className={`mt-2 block w-full rounded-lg border p-2 text-left text-xs font-bold ${isInterview ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{isInterview ? 'Interview' : x.status}: {x.jobPosting?.title || 'Role'}<br/><span className="font-normal">{new Date(isInterview ? x.interviewAt : x.reminderAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></button>; })}</div>; })}</div></section>}
  {editing && <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-6"><section className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl"><div className="flex justify-between"><h2 className="text-xl font-black">{editing.jobPosting?.title || 'Application'}</h2><button onClick={() => setEditing(null)} className="font-black">×</button></div><label className="mt-4 block text-xs font-bold uppercase tracking-widest text-slate-400">{t.status}</label><select className="input mt-2" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select><label className="mt-4 block text-xs font-bold uppercase tracking-widest text-slate-400">{t.interview}</label><input className="input mt-2" type="datetime-local" value={editing.interviewAtLocal || ''} onChange={(e) => setEditing({ ...editing, interviewAtLocal: e.target.value, status: 'Interview' })}/><label className="mt-4 block text-xs font-bold uppercase tracking-widest text-slate-400">{t.reminder}</label><input className="input mt-2" type="datetime-local" value={editing.reminderAtLocal || ''} onChange={(e) => setEditing({ ...editing, reminderAtLocal: e.target.value })}/><label className="mt-4 block text-xs font-bold uppercase tracking-widest text-slate-400">{t.notes}</label><textarea className="input mt-2 min-h-24" value={editing.notes || ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })}/><button className="btn btn-primary mt-5" onClick={() => patchApplication(editing.id, { status: editing.status, interviewAt: editing.interviewAtLocal || null, reminderAt: editing.reminderAtLocal || null, notes: editing.notes || null })}>{t.save}</button></section></div>}
  </AppShell>;
}
