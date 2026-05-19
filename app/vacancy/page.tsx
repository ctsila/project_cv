'use client';
import AppShell from '@/components/AppShell';
import { useState } from 'react';
import { sampleJob } from '@/lib/storage';

const LANGUAGES = ['English', 'Russian', 'Spanish', 'German'];
const MARKETS = ['EU', 'US', 'UK', 'Germany', 'Russia/CIS', 'UAE'];

export default function VacancyPage() {
	const [url, setUrl] = useState('');
	const [text, setText] = useState(sampleJob.sourceText);
	const [busy, setBusy] = useState(false);
	const [msg, setMsg] = useState('');
	const [err, setErr] = useState('');
	const [cvLanguage, setCvLanguage] = useState('English');
	const [targetMarket, setTargetMarket] = useState('EU');
	const [interviewPrep, setInterviewPrep] = useState(true);

	async function parse() {
		setBusy(true);
		setMsg('');
		setErr('');
		const res = await fetch('/api/vacancy', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ url, text, language: cvLanguage, targetMarket, interviewPrep }),
		});
		const data = await res.json();
		setBusy(false);
		if (!res.ok) {
			setErr(data.error || 'Could not analyze vacancy. Paste a real job description.');
			return;
		}
		setMsg('Vacancy parsed. Open Compare Workspace.');
	}

	return (
		<AppShell>
			<h1 className="text-3xl font-black">Vacancy Setup</h1>
			<p className="mt-1 text-slate-500">Use a vacancy URL, API-supported source, or paste the vacancy text manually. Analysis is blocked if the content does not look like a job posting.</p>
			<div className="card mt-8 p-6">
				<label className="text-xs font-bold uppercase tracking-widest text-slate-400">Vacancy URL</label>
				<input className="input mt-2" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://hh.ru/vacancy/... or LinkedIn job URL" />
				<label className="mt-5 block text-xs font-bold uppercase tracking-widest text-slate-400">Vacancy text</label>
				<textarea className="input mt-2 min-h-56" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste responsibilities, requirements, skills, company and role description here" />
				<div className="mt-5 grid grid-cols-4 gap-4">
					<select className="input" value={cvLanguage} onChange={(e) => setCvLanguage(e.target.value)}>
						{LANGUAGES.map((lang) => (<option key={lang} value={lang}>CV: {lang}</option>))}
					</select>
					<select className="input" value={targetMarket} onChange={(e) => setTargetMarket(e.target.value)}>
						{MARKETS.map((market) => (<option key={market} value={market}>Target: {market}</option>))}
					</select>
					<select className="input" disabled>
						<option>Web UI: English</option>
					</select>
					<select className="input" disabled>
						<option>Cover letter: English</option>
					</select>
				</div>
				<label className="mt-4 flex items-center gap-2 rounded-xl border bg-white px-4 py-3">
					<input type="checkbox" checked={interviewPrep} onChange={(e) => setInterviewPrep(e.target.checked)} />
					Generate interview prep
				</label>
				<button onClick={parse} className="btn btn-primary mt-6">{busy ? 'Checking and parsing...' : 'Analyze vacancy →'}</button>
				{msg && <a href="/workspace" className="ml-4 font-bold text-emerald-600">{msg}</a>}
				{err && <p className="mt-4 rounded-xl bg-rose-50 p-4 font-bold text-rose-700">{err}</p>}
			</div>
		</AppShell>
	);
}
