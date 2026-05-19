'use client';
import AppShell from '@/components/AppShell';
import { demoProfile } from '@/lib/storage';
import { safeJson } from '@/lib/http';
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
			try {
				const res = await fetch('/api/profile');
				const data = await safeJson(res);
				if (!ignore && data.profile) setP({ ...demoProfile, ...data.profile, experience: data.profile.experience || demoProfile.experience });
			} finally {
				if (!ignore) setLoaded(true);
			}
		}
		load();
		return () => { ignore = true; };
	}, []);

	useEffect(() => {
		if (!loaded) return;
		const timer = setTimeout(async () => {
			setSaving(true);
			try { await fetch('/api/profile', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(p) }); }
			finally { setSaving(false); }
		}, 600);
		return () => clearTimeout(timer);
	}, [p, loaded]);

	function applyParsedProfile(parsed: any) {
		if (!parsed) return;
		setP((current: any) => ({
			...current,
			name: parsed.name || current.name,
			title: parsed.title || current.title,
			email: parsed.email || current.email,
			location: parsed.location || current.location,
			links: parsed.links?.length ? parsed.links : current.links,
			summary: parsed.summary || current.summary,
			skills: parsed.skills?.length ? parsed.skills : current.skills,
			languages: parsed.languages?.length ? parsed.languages : current.languages,
			evidence: parsed.evidence?.length ? parsed.evidence : current.evidence,
			experience: parsed.experience?.length ? parsed.experience : current.experience,
			education: parsed.education?.length ? parsed.education : current.education,
		}));
	}

	async function uploadFile(file: File) {
		setUploading(true); setMessage(''); setError('');
		try {
			const formData = new FormData();
			formData.append('file', file);
			const res = await fetch('/api/uploads/cv', { method: 'POST', body: formData });
			const data = await safeJson(res);
			if (!res.ok) { setError(`${data.error || 'Upload failed.'}${data.detail ? ` Details: ${data.detail}` : ''}`); return; }
			applyParsedProfile(data.parsedProfile);
			setMessage(`CV parsed: ${data.sourceName}. Extracted ${data.extractedTextLength} characters and mapped fields into the profile.`);
		} catch (e) { setError(e instanceof Error ? e.message : 'CV upload failed.'); }
		finally { setUploading(false); }
	}

	async function uploadTextCv() {
		setUploading(true); setMessage(''); setError('');
		try {
			const formData = new FormData();
			formData.append('text', uploadText);
			const res = await fetch('/api/uploads/cv', { method: 'POST', body: formData });
			const data = await safeJson(res);
			if (!res.ok) { setError(`${data.error || 'Upload failed.'}${data.detail ? ` Details: ${data.detail}` : ''}`); return; }
			applyParsedProfile(data.parsedProfile);
			setMessage('CV text parsed and mapped into the profile. Review extracted facts before using No Lies Mode.');
			setUploadText('');
		} catch (e) { setError(e instanceof Error ? e.message : 'CV text upload failed.'); }
		finally { setUploading(false); }
	}

	function upd(next: any) { setP(next); }

	return (
		<AppShell>
			<div className="grid grid-cols-[200px_1fr_260px] gap-8">
				<aside><div className="text-xs font-bold uppercase tracking-widest text-slate-400">Profile sections</div>{['Basics','Experience','Education','Skills','Projects','Certifications','Languages','Evidence & metrics'].map((x,i)=><div className={`mt-3 rounded-xl px-4 py-3 text-sm font-bold ${i===1?'bg-blue-50 text-blue-600':'text-slate-600'}`} key={x}>{x}</div>)}</aside>
				<section>
					<div className="flex items-center justify-between"><div><h1 className="text-2xl font-black">Experience</h1><p className="text-slate-500">Edit one section at a time. Uploading a CV will auto-fill these fields when possible.</p></div><span className="text-sm text-slate-400">{saving?'Saving...':'Saved'}</span></div>
					<section className="card mt-8 p-6"><h2 className="text-lg font-black">Upload your current CV</h2><p className="mt-2 text-sm text-slate-500">Upload a PDF, DOCX, or text CV. Legacy DOC can be unreliable; save it as DOCX if parsing fails.</p><input className="input mt-4" type="file" accept=".txt,.pdf,.doc,.docx" onChange={(e)=>e.target.files?.[0]&&uploadFile(e.target.files[0])}/><div className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400">Or paste CV text</div><textarea className="input mt-2 min-h-36" value={uploadText} onChange={(e)=>setUploadText(e.target.value)} placeholder="Paste your CV text here"/><button className="btn btn-primary mt-4" onClick={uploadTextCv} disabled={uploading || !uploadText.trim()}>{uploading?'Uploading...':'Validate and upload text →'}</button>{message&&<div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</div>}{error&&<div className="mt-4 rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}</section>
					{(p.experience || []).map((e:any,idx:number)=><div className="card mt-6 p-6" key={idx}><div className="grid grid-cols-2 gap-4"><input className="input font-bold" value={e.role || ''} onChange={(ev)=>{const n={...p,experience:[...p.experience]};n.experience[idx].role=ev.target.value;upd(n)}}/><input className="input" value={e.location || ''} onChange={(ev)=>{const n={...p,experience:[...p.experience]};n.experience[idx].location=ev.target.value;upd(n)}}/><input className="input" value={e.company || ''} onChange={(ev)=>{const n={...p,experience:[...p.experience]};n.experience[idx].company=ev.target.value;upd(n)}}/><input className="input" value={`${e.start || ''} — ${e.end || ''}`} readOnly/></div><textarea className="input mt-4 min-h-28" value={(e.bullets || []).join('\n')} onChange={(ev)=>{const n={...p,experience:[...p.experience]};n.experience[idx].bullets=ev.target.value.split('\n').filter(Boolean);upd(n)}}/><div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><b className="text-xs uppercase tracking-widest text-emerald-700">Evidence note for No Lies Mode</b><textarea className="input mt-2" value={(e.evidence || []).join('\n')} onChange={(ev)=>{const n={...p,experience:[...p.experience]};n.experience[idx].evidence=ev.target.value.split('\n').filter(Boolean);upd(n)}}/></div></div>)}
					<button onClick={()=>upd({...p,experience:[...(p.experience||[]),{company:'',role:'',location:'',start:'',end:'',bullets:[],evidence:[]}]})} className="mt-5 font-bold text-emerald-600">+ Add another role</button>
				</section>
				<aside><div className="card p-5"><div className="text-xs font-bold uppercase tracking-widest text-slate-400">Profile completeness</div><b className="text-4xl text-emerald-500">58%</b><div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-2 w-[58%] rounded-full bg-gradient-to-r from-emerald-400 to-blue-500"/></div><p className="mt-4 text-sm text-slate-500">Add skills, projects, and evidence to reach 100%.</p></div></aside>
			</div>
		</AppShell>
	);
}
