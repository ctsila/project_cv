'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
<<<<<<< HEAD
import { useWebLanguage, type WebLanguage } from '@/components/WebLanguageProvider';

const NAV: Array<{ href: string; key: string }> = [
	{ href: '/dashboard', key: 'dashboard' },
	{ href: '/workspace', key: 'workspace' },
	{ href: '/profile', key: 'profile' },
	{ href: '/vacancy', key: 'vacancy' },
	{ href: '/history', key: 'history' },
	{ href: '/tracker', key: 'tracker' },
];

const STRINGS: Record<WebLanguage, Record<string, string>> = {
	en: {
		workspace: 'Workspace',
		noLies: 'No Lies Mode',
		noLiesBody: 'Evidence-backed claims only.',
		web: 'Web',
		dashboard: 'Dashboard',
		compare: 'Compare Workspace',
		profile: 'Career Profile',
		vacancy: 'Vacancies',
		history: 'History',
		tracker: 'Tracker',
	},
	ru: {
		workspace: 'Рабочая область',
		noLies: 'Режим без выдумок',
		noLiesBody: 'Только подтвержденные факты.',
		web: 'Веб',
		dashboard: 'Панель',
		compare: 'Сравнение',
		profile: 'Профиль',
		vacancy: 'Вакансии',
		history: 'История',
		tracker: 'Трекер',
	},
	es: {
		workspace: 'Espacio de trabajo',
		noLies: 'Modo sin inventos',
		noLiesBody: 'Solo hechos respaldados por evidencia.',
		web: 'Web',
		dashboard: 'Panel',
		compare: 'Comparar',
		profile: 'Perfil profesional',
		vacancy: 'Vacantes',
		history: 'Historial',
		tracker: 'Seguimiento',
	},
};

function getNavLabel(key: string, language: WebLanguage) {
	const map: Record<string, string> = {
		dashboard: STRINGS[language].dashboard,
		workspace: STRINGS[language].compare,
		profile: STRINGS[language].profile,
		vacancy: STRINGS[language].vacancy,
		history: STRINGS[language].history,
		tracker: STRINGS[language].tracker,
	};
	return map[key] || key;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
	const path = usePathname();
	const { language, setLanguage } = useWebLanguage();
	const t = STRINGS[language];
	const [user, setUser] = useState<{ name?: string | null; image?: string | null } | null>(null);

	useEffect(() => {
		let ignore = false;
		async function loadUser() {
			const res = await fetch('/api/me');
			const data = await res.json();
			if (!ignore) setUser(data.user || null);
		}
		loadUser();
		const handleAccountUpdate = (event: Event) => {
			const detail = (event as CustomEvent<{ name?: string | null; image?: string | null }>).detail;
			if (detail) setUser((current) => ({ ...current, ...detail }));
		};
		window.addEventListener('account-updated', handleAccountUpdate as EventListener);
		return () => {
			ignore = true;
			window.removeEventListener('account-updated', handleAccountUpdate as EventListener);
		};
	}, []);

	const initials = useMemo(() => {
		const source = user?.name || 'JD';
		return source
			.split(' ')
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase() || '')
			.join('') || 'JD';
	}, [user?.name]);

	return (
		<div className="min-h-screen bg-[#f7f8fc]">
			<aside className="fixed left-0 top-0 h-full w-60 border-r bg-white">
				<Link href="/" className="flex items-center gap-3 px-6 py-5 font-black">
					<span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-blue-500 text-white">▣</span>AI Resume
				</Link>
				<div className="px-4 text-xs font-bold uppercase tracking-widest text-slate-400">{t.workspace}</div>
				<nav className="mt-2 space-y-1 px-3">
					{NAV.map(({ href, key }) => (
						<Link key={href} href={href} className={`block rounded-xl px-4 py-3 text-sm font-bold ${path === href ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}>
							{getNavLabel(key, language)}
						</Link>
					))}
				</nav>
				<div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-slate-50 p-4 text-xs text-slate-500">
					<b>{t.noLies}</b>
					<br />
					{t.noLiesBody}
				</div>
			</aside>
			<main className="ml-60">
				<header className="sticky top-0 z-10 flex h-16 items-center justify-end gap-3 border-b bg-white/90 px-6 backdrop-blur">
					<div className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm">
						<span className="text-slate-500">{t.web}:</span>
						<select className="bg-transparent outline-none" value={language} onChange={(e) => setLanguage(e.target.value as WebLanguage)}>
							<option value="en">EN</option>
							<option value="ru">RU</option>
							<option value="es">ES</option>
						</select>
					</div>
					<span className="pill bg-emerald-50 text-emerald-700">{t.noLies}</span>
					<span className="pill bg-slate-100 text-slate-600">EU · {language.toUpperCase()}</span>
					<Link href="/profile" className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-indigo-600 font-bold text-white" aria-label="Open profile">
						{user?.image ? <img src={user.image} alt={user?.name || 'Profile'} className="h-full w-full object-cover" /> : initials}
					</Link>
				</header>
				<div className="p-8">{children}</div>
			</main>
		</div>
	);
=======
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
>>>>>>> 475a928ccaa35cdc12da7906e7db53c29a96b8a9
}
