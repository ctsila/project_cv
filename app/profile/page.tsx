'use client';
import AppShell from '@/components/AppShell';
import { demoProfile } from '@/lib/storage';
import { useEffect, useState } from 'react';

export default function ProfilePage() {
	const [p, setP] = useState<any>(demoProfile);
	const [loaded, setLoaded] = useState(false);
	const [saving, setSaving] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [uploadText, setUploadText] = useState('');
	const [message, setMessage] = useState('');
	const [error, setError] = useState('');

	useEffect(() => {
		let ignore = false;
		async function load() {
			const res = await fetch('/api/profile');
			const data = await res.json();
			if (!ignore) {
				if (data.profile) setP({ ...demoProfile, ...data.profile, experience: data.profile.experience || [] });
				setLoaded(true);
			}
		}
		load();
		return () => {
			ignore = true;
		};
	}, []);

	useEffect(() => {
		if (!loaded) return;
		const timer = setTimeout(async () => {
			setSaving(true);
			await fetch('/api/profile', {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(p),
			});
			setSaving(false);
		}, 600);
		return () => clearTimeout(timer);
	}, [p, loaded]);

	function upd(next: any) {
		setP(next);
	}

	async function uploadFile(file: File) {
		setUploading(true);
		setMessage('');
		setError('');
		const formData = new FormData();
		formData.append('file', file);
		const res = await fetch('/api/uploads/cv', { method: 'POST', body: formData });
		const data = await res.json();
		setUploading(false);
		if (!res.ok) {
			setError(data.error || 'Upload failed.');
			return;
		}
		setMessage('CV uploaded and validated.');
	}

	async function uploadTextCv() {
		setUploading(true);
		setMessage('');
		setError('');
		const formData = new FormData();
		formData.append('text', uploadText);
		const res = await fetch('/api/uploads/cv', { method: 'POST', body: formData });
		const data = await res.json();
		setUploading(false);
		if (!res.ok) {
			setError(data.error || 'Upload failed.');
			return;
		}
		setMessage('CV text uploaded and validated.');
		setUploadText('');
	}

	return (
		<AppShell>
			<div className="grid grid-cols-[200px_1fr_260px] gap-8">
				<aside>
					<div className="text-xs font-bold uppercase tracking-widest text-slate-400">Profile sections</div>
					{['Basics', 'Experience', 'Education', 'Skills', 'Projects', 'Certifications', 'Languages', 'Evidence & metrics'].map((x, i) => (
						<div className={`mt-3 rounded-xl px-4 py-3 text-sm font-bold ${i === 1 ? 'bg-blue-50 text-blue-600' : 'text-slate-600'}`} key={x}>{x}</div>
					))}
				</aside>
				<section>
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-2xl font-black">Work Experience</h1>
							<p className="text-slate-500">Add each role. The AI asks for evidence so every bullet stays defensible.</p>
						</div>
						<span className="text-sm text-slate-400">{saving ? 'Saving...' : 'Saved'}</span>
					</div>
					{p.experience.map((e: any, idx: number) => (
						<div className="card mt-6 p-6" key={idx}>
							<div className="grid grid-cols-2 gap-4">
								<input className="input font-bold" value={e.role} onChange={(ev) => { const n = { ...p }; n.experience[idx].role = ev.target.value; upd(n); }} />
								<input className="input" value={e.location} onChange={(ev) => { const n = { ...p }; n.experience[idx].location = ev.target.value; upd(n); }} />
								<input className="input" value={e.company} onChange={(ev) => { const n = { ...p }; n.experience[idx].company = ev.target.value; upd(n); }} />
								<input className="input" value={`${e.start} — ${e.end}`} readOnly />
							</div>
							<textarea className="input mt-4 min-h-28" value={e.bullets.join('\n')} onChange={(ev) => { const n = { ...p }; n.experience[idx].bullets = ev.target.value.split('\n').filter(Boolean); upd(n); }} />
							<div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
								<b className="text-xs uppercase tracking-widest text-emerald-700">Evidence note for No Lies Mode</b>
								<textarea className="input mt-2" value={e.evidence.join('\n')} onChange={(ev) => { const n = { ...p }; n.experience[idx].evidence = ev.target.value.split('\n').filter(Boolean); upd(n); }} />
							</div>
						</div>
					))}
					<button className="mt-5 font-bold text-emerald-600">+ Add another role</button>

					<section className="card mt-8 p-6">
						<h2 className="text-lg font-black">Upload your current CV</h2>
						<p className="mt-2 text-sm text-slate-500">Upload a text, PDF, or DOCX CV. We validate that it is a real CV before processing.</p>
						<input className="input mt-4" type="file" accept=".txt,.pdf,.doc,.docx" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
						<div className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400">Or paste CV text</div>
						<textarea className="input mt-2 min-h-36" value={uploadText} onChange={(e) => setUploadText(e.target.value)} placeholder="Paste your CV text here" />
						<button className="btn btn-primary mt-4" onClick={uploadTextCv} disabled={uploading || !uploadText.trim()}>{uploading ? 'Uploading...' : 'Validate and upload text →'}</button>
						{message && <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</div>}
						{error && <div className="mt-4 rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}
					</section>
				</section>
				<aside>
					<div className="card p-5">
						<div className="text-xs font-bold uppercase tracking-widest text-slate-400">Profile completeness</div>
						<b className="text-4xl text-emerald-500">58%</b>
						<div className="mt-2 h-2 rounded-full bg-slate-100">
							<div className="h-2 w-[58%] rounded-full bg-gradient-to-r from-emerald-400 to-blue-500" />
						</div>
						<p className="mt-4 text-sm text-slate-500">Add skills, projects, and evidence to reach 100%.</p>
					</div>
					<div className="card mt-5 bg-blue-50 p-5">
						<b>Can you quantify the impact?</b>
						<p className="mt-2 text-sm text-slate-500">Metrics help create stronger ATS-friendly bullets.</p>
					</div>
				</aside>
			</div>
		</AppShell>
	);
}
