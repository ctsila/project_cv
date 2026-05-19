'use client';
import AppShell from '@/components/AppShell';
import ScoreCard from '@/components/ScoreCard';
import { demoProfile, sampleJob, samplePack } from '@/lib/storage';
import { useEffect, useState } from 'react';
import { useWebLanguage } from '@/components/WebLanguageProvider';

const LANGUAGES = ['English', 'Russian', 'Spanish', 'German'];
const MARKETS = ['EU', 'US', 'UK', 'Germany', 'Russia/CIS', 'UAE'];

export default function Workspace() {
	const { language: webLanguage } = useWebLanguage();
	const [pack, setPack] = useState(samplePack);
	const [job, setJob] = useState<any>(sampleJob);
	const [profile, setProfile] = useState<any>(demoProfile);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const [language, setLanguage] = useState('English');
	const [market, setMarket] = useState('EU');
	const [coverLetterEnabled, setCoverLetterEnabled] = useState(true);
	const [coverLetterLanguage, setCoverLetterLanguage] = useState('English');
	const [jobId, setJobId] = useState<string | null>(null);
	const ui = {
		en: { title: 'Compare Workspace', subtitle: 'Job description, match analysis, and truthful tailored output.', source: 'Source vacancy', editor: 'Line-by-line editor', coverLetter: 'Cover letter', generate: 'Generate with AI →', generating: 'Generating...', disabled: 'Cover letter generation is disabled for this vacancy.' },
		ru: { title: 'Рабочее пространство', subtitle: 'Описание вакансии, анализ совпадения и правдивый адаптированный результат.', source: 'Исходная вакансия', editor: 'Построчный редактор', coverLetter: 'Cover letter', generate: 'Сгенерировать с AI →', generating: 'Генерация...', disabled: 'Генерация cover letter отключена для этой вакансии.' },
		es: { title: 'Área de trabajo', subtitle: 'Descripción de la vacante, análisis de ajuste y salida adaptada y veraz.', source: 'Vacante fuente', editor: 'Editor línea por línea', coverLetter: 'Cover letter', generate: 'Generar con IA →', generating: 'Generando...', disabled: 'La generación de cover letter está desactivada para esta vacante.' },
	}[webLanguage];

	useEffect(() => {
		let ignore = false;
		async function load() {
			const [profileRes, jobRes] = await Promise.all([fetch('/api/profile'), fetch('/api/job-postings/latest')]);
			const profileData = await profileRes.json();
			const jobData = await jobRes.json();
			if (ignore) return;
			if (profileData.profile) setProfile(profileData.profile);
			if (jobData.job) {
				const normalizedLanguage = jobData.job.language === 'en' ? 'English' : jobData.job.language || 'English';
				setJob(jobData.job.analysis || jobData.job);
				setLanguage(normalizedLanguage);
				setMarket(jobData.job.targetMarket || 'EU');
				setCoverLetterEnabled(jobData.job.analysis?.coverLetterEnabled !== false);
				setCoverLetterLanguage(jobData.job.analysis?.coverLetterLanguage || normalizedLanguage);
				setJobId(jobData.job.id);
			}
		}
		load();
		return () => {
			ignore = true;
		};
	}, []);

	async function gen() {
		if (!language || !market) {
			setError('Select the target market and CV language before generating.');
			return;
		}
		setError('');
		setBusy(true);
		const res = await fetch('/api/ai/generate', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ profile, job, market, language, jobPostingId: jobId, coverLetterEnabled, coverLetterLanguage }),
		});
		const data = await res.json();
		setPack(data.pack || samplePack);
		setBusy(false);
	}

	return (
		<AppShell>
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-black">{ui.title}</h1>
					<p className="text-slate-500">{ui.subtitle}</p>
				</div>
				<div className="flex items-center gap-3">
					<select className="input max-w-44 py-2 text-sm" value={language} onChange={(e) => setLanguage(e.target.value)}>
						{LANGUAGES.map((lang) => (
							<option key={lang} value={lang}>{lang}</option>
						))}
					</select>
					<select className="input max-w-44 py-2 text-sm" value={coverLetterLanguage} onChange={(e) => setCoverLetterLanguage(e.target.value)}>
						{LANGUAGES.map((lang) => (
							<option key={lang} value={lang}>{`Cover letter: ${lang}`}</option>
						))}
					</select>
					<select className="input max-w-44 py-2 text-sm" value={market} onChange={(e) => setMarket(e.target.value)}>
						{MARKETS.map((m) => (
							<option key={m} value={m}>{m}</option>
						))}
					</select>
					<label className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm">
						<input type="checkbox" checked={coverLetterEnabled} onChange={(e) => setCoverLetterEnabled(e.target.checked)} />
						Cover letter
					</label>
					<button onClick={gen} className="btn btn-primary">{busy ? ui.generating : ui.generate}</button>
				</div>
			</div>
			{error && <div className="mt-4 rounded-xl bg-rose-50 p-4 font-bold text-rose-700">{error}</div>}
			<div className="mt-6 grid grid-cols-[.95fr_.85fr_1.2fr] gap-5">
				<section className="card p-5">
					<b>{ui.source}</b>
					<h2 className="mt-4 text-xl font-black">{job.title} — {job.company}</h2>
					<p className="mt-3 text-sm leading-6 text-slate-600">{job.sourceText || 'No vacancy text available yet.'}</p>
					<div className="mt-5 flex flex-wrap gap-2">
						{(job.requiredSkills || []).map((k: string) => <span className="pill bg-blue-50 text-blue-700" key={k}>{k}</span>)}
					</div>
				</section>
				<section className="space-y-5">
					<ScoreCard title="ATS Score" score={pack.atsScore} note="Keyword match, section completeness and formatting." />
					<ScoreCard title="Locale Fit" score={pack.localeScore} note="Region-specific structure, tone and taboos." />
					<div className="card p-5">
						<b>No Lies Status</b>
						<p className="mt-2 text-sm text-slate-500">Truth risk: <b>{pack.truthRisk}</b></p>
					</div>
				</section>
				<section className="card p-6">
					<b>Resume — generated version</b>
					<pre className="mt-5 whitespace-pre-wrap text-sm leading-6 text-slate-700">{pack.resume}</pre>
				</section>
			</div>
			<section className="card mt-6 p-6">
				<h2 className="text-xl font-black">{ui.editor}</h2>
				{(pack.suggestions || []).map((s: any, i: number) => (
					<div className="mt-5 grid grid-cols-4 gap-4 rounded-2xl border p-4 text-sm" key={i}>
						<p><b>Original</b><br />{s.original}</p>
						<p><b>Rewrite</b><br />{s.rewrite}</p>
						<p><b>Why</b><br />{s.why}</p>
						<p><b>Evidence</b><br />{s.evidence}</p>
					</div>
				))}
			</section>
			<section className="card mt-6 p-6">
				<h2 className="text-xl font-black">{ui.coverLetter}</h2>
				{coverLetterEnabled ? <pre className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{pack.coverLetter}</pre> : <p className="mt-4 text-sm text-slate-500">{ui.disabled}</p>}
			</section>
		</AppShell>
	);
}
