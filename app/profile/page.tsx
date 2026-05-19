'use client';
import AppShell from '@/components/AppShell';
import { demoProfile } from '@/lib/storage';
import { useEffect, useState } from 'react';
import { useWebLanguage } from '@/components/WebLanguageProvider';

const sections = ['Basics', 'Experience', 'Education', 'Skills', 'Projects', 'Certifications', 'Languages', 'Evidence & metrics'] as const;

function createEmptyProfile() {
	return {
		name: '',
		accountName: '',
		accountImage: '',
		title: '',
		email: '',
		location: '',
		links: [] as string[],
		summary: '',
		skills: [] as string[],
		languages: [] as string[],
		evidence: [] as string[],
		experience: [] as any[],
		education: [] as any[],
		projects: [] as any[],
		certifications: [] as any[],
	};
}

function normalizeProfile(profile: any) {
	return {
		...createEmptyProfile(),
		...demoProfile,
		...profile,
		experience: profile?.experience || demoProfile.experience || [],
		education: profile?.education || [],
		projects: profile?.projects || [],
		certifications: profile?.certifications || [],
		languages: profile?.languages || [],
		evidence: profile?.evidence || [],
		links: profile?.links || demoProfile.links || [],
		accountName: profile?.accountName || profile?.user?.name || profile?.name || '',
		accountImage: profile?.accountImage || profile?.user?.image || '',
	};
}

function createExperienceItem() {
	return { company: '', role: '', location: '', start: '', end: '', bullets: [''], evidence: [''] };
}

function createEducationItem() {
	return { school: '', degree: '', field: '', start: '', end: '' };
}

function createProjectItem() {
	return { name: '', summary: '', skills: [''], evidence: [''] };
}

function createCertificationItem() {
	return { name: '', issuer: '', issuedAt: '' };
}

export default function ProfilePage() {
	const { language } = useWebLanguage();
	const title = language === 'ru' ? 'Профиль' : language === 'es' ? 'Perfil' : 'Profile';
	const savedLabel = language === 'ru' ? 'Сохранено' : language === 'es' ? 'Guardado' : 'Saved';
	const savingLabel = language === 'ru' ? 'Сохранение...' : language === 'es' ? 'Guardando...' : 'Saving...';
	const [activeSection, setActiveSection] = useState<(typeof sections)[number]>('Experience');
	const [p, setP] = useState<any>(normalizeProfile(demoProfile));
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
			const payload = await res.text();
			let data: any = {};
			try {
				data = payload ? JSON.parse(payload) : {};
			} catch {
				data = {};
			}
			if (!ignore) {
				if (data.profile) setP(normalizeProfile(data.profile));
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
				body: JSON.stringify({ ...p, accountName: p.accountName || p.name }),
			});
			setSaving(false);
		}, 600);
		return () => clearTimeout(timer);
	}, [p, loaded]);

	function upd(next: any) {
		setP(next);
	}

	function applyImportedProfile(profile: any) {
		setP(normalizeProfile(profile));
		setActiveSection('Basics');
	}

	async function uploadAvatar(file: File) {
		setUploading(true);
		setMessage('');
		setError('');
		const formData = new FormData();
		formData.append('file', file);
		const res = await fetch('/api/uploads/avatar', { method: 'POST', body: formData });
		const payload = await res.text();
		let data: any = {};
		try {
			data = payload ? JSON.parse(payload) : {};
		} catch {
			data = {};
		}
		setUploading(false);
		if (!res.ok) {
			setError(data.error || payload || 'Avatar upload failed.');
			return;
		}
		setP((current: any) => ({ ...current, accountImage: data.image || '' }));
		window.dispatchEvent(new CustomEvent('account-updated', { detail: { name: data.name || '', image: data.image || '' } }));
		setMessage('Profile picture updated.');
	}

	async function uploadFile(file: File) {
		setUploading(true);
		setMessage('');
		setError('');
		const formData = new FormData();
		formData.append('file', file);
		const res = await fetch('/api/uploads/cv', { method: 'POST', body: formData });
		const payload = await res.text();
		let data: any = {};
		try {
			data = payload ? JSON.parse(payload) : {};
		} catch {
			data = {};
		}
		setUploading(false);
		if (!res.ok) {
			setError(data.error || payload || 'Upload failed.');
			return;
		}
		if (data.profile) applyImportedProfile(data.profile);
		setMessage('CV uploaded, parsed, and applied to your profile.');
	}

	async function uploadTextCv() {
		setUploading(true);
		setMessage('');
		setError('');
		const formData = new FormData();
		formData.append('text', uploadText);
		const res = await fetch('/api/uploads/cv', { method: 'POST', body: formData });
		const payload = await res.text();
		let data: any = {};
		try {
			data = payload ? JSON.parse(payload) : {};
		} catch {
			data = {};
		}
		setUploading(false);
		if (!res.ok) {
			setError(data.error || payload || 'Upload failed.');
			return;
		}
		if (data.profile) applyImportedProfile(data.profile);
		setMessage('CV text uploaded, parsed, and applied to your profile.');
		setUploadText('');
	}

	function updateArrayItem(key: 'experience' | 'education' | 'projects' | 'certifications', index: number, next: any) {
		const items = [...(p[key] || [])];
		items[index] = next;
		upd({ ...p, [key]: items });
	}

	function updateTextArray(key: 'skills' | 'languages' | 'evidence' | 'links', value: string) {
		upd({ ...p, [key]: value.split('\n').map((line) => line.trim()).filter(Boolean) });
	}

	function renderBasics() {
		return (
			<div className="card mt-6 p-6">
				<div className="grid grid-cols-[180px_1fr] gap-4 rounded-2xl border bg-slate-50 p-4">
					<div className="flex flex-col items-center gap-3">
						<div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-indigo-600 text-xl font-black text-white">
							{p.accountImage ? <img src={p.accountImage} alt={p.accountName || p.name || 'Profile'} className="h-full w-full object-cover" /> : (p.accountName || p.name || 'JD').slice(0, 2).toUpperCase()}
						</div>
						<label className="cursor-pointer rounded-xl bg-white px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-500 shadow-sm">
							Upload photo
							<input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
						</label>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<input className="input font-bold" value={p.accountName || ''} onChange={(e) => upd({ ...p, accountName: e.target.value })} placeholder="Account name" />
						<input className="input" value={p.title} onChange={(e) => upd({ ...p, title: e.target.value })} placeholder="Headline / title" />
						<input className="input" value={p.location} onChange={(e) => upd({ ...p, location: e.target.value })} placeholder="Location" />
						<input className="input" value={p.email} readOnly placeholder="Email" />
					</div>
				</div>
				<textarea className="input mt-4 min-h-28" value={p.summary} onChange={(e) => upd({ ...p, summary: e.target.value })} placeholder="Professional summary" />
				<div className="mt-4 grid grid-cols-2 gap-4">
					<div>
						<div className="text-xs font-bold uppercase tracking-widest text-slate-400">Links</div>
						<textarea className="input mt-2 min-h-24" value={(p.links || []).join('\n')} onChange={(e) => updateTextArray('links', e.target.value)} placeholder="One link per line" />
					</div>
					<div>
						<div className="text-xs font-bold uppercase tracking-widest text-slate-400">Profile source</div>
						<div className="mt-2 rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-4 text-sm text-slate-600">Upload a PDF, DOC, DOCX, or text CV to auto-fill this profile.</div>
					</div>
				</div>
			</div>
		);
	}

	function renderExperience() {
		return (
			<>
				{p.experience.map((e: any, idx: number) => (
					<div className="card mt-6 p-6" key={idx}>
						<div className="grid grid-cols-2 gap-4">
							<input className="input font-bold" value={e.role} onChange={(ev) => updateArrayItem('experience', idx, { ...e, role: ev.target.value })} />
							<input className="input" value={e.location} onChange={(ev) => updateArrayItem('experience', idx, { ...e, location: ev.target.value })} />
							<input className="input" value={e.company} onChange={(ev) => updateArrayItem('experience', idx, { ...e, company: ev.target.value })} />
							<input className="input" value={`${e.start} — ${e.end}`} readOnly />
						</div>
						<textarea className="input mt-4 min-h-28" value={(e.bullets || []).join('\n')} onChange={(ev) => updateArrayItem('experience', idx, { ...e, bullets: ev.target.value.split('\n').filter(Boolean) })} />
						<div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
							<b className="text-xs uppercase tracking-widest text-emerald-700">Evidence note for No Lies Mode</b>
							<textarea className="input mt-2" value={(e.evidence || []).join('\n')} onChange={(ev) => updateArrayItem('experience', idx, { ...e, evidence: ev.target.value.split('\n').filter(Boolean) })} />
						</div>
					</div>
				))}
				<button type="button" className="mt-5 font-bold text-emerald-600" onClick={() => upd({ ...p, experience: [...p.experience, createExperienceItem()] })}>+ Add another role</button>
			</>
		);
	}

	function renderEducation() {
		return (
			<>
				{p.education.map((item: any, idx: number) => (
					<div className="card mt-6 p-6" key={idx}>
						<div className="grid grid-cols-2 gap-4">
							<input className="input font-bold" value={item.school} onChange={(e) => updateArrayItem('education', idx, { ...item, school: e.target.value })} placeholder="School" />
							<input className="input" value={item.degree} onChange={(e) => updateArrayItem('education', idx, { ...item, degree: e.target.value })} placeholder="Degree" />
							<input className="input" value={item.field} onChange={(e) => updateArrayItem('education', idx, { ...item, field: e.target.value })} placeholder="Field" />
							<input className="input" value={`${item.start || ''}${item.start || item.end ? ' — ' : ''}${item.end || ''}`} onChange={(e) => updateArrayItem('education', idx, { ...item })} placeholder="Start — End" readOnly />
						</div>
					</div>
				))}
				<button type="button" className="mt-5 font-bold text-emerald-600" onClick={() => upd({ ...p, education: [...p.education, createEducationItem()] })}>+ Add education</button>
			</>
		);
	}

	function renderSkills() {
		return <textarea className="input mt-6 min-h-56" value={(p.skills || []).join('\n')} onChange={(e) => updateTextArray('skills', e.target.value)} placeholder="One skill per line" />;
	}

	function renderProjects() {
		return (
			<>
				{p.projects.map((item: any, idx: number) => (
					<div className="card mt-6 p-6" key={idx}>
						<input className="input font-bold" value={item.name} onChange={(e) => updateArrayItem('projects', idx, { ...item, name: e.target.value })} placeholder="Project name" />
						<textarea className="input mt-4 min-h-24" value={item.summary} onChange={(e) => updateArrayItem('projects', idx, { ...item, summary: e.target.value })} placeholder="Project summary" />
						<textarea className="input mt-4 min-h-20" value={(item.skills || []).join('\n')} onChange={(e) => updateArrayItem('projects', idx, { ...item, skills: e.target.value.split('\n').filter(Boolean) })} placeholder="Project skills, one per line" />
					</div>
				))}
				<button type="button" className="mt-5 font-bold text-emerald-600" onClick={() => upd({ ...p, projects: [...p.projects, createProjectItem()] })}>+ Add project</button>
			</>
		);
	}

	function renderCertifications() {
		return (
			<>
				{p.certifications.map((item: any, idx: number) => (
					<div className="card mt-6 p-6" key={idx}>
						<div className="grid grid-cols-3 gap-4">
							<input className="input font-bold" value={item.name} onChange={(e) => updateArrayItem('certifications', idx, { ...item, name: e.target.value })} placeholder="Certification" />
							<input className="input" value={item.issuer} onChange={(e) => updateArrayItem('certifications', idx, { ...item, issuer: e.target.value })} placeholder="Issuer" />
							<input className="input" value={item.issuedAt} onChange={(e) => updateArrayItem('certifications', idx, { ...item, issuedAt: e.target.value })} placeholder="Issued at" />
						</div>
					</div>
				))}
				<button type="button" className="mt-5 font-bold text-emerald-600" onClick={() => upd({ ...p, certifications: [...p.certifications, createCertificationItem()] })}>+ Add certification</button>
			</>
		);
	}

	function renderLanguages() {
		return <textarea className="input mt-6 min-h-36" value={(p.languages || []).join('\n')} onChange={(e) => updateTextArray('languages', e.target.value)} placeholder="One language per line" />;
	}

	function renderEvidence() {
		return <textarea className="input mt-6 min-h-56" value={(p.evidence || []).join('\n')} onChange={(e) => updateTextArray('evidence', e.target.value)} placeholder="Evidence notes, one per line" />;
	}

	function renderActiveSection() {
		switch (activeSection) {
			case 'Basics':
				return renderBasics();
			case 'Experience':
				return renderExperience();
			case 'Education':
				return renderEducation();
			case 'Skills':
				return renderSkills();
			case 'Projects':
				return renderProjects();
			case 'Certifications':
				return renderCertifications();
			case 'Languages':
				return renderLanguages();
			case 'Evidence & metrics':
				return renderEvidence();
			default:
				return null;
		}
	}

	return (
		<AppShell>
			<div className="grid grid-cols-[200px_1fr_260px] gap-8">
				<aside>
					<div className="text-xs font-bold uppercase tracking-widest text-slate-400">Profile sections</div>
					{sections.map((x) => (
						<button type="button" onClick={() => setActiveSection(x)} className={`mt-3 block w-full rounded-xl px-4 py-3 text-left text-sm font-bold transition ${activeSection === x ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`} key={x}>
							{x}
						</button>
					))}
				</aside>
				<section>
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-2xl font-black">{activeSection === 'Basics' ? title : activeSection}</h1>
							<p className="text-slate-500">Edit one section at a time. Uploading a CV will auto-fill these fields when possible.</p>
						</div>
						<span className="text-sm text-slate-400">{saving ? savingLabel : savedLabel}</span>
					</div>
					<section className="card mt-8 p-6">
						<h2 className="text-lg font-black">Upload your current CV</h2>
						<p className="mt-2 text-sm text-slate-500">Upload a PDF, DOC, DOCX, or text CV. We validate it and map fields into your profile automatically.</p>
						<input className="input mt-4" type="file" accept=".txt,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
						<div className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400">Or paste CV text</div>
						<textarea className="input mt-2 min-h-36" value={uploadText} onChange={(e) => setUploadText(e.target.value)} placeholder="Paste your CV text here" />
						<button className="btn btn-primary mt-4" onClick={uploadTextCv} disabled={uploading || !uploadText.trim()}>{uploading ? 'Uploading...' : 'Validate and upload text →'}</button>
						{message && <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</div>}
						{error && <div className="mt-4 rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}
					</section>

					{renderActiveSection()}
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
