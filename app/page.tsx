'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';

const copy: any = {
	en: { welcome: 'Welcome back', signin: 'Sign in to your workspace', create: 'Create account', reset: 'Reset password', email: 'Email', password: 'Password', name: 'Full name', country: 'Country', pageLang: 'Web page language', secure: 'Secure workspace access', sendReset: 'Send reset link' },
	ru: { welcome: 'С возвращением', signin: 'Войдите в рабочее пространство', create: 'Создать аккаунт', reset: 'Сбросить пароль', email: 'Email', password: 'Пароль', name: 'Имя и фамилия', country: 'Страна', pageLang: 'Язык страницы', secure: 'Безопасный доступ к рабочему пространству', sendReset: 'Отправить ссылку сброса' },
	es: { welcome: 'Bienvenido', signin: 'Entra a tu espacio', create: 'Crear cuenta', reset: 'Restablecer contraseña', email: 'Email', password: 'Contraseña', name: 'Nombre completo', country: 'País', pageLang: 'Idioma de la página', secure: 'Acceso seguro al espacio de trabajo', sendReset: 'Enviar enlace' },
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

	async function handleRegister() {
		setBusy(true);
		setMessage('');
		setError('');
		const res = await fetch('/api/auth/register', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ ...form, uiLanguage: lang }),
		});
		const data = await res.json();
		setBusy(false);
		if (!res.ok) {
			setError(data.error || 'Registration failed.');
			return;
		}
		await signIn('credentials', { email: form.email, password: form.password, callbackUrl: '/dashboard' });
	}

	async function handleLogin() {
		setBusy(true);
		setMessage('');
		setError('');
		const result = await signIn('credentials', { email: form.email, password: form.password, redirect: false });
		setBusy(false);
		if (result?.error) {
			setError('Invalid credentials.');
			return;
		}
		window.location.href = '/dashboard';
	}

	async function handleReset() {
		setBusy(true);
		setMessage('');
		setError('');
		const res = await fetch('/api/auth/reset-password', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ email: form.email }),
		});
		const data = await res.json();
		setBusy(false);
		if (!res.ok) {
			setError(data.error || 'Reset failed.');
			return;
		}
		setMessage('Reset link sent if the email exists.');
	}

	return (
		<main className="grid min-h-screen grid-cols-[1fr_500px] hero text-white">
			<section className="flex flex-col justify-center px-16">
				<div className="mb-16 flex items-center gap-3 text-sm text-slate-300">
					<span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-blue-500">▣</span>AI Resume Generator
				</div>
				<h1 className="max-w-3xl text-6xl font-black leading-tight">Tailored for the job.<br /><span className="bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">Grounded in truth.</span></h1>
				<p className="mt-7 max-w-2xl text-xl leading-8 text-slate-300">Create adapted resumes and cover letters for any role, market, and language without inventing a single claim.</p>
				<div className="mt-10 space-y-4">
					{['No Lies Mode — every bullet links to verified career facts.', 'Global localization — web UI, CV language, cover letter language and target market controls.', 'History — uploads, generated resumes, cover letters and interview prep are saved.'].map((x) => (
						<div className="glass rounded-2xl p-5 font-bold" key={x}>{x}</div>
					))}
				</div>
			</section>
			<section className="flex items-center border-l border-white/10 bg-[#0d1424]/80 px-10">
				<div className="w-full">
					<label className="text-xs font-bold uppercase tracking-widest text-slate-400">{t.pageLang}</label>
					<select className="input mt-2 text-slate-900" value={lang} onChange={(e) => setLang(e.target.value as any)}>
						<option value="en">English</option>
						<option value="ru">Русский</option>
						<option value="es">Español</option>
					</select>
					<h2 className="mt-8 text-3xl font-black">{mode === 'register' ? t.create : mode === 'reset' ? t.reset : t.welcome}</h2>
					<p className="mt-2 text-slate-400">{mode === 'login' ? t.signin : t.secure}</p>
					{mode === 'register' && (
						<>
							<input className="input mt-6 text-slate-900" placeholder={t.name} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
							<input className="input mt-4 text-slate-900" placeholder={t.country} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
						</>
					)}
					<input className="input mt-4 text-slate-900" placeholder={t.email} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
					{mode !== 'reset' && <input className="input mt-4 text-slate-900" type="password" placeholder={t.password} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />}
					<button onClick={mode === 'reset' ? handleReset : mode === 'register' ? handleRegister : handleLogin} className="btn btn-primary mt-5 w-full" disabled={busy}>{busy ? 'Working...' : `${cta} →`}</button>
					{message && <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</div>}
					{error && <div className="mt-4 rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}
					{mode === 'login' && <button onClick={() => setMode('reset')} className="mt-4 w-full text-sm font-bold text-emerald-400">Forgot password?</button>}
					<div className="my-7 text-center text-sm text-slate-500">or continue with</div>
					<div className="grid grid-cols-2 gap-3">
						<a href="/api/auth/signin/google" className="btn glass text-center">Google</a>
						<a href="/api/auth/signin/linkedin" className="btn glass text-center">LinkedIn</a>
						<a href="/api/auth/signin/yandex" className="btn glass text-center">Yandex</a>
						<a href="/api/auth/signin/hh" className="btn glass text-center">hh.ru</a>
					</div>
					<button onClick={() => setMode(mode === 'register' ? 'login' : 'register')} className="mt-8 w-full text-center text-emerald-400">{mode === 'register' ? 'Back to sign in' : 'Create account with email'}</button>
				</div>
			</section>
		</main>
	);
}
