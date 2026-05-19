'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { safeJson } from '@/lib/http';

const copy: any = {
  en: { welcome: 'Welcome back', signin: 'Sign in to your workspace', create: 'Create account', reset: 'Reset password', email: 'Email', password: 'Password', name: 'Full name', country: 'Country', pageLang: 'Web page language', secure: 'Secure workspace access', sendReset: 'Send reset link', forgot: 'Forgot password?', switchCreate: 'Create account with email', back: 'Back to sign in', or: 'Email/password only', hero: 'Tailored for the job.', truth: 'Grounded in truth.', desc: 'Create adapted resumes and cover letters for any role, market, and language without inventing unsupported claims.' },
  ru: { welcome: 'С возвращением', signin: 'Войдите в рабочее пространство', create: 'Создать аккаунт', reset: 'Сбросить пароль', email: 'Email', password: 'Пароль', name: 'Имя и фамилия', country: 'Страна', pageLang: 'Язык страницы', secure: 'Безопасный доступ', sendReset: 'Отправить ссылку сброса', forgot: 'Забыли пароль?', switchCreate: 'Создать аккаунт по email', back: 'Назад ко входу', or: 'Только email и пароль', hero: 'Резюме под вакансию.', truth: 'Без выдуманных фактов.', desc: 'Создавайте адаптированные резюме и сопроводительные письма для разных рынков и языков без неподтвержденных заявлений.' },
  es: { welcome: 'Bienvenido', signin: 'Entra a tu espacio', create: 'Crear cuenta', reset: 'Restablecer contraseña', email: 'Email', password: 'Contraseña', name: 'Nombre completo', country: 'País', pageLang: 'Idioma de la página', secure: 'Acceso seguro', sendReset: 'Enviar enlace', forgot: '¿Olvidaste la contraseña?', switchCreate: 'Crear cuenta con email', back: 'Volver al inicio', or: 'Solo email y contraseña', hero: 'CV adaptado a la vacante.', truth: 'Sin datos inventados.', desc: 'Crea CVs y cartas adaptadas por mercado e idioma sin afirmaciones no verificadas.' },
};

export default function Home() {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [lang, setLang] = useState<'en' | 'ru' | 'es'>('en');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', country: '', email: '', password: '' });
  const t = copy[lang];
  const cta = mode === 'register' ? t.create : mode === 'reset' ? t.sendReset : t.signin;

  function changeLang(value: 'en' | 'ru' | 'es') {
    setLang(value);
    localStorage.setItem('uiLanguage', value);
  }

  async function handleRegister() {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...form, uiLanguage: lang }) });
      const data = await safeJson(res);
      if (!res.ok) { setError(data.error || 'Registration failed.'); return; }
      const login = await signIn('credentials', { email: form.email, password: form.password, redirect: false });
      if (login?.error) { setError('Account was created, but automatic sign-in failed. Try signing in manually.'); return; }
      window.location.href = '/dashboard';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleLogin() {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const result = await signIn('credentials', { email: form.email, password: form.password, redirect: false });
      if (result?.error) { setError('Invalid credentials.'); return; }
      window.location.href = '/dashboard';
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: form.email }) });
      const data = await safeJson(res);
      if (!res.ok) { setError(data.error || 'Reset failed.'); return; }
      setMessage('Reset link sent if the email exists.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen grid-cols-[1fr_500px] hero text-white">
      <section className="flex flex-col justify-center px-16">
        <div className="mb-16 flex items-center gap-3 text-sm text-slate-300">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-blue-500">▣</span>
          AI Resume Generator
        </div>
        <h1 className="max-w-3xl text-6xl font-black leading-tight">{t.hero}<br /><span className="bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">{t.truth}</span></h1>
        <p className="mt-7 max-w-2xl text-xl leading-8 text-slate-300">{t.desc}</p>
        <div className="mt-10 space-y-4">
          {['No Lies Mode', 'CV parser', 'Vacancy match', 'History & tracker'].map((x) => <div className="glass rounded-2xl p-5 font-bold" key={x}>{x}</div>)}
        </div>
      </section>
      <section className="flex items-center border-l border-white/10 bg-[#0d1424]/80 px-10">
        <div className="w-full">
          <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{t.pageLang}</label>
          <select className="input mt-2 text-slate-900" value={lang} onChange={(e) => changeLang(e.target.value as any)}>
            <option value="en">English</option>
            <option value="ru">Русский</option>
            <option value="es">Español</option>
          </select>
          <h2 className="mt-8 text-3xl font-black">{mode === 'register' ? t.create : mode === 'reset' ? t.reset : t.welcome}</h2>
          <p className="mt-2 text-slate-400">{mode === 'login' ? t.signin : t.secure}</p>
          {mode === 'register' && <>
            <input className="input mt-6 text-slate-900" placeholder={t.name} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="input mt-4 text-slate-900" placeholder={t.country} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </>}
          <input className="input mt-4 text-slate-900" placeholder={t.email} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          {mode !== 'reset' && <input className="input mt-4 text-slate-900" type="password" placeholder={t.password} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />}
          <button onClick={mode === 'reset' ? handleReset : mode === 'register' ? handleRegister : handleLogin} className="btn btn-primary mt-5 w-full" disabled={busy}>{busy ? 'Working...' : `${cta} →`}</button>
          {message && <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</div>}
          {error && <div className="mt-4 rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}
          {mode === 'login' && <button onClick={() => setMode('reset')} className="mt-4 w-full text-sm font-bold text-emerald-400">{t.forgot}</button>}
          <div className="my-7 text-center text-sm text-slate-500">{t.or}</div>
          <button onClick={() => setMode(mode === 'register' ? 'login' : 'register')} className="w-full rounded-xl border border-white/10 py-3 text-center font-bold text-emerald-400">{mode === 'register' ? t.back : t.switchCreate}</button>
        </div>
      </section>
    </main>
  );
}
