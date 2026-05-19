'use client';

import AppShell from '@/components/AppShell';
import { safeJson } from '@/lib/http';
import { getUiLang, type UiLang } from '@/lib/i18n';
import { useEffect, useState } from 'react';

const LANGUAGES = ['English', 'Russian', 'Spanish', 'German'];
const MARKETS = ['EU', 'US', 'UK', 'Germany', 'Russia/CIS', 'UAE'];
const copy: any = {
  en: { title: 'Vacancies', desc: 'Paste a vacancy text or supported public URL. The app validates it, extracts requirements and saves it for comparison.', url: 'Vacancy URL', text: 'Vacancy text', analyze: 'Analyze vacancy', checking: 'Checking and parsing...', success: 'Vacancy parsed. Open Compare Workspace.', interview: 'Generate interview prep', cover: 'Generate cover letter', coverLang: 'Cover letter language' },
  ru: { title: 'Вакансии', desc: 'Вставьте текст вакансии или поддерживаемую публичную ссылку. Приложение проверит вакансию, извлечет требования и сохранит ее для сравнения.', url: 'Ссылка на вакансию', text: 'Текст вакансии', analyze: 'Разобрать вакансию', checking: 'Проверка и разбор...', success: 'Вакансия разобрана. Открыть сравнение.', interview: 'Создать подготовку к интервью', cover: 'Создать сопроводительное письмо', coverLang: 'Язык сопроводительного письма' },
  es: { title: 'Vacantes', desc: 'Pega el texto de la vacante o una URL pública compatible. La app valida y extrae requisitos.', url: 'URL de vacante', text: 'Texto de vacante', analyze: 'Analizar vacante', checking: 'Analizando...', success: 'Vacante analizada. Abrir comparación.', interview: 'Generar preparación de entrevista', cover: 'Generar carta de presentación', coverLang: 'Idioma de carta' },
};

export default function VacancyPage() {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [cvLanguage, setCvLanguage] = useState('English');
  const [targetMarket, setTargetMarket] = useState('EU');
  const [coverLetterEnabled, setCoverLetterEnabled] = useState(true);
  const [coverLetterLanguage, setCoverLetterLanguage] = useState('English');
  const [interviewPrep, setInterviewPrep] = useState(true);
  const [uiLang, setUiLang] = useState<UiLang>('en');
  useEffect(() => { setUiLang(getUiLang()); }, []);
  const t = copy[uiLang];

  async function parse() {
    setBusy(true);
    setMsg('');
    setErr('');
    const res = await fetch('/api/vacancy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: url.trim(), text, language: cvLanguage, targetMarket, coverLetterEnabled, coverLetterLanguage, interviewPrep }) });
    const data = await safeJson(res);
    setBusy(false);
    if (!res.ok) { setErr(data.error || 'Could not analyze vacancy. Paste a real job description.'); return; }
    setMsg(t.success);
  }

  return (
    <AppShell>
      <h1 className="text-3xl font-black">{t.title}</h1>
      <p className="mt-1 text-slate-500">{t.desc}</p>
      <div className="card mt-8 p-6">
        <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{t.url}</label>
        <input className="input mt-2" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://hh.ru/vacancy/..." />
        <label className="mt-5 block text-xs font-bold uppercase tracking-widest text-slate-400">{t.text}</label>
        <textarea className="input mt-2 min-h-56" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste responsibilities, requirements, skills, company and role description here" />
        <div className="mt-5 grid grid-cols-3 gap-4">
          <select className="input" value={cvLanguage} onChange={(e) => setCvLanguage(e.target.value)}>{LANGUAGES.map((lang) => <option key={lang} value={lang}>CV: {lang}</option>)}</select>
          <select className="input" value={targetMarket} onChange={(e) => setTargetMarket(e.target.value)}>{MARKETS.map((market) => <option key={market} value={market}>Target: {market}</option>)}</select>
          <select className="input" value={coverLetterLanguage} onChange={(e) => setCoverLetterLanguage(e.target.value)}>{LANGUAGES.map((lang) => <option key={lang} value={lang}>{t.coverLang}: {lang}</option>)}</select>
        </div>
        <label className="mt-4 flex items-center gap-2 rounded-xl border bg-white px-4 py-3"><input type="checkbox" checked={coverLetterEnabled} onChange={(e) => setCoverLetterEnabled(e.target.checked)} />{t.cover}</label>
        <label className="mt-4 flex items-center gap-2 rounded-xl border bg-white px-4 py-3"><input type="checkbox" checked={interviewPrep} onChange={(e) => setInterviewPrep(e.target.checked)} />{t.interview}</label>
        <button onClick={parse} className="btn btn-primary mt-6" disabled={busy || (!url.trim() && !text.trim())}>{busy ? t.checking : `${t.analyze} →`}</button>
        {msg && <a href="/workspace" className="ml-4 font-bold text-emerald-600">{msg}</a>}
        {err && <p className="mt-4 rounded-xl bg-rose-50 p-4 font-bold text-rose-700">{err}</p>}
      </div>
    </AppShell>
  );
}
