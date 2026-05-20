'use client';

import AppShell from '@/components/AppShell';
import { demoProfile, sampleJob, samplePack } from '@/lib/storage';
import { safeJson } from '@/lib/http';
import { getUiLang, type UiLang } from '@/lib/i18n';
import { useEffect, useState } from 'react';

const LANGUAGES = ['English', 'Russian', 'Spanish', 'German'];
const MARKETS = ['EU', 'US', 'UK', 'Germany', 'Russia/CIS', 'UAE'];
const STATUSES = ['Saved', 'Applied', 'HR Screen', 'Interview', 'Offer', 'Rejected'];
const copy: any = {
  en: { title: 'Resume Builder', select: 'Select vacancy', generate: 'Generate', source: 'Source vacancy', save: 'Save to tracker', saved: 'Saved to tracker', status: 'Status', notes: 'Notes', reminder: 'Reminder', resume: 'Generated resume', cover: 'Cover letter', noJobs: 'Add a vacancy first.', tracker: 'Application tracker' },
  ru: { title: 'Конструктор резюме', select: 'Выбрать вакансию', generate: 'Создать', source: 'Исходная вакансия', save: 'Сохранить в трекер', saved: 'Сохранено в трекер', status: 'Статус', notes: 'Заметки', reminder: 'Напоминание', resume: 'Созданное резюме', cover: 'Сопроводительное письмо', noJobs: 'Сначала добавьте вакансию.', tracker: 'Трекер отклика' },
  es: { title: 'Constructor de CV', select: 'Seleccionar vacante', generate: 'Generar', source: 'Vacante fuente', save: 'Guardar', saved: 'Guardado', status: 'Estado', notes: 'Notas', reminder: 'Recordatorio', resume: 'CV generado', cover: 'Carta', noJobs: 'Añade una vacante primero.', tracker: 'Seguimiento' },
};
function fname(s: string) { return (s || 'resume').replace(/[^a-zA-Z0-9а-яА-ЯёЁ._-]+/g, '_').slice(0, 80); }

function inferEmploymentType(text: string) {
  const t = text.toLowerCase();
  if (/(full[-\s]?time|полная занятость|full time)/i.test(t)) return 'Full-time';
  if (/(part[-\s]?time|частичная занятость|part time)/i.test(t)) return 'Part-time';
  if (/(contract|contractor|контракт|договор)/i.test(t)) return 'Contract';
  if (/(intern|internship|стаж|стажировка)/i.test(t)) return 'Internship';
  return '';
}

function inferLevel(title: string, text: string) {
  const t = `${title} ${text}`.toLowerCase();
  if (/(senior|lead|principal|sr\b|старш(ий|ая)|ведущ)/i.test(t)) return 'Senior';
  if (/(middle|mid\b|middle\+|средн(ий|яя)|мид)/i.test(t)) return 'Mid';
  if (/(junior|jr\b|entry|стаж|младш)/i.test(t)) return 'Junior';
  return '';
}

function inferExperienceYears(text: string) {
  const matches = Array.from(text.matchAll(/(\d{1,2})\s*\+?\s*(?:years|yrs|год(?:а|ов)?|лет)/gi));
  const values = matches.map((m) => Number(m[1])).filter((n) => Number.isFinite(n));
  if (!values.length) return '';
  const max = Math.max(...values);
  return max > 0 ? `${max}+ years` : '';
}

export default function Workspace() {
  const [lang, setLang] = useState<UiLang>('en');
  const [jobs, setJobs] = useState<any[]>([]);
  const [job, setJob] = useState<any>(sampleJob);
  const [jobId, setJobId] = useState('');
  const [profile, setProfile] = useState<any>(demoProfile);
  const [pack, setPack] = useState<any>(samplePack);
  const [cvLanguage, setCvLanguage] = useState('English');
  const [coverLanguage, setCoverLanguage] = useState('English');
  const [market, setMarket] = useState('EU');
  const [noLies, setNoLies] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [resumeVersionId, setResumeVersionId] = useState<string | null>(null);
  const [coverLetterVersionId, setCoverLetterVersionId] = useState<string | null>(null);
  const [status, setStatus] = useState('Applied');
  const [notes, setNotes] = useState('');
  const [reminderAt, setReminderAt] = useState('');
  const [coverEnabled, setCoverEnabled] = useState(true);
  const t = copy[lang];

  useEffect(() => {
    setLang(getUiLang());
    setNoLies(localStorage.getItem('noLiesMode') !== 'off');
    const onStorage = () => { setLang(getUiLang()); setNoLies(localStorage.getItem('noLiesMode') !== 'off'); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      const [pRes, jRes] = await Promise.all([fetch('/api/profile'), fetch('/api/job-postings')]);
      if (pRes.status === 401 || jRes.status === 401) {
        window.location.href = '/';
        return;
      }
      const pData = await safeJson(pRes);
      const jData = await safeJson(jRes);
      if (ignore) return;
      if (!pRes.ok || !jRes.ok) {
        setError(pData.error || jData.error || 'Could not load workspace data');
        return;
      }
      if (pData.profile) setProfile(pData.profile);
      const list = jData.jobs || jData.items || [];
      setJobs(list);
      if (list[0]) chooseJob(list[0]);
    }
    load();
    return () => { ignore = true; };
  }, []);

  function chooseJob(j: any) {
    setJob(j.analysis || j);
    setJobId(j.id);
    const l = j.language === 'ru' ? 'Russian' : j.language === 'es' ? 'Spanish' : j.language === 'de' ? 'German' : 'English';
    setCvLanguage(l);
    setCoverLanguage(j.analysis?.coverLetterLanguage || l);
    setCoverEnabled(j.analysis?.coverLetterEnabled !== false);
    setMarket(j.targetMarket || 'EU');
    setMsg('');
  }

  async function generate() {
    if (!jobId) { setError(t.noJobs); return; }
    setBusy(true); setError(''); setMsg('');
    const res = await fetch('/api/ai/generate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ profile, job, market, language: cvLanguage, coverLetterLanguage: coverLanguage, coverLetterEnabled: coverEnabled, jobPostingId: jobId, noLiesMode: noLies }) });
    const data = await safeJson(res);
    setBusy(false);
    if (!res.ok) { setError(data.error || 'Generation failed'); return; }
    setPack(data.pack || samplePack);
    setResumeVersionId(data.resumeVersionId || null);
    setCoverLetterVersionId(data.coverLetterVersionId || null);
  }

  async function saveApplication() {
    if (!jobId) { setError(t.noJobs); return; }
    const res = await fetch('/api/applications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jobPostingId: jobId, resumeVersionId, coverLetterVersionId, status, notes, reminderAt: reminderAt || null }) });
    if (res.status === 401) {
      window.location.href = '/';
      return;
    }
    const data = await safeJson(res);
    if (!res.ok) { setError(data.error || 'Could not save'); return; }
    setMsg(t.saved);
  }

  async function download(format: 'pdf' | 'docx' | 'txt', kind: 'resume' | 'coverLetter') {
    const content = kind === 'resume' ? pack.resume : pack.coverLetter;
    setError('');
    if (!content) {
      setError('Nothing to export yet.');
      return;
    }
    const title = `${kind === 'resume' ? 'CV' : 'Cover'} ${job.title || ''}`.trim();
    try {
      const res = await fetch('/api/export', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title, content, format }) });
      if (!res.ok) {
        let message = 'Export failed.';
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          message = data?.error || message;
        } else {
          const text = await res.text();
          if (text.trim()) message = text.trim();
        }
        setError(message);
        return;
      }
      const blob = await res.blob();
      if (!blob.size) {
        setError('Export failed: empty file.');
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${fname(title)}.${format}`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      setError('Export failed.');
    }
  }

  const experienceYears = inferExperienceYears(job.sourceText || '');
  const level = inferLevel(job.title || '', job.sourceText || '');
  const employmentType = inferEmploymentType(job.sourceText || '');

  return <AppShell><h1 className="text-3xl font-black">{t.title}</h1><div className="mt-5 flex flex-wrap gap-3"><select className="input max-w-72" value={jobId} onChange={(e) => { const found = jobs.find((j) => j.id === e.target.value); if (found) chooseJob(found); }}><option value="">{t.select}</option>{jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}</select><select className="input max-w-44" value={cvLanguage} onChange={(e) => setCvLanguage(e.target.value)}>{LANGUAGES.map((x) => <option key={x}>{x}</option>)}</select><select className="input max-w-44" value={coverLanguage} onChange={(e) => setCoverLanguage(e.target.value)}>{LANGUAGES.map((x) => <option key={x}>CL: {x}</option>)}</select><select className="input max-w-44" value={market} onChange={(e) => setMarket(e.target.value)}>{MARKETS.map((x) => <option key={x}>{x}</option>)}</select><button className="btn btn-primary" onClick={generate}>{busy ? '...' : `${t.generate} →`}</button></div>{error && <div className="mt-4 rounded-xl bg-rose-50 p-4 font-bold text-rose-700">{error}</div>}{msg && <div className="mt-4 rounded-xl bg-emerald-50 p-4 font-bold text-emerald-700">{msg} <a href="/tracker" className="underline">Tracker →</a></div>}<div className="mt-6 grid grid-cols-[1fr_1fr] gap-5"><section className="card p-5"><div className="flex items-center justify-between"><b>{t.source}</b><div className="flex flex-wrap gap-2">{level ? <span className="pill bg-slate-100 text-slate-600">{level}</span> : null}{employmentType ? <span className="pill bg-slate-100 text-slate-600">{employmentType}</span> : null}</div></div><h2 className="mt-3 text-xl font-black">{job.title} — {job.company}</h2><div className="mt-4 grid grid-cols-3 gap-3"><div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="text-xs font-bold uppercase tracking-widest text-slate-400">Experience</div><div className="mt-2 text-2xl font-black text-slate-900">{experienceYears || 'n/a'}</div></div><div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="text-xs font-bold uppercase tracking-widest text-slate-400">Level</div><div className="mt-2 text-2xl font-black text-slate-900">{level || 'n/a'}</div></div><div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="text-xs font-bold uppercase tracking-widest text-slate-400">Type</div><div className="mt-2 text-2xl font-black text-slate-900">{employmentType || 'n/a'}</div></div></div><div className="mt-4 grid gap-4"><div><div className="text-xs font-bold uppercase tracking-widest text-slate-400">Core skills</div>{(job.requiredSkills || []).length ? <div className="mt-2 flex flex-wrap gap-2">{job.requiredSkills.map((s: string) => <span key={s} className="pill bg-emerald-50 text-emerald-700">{s}</span>)}</div> : <p className="mt-2 text-sm text-slate-500">No core skills detected yet.</p>}</div><div><div className="text-xs font-bold uppercase tracking-widest text-slate-400">Optional skills</div>{(job.preferredSkills || []).length ? <div className="mt-2 flex flex-wrap gap-2">{job.preferredSkills.map((s: string) => <span key={s} className="pill bg-slate-100 text-slate-600">{s}</span>)}</div> : <p className="mt-2 text-sm text-slate-500">No optional skills detected yet.</p>}</div><div><div className="text-xs font-bold uppercase tracking-widest text-slate-400">Experience</div>{(job.responsibilities || []).length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">{job.responsibilities.map((r: string, i: number) => <li key={`${r}-${i}`}>{r}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500">No responsibilities detected yet.</p>}</div><details className="rounded-2xl border border-dashed p-4"><summary className="cursor-pointer text-sm font-bold text-slate-600">Raw vacancy text</summary><pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap text-sm leading-6 text-slate-600">{job.sourceText || ''}</pre></details></div></section><section className="card p-5"><b>{t.tracker}</b><p className="mt-2 text-sm text-slate-500">{noLies ? 'No Lies ON' : 'No Lies OFF'} · {pack.truthRisk || 'n/a'}</p><select className="input mt-3" value={status} onChange={(e) => setStatus(e.target.value)}>{STATUSES.map((x) => <option key={x}>{x}</option>)}</select><input className="input mt-3" type="date" value={reminderAt} onChange={(e) => setReminderAt(e.target.value)} /><textarea className="input mt-3 min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t.notes} /><button className="btn btn-primary mt-3" onClick={saveApplication}>{t.save}</button></section></div><section className="card mt-6 p-6"><div className="flex justify-between"><b>{t.resume}</b><div className="flex gap-2"><button className="pill bg-slate-100" onClick={() => download('pdf', 'resume')}>PDF</button><button className="pill bg-slate-100" onClick={() => download('docx', 'resume')}>DOCX</button><button className="pill bg-slate-100" onClick={() => download('txt', 'resume')}>TXT</button></div></div><pre className="mt-4 whitespace-pre-wrap text-sm leading-6">{pack.resume}</pre></section><section className="card mt-6 p-6"><div className="flex items-center justify-between"><label className="flex items-center gap-3 font-black"><input className="h-5 w-5 rounded-md border border-slate-300 bg-white text-emerald-600 shadow-sm accent-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200" type="checkbox" checked={coverEnabled} onChange={(e) => setCoverEnabled(e.target.checked)} />{t.cover}</label><div className="flex gap-2"><button className="pill bg-slate-100" onClick={() => download('pdf', 'coverLetter')}>PDF</button><button className="pill bg-slate-100" onClick={() => download('docx', 'coverLetter')}>DOCX</button><button className="pill bg-slate-100" onClick={() => download('txt', 'coverLetter')}>TXT</button></div></div>{coverEnabled ? <pre className="mt-4 whitespace-pre-wrap text-sm leading-6">{pack.coverLetter}</pre> : null}</section></AppShell>;
}
