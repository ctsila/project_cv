'use client';
import AppShell from '@/components/AppShell';
import { demoProfile } from '@/lib/storage';
import { safeJson } from '@/lib/http';
import { useEffect, useState } from 'react';

const sections = ['Basics', 'Experience', 'Education', 'Skills', 'Projects', 'Certifications', 'Languages', 'Evidence & metrics'];

function mergeParsedProfile(current: any, parsed: any) {
  return {
    ...current,
    name: parsed.name || current.name || '',
    title: parsed.title || current.title || '',
    email: parsed.email || current.email || '',
    phone: parsed.phone || current.phone || '',
    location: parsed.location || current.location || '',
    links: parsed.links?.length ? parsed.links : current.links || [],
    summary: parsed.summary || current.summary || '',
    skills: parsed.skills?.length ? parsed.skills : current.skills || [],
    languages: parsed.languages?.length ? parsed.languages : current.languages || [],
    evidence: parsed.evidence?.length ? parsed.evidence : current.evidence || [],
    experience: parsed.experience?.length ? parsed.experience : current.experience || [],
    education: parsed.education?.length ? parsed.education : current.education || [],
    projects: parsed.projects?.length ? parsed.projects : current.projects || [],
    certifications: parsed.certifications?.length ? parsed.certifications : current.certifications || [],
  };
}

export default function ProfilePage() {
  const [p, setP] = useState<any>({ ...demoProfile, education: [], projects: [], certifications: [], languages: [], evidence: [] });
  const [active, setActive] = useState('Basics');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadText, setUploadText] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function saveProfile(next: any) {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(next) });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Profile save failed.');
    } finally { setSaving(false); }
  }

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch('/api/profile');
        const data = await safeJson(res);
        if (!ignore && data.profile) setP({ ...p, ...data.profile });
      } finally { if (!ignore) setLoaded(true); }
    }
    load();
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => saveProfile(p).catch(() => setError('Profile autosave failed.')), 700);
    return () => clearTimeout(timer);
  }, [p, loaded]);

  async function handleParsed(data: any) {
    const next = mergeParsedProfile(p, data.parsedProfile);
    setP(next);
    await saveProfile(next);
    setActive('Basics');
    setMessage(`CV parsed once and applied across all sections: basics, experience, education, skills, projects, certifications, languages, and evidence. Extracted ${data.extractedTextLength} characters.`);
  }

  async function uploadFile(file: File) {
    setUploading(true); setMessage(''); setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/uploads/cv', { method: 'POST', body: formData });
      const data = await safeJson(res);
      if (!res.ok) { setError(`${data.error || 'Upload failed.'}${data.detail ? ` Details: ${data.detail}` : ''}`); return; }
      await handleParsed(data);
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
      await handleParsed(data);
      setUploadText('');
    } catch (e) { setError(e instanceof Error ? e.message : 'CV text upload failed.'); }
    finally { setUploading(false); }
  }

  function upd(next: any) { setP(next); }
  const completion = Math.min(100, Math.round(([p.name, p.title, p.summary].filter(Boolean).length * 8) + ((p.experience || []).length ? 20 : 0) + ((p.education || []).length ? 15 : 0) + Math.min((p.skills || []).length, 10) * 2 + ((p.projects || []).length ? 10 : 0) + ((p.languages || []).length ? 7 : 0)));

  return (
    <AppShell>
      <div className="grid grid-cols-[200px_1fr_260px] gap-8">
        <aside><div className="text-xs font-bold uppercase tracking-widest text-slate-400">Profile sections</div>{sections.map((x)=><button onClick={()=>setActive(x)} className={`mt-3 block w-full rounded-xl px-4 py-3 text-left text-sm font-bold ${active===x?'bg-blue-50 text-blue-600 ring-2 ring-slate-900':'text-slate-600'}`} key={x}>{x}</button>)}</aside>
        <section>
          <div className="flex items-center justify-between"><div><h1 className="text-2xl font-black">{active}</h1><p className="text-slate-500">Upload the CV once here. The app will fill every profile section automatically.</p></div><span className="text-sm text-slate-400">{saving?'Saving...':'Saved'}</span></div>
          <section className="card mt-8 p-6"><h2 className="text-lg font-black">Upload your current CV</h2><p className="mt-2 text-sm text-slate-500">Single upload point for the whole profile. Upload PDF, DOCX, TXT, or paste CV text once.</p><input className="input mt-4" type="file" accept=".txt,.pdf,.doc,.docx" onChange={(e)=>e.target.files?.[0]&&uploadFile(e.target.files[0])}/><div className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400">Or paste CV text</div><textarea className="input mt-2 min-h-28" value={uploadText} onChange={(e)=>setUploadText(e.target.value)} placeholder="Paste your CV text here"/><button className="btn btn-primary mt-4" onClick={uploadTextCv} disabled={uploading || !uploadText.trim()}>{uploading?'Uploading and mapping all sections...':'Validate and map full CV →'}</button>{message&&<div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</div>}{error&&<div className="mt-4 rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}</section>

          {active==='Basics'&&<section className="card mt-6 p-6"><div className="grid grid-cols-2 gap-4"><input className="input" placeholder="Full name" value={p.name||''} onChange={(e)=>upd({...p,name:e.target.value})}/><input className="input" placeholder="Headline / title" value={p.title||''} onChange={(e)=>upd({...p,title:e.target.value})}/><input className="input" placeholder="Email" value={p.email||''} onChange={(e)=>upd({...p,email:e.target.value})}/><input className="input" placeholder="Phone" value={p.phone||''} onChange={(e)=>upd({...p,phone:e.target.value})}/><input className="input" placeholder="Location" value={p.location||''} onChange={(e)=>upd({...p,location:e.target.value})}/></div><textarea className="input mt-4 min-h-28" placeholder="Summary" value={p.summary||''} onChange={(e)=>upd({...p,summary:e.target.value})}/><label className="mt-4 block text-xs font-bold uppercase tracking-widest text-slate-400">Links</label><textarea className="input mt-2 min-h-24" value={(p.links||[]).join('\n')} onChange={(e)=>upd({...p,links:e.target.value.split('\n').filter(Boolean)})}/></section>}

          {active==='Experience'&&<>{(p.experience||[]).map((e:any,idx:number)=><div className="card mt-6 p-6" key={idx}><div className="grid grid-cols-2 gap-4"><input className="input font-bold" placeholder="Role" value={e.role||''} onChange={(ev)=>{const a=[...(p.experience||[])];a[idx]={...a[idx],role:ev.target.value};upd({...p,experience:a})}}/><input className="input" placeholder="Company" value={e.company||''} onChange={(ev)=>{const a=[...(p.experience||[])];a[idx]={...a[idx],company:ev.target.value};upd({...p,experience:a})}}/><input className="input" placeholder="Location" value={e.location||''} onChange={(ev)=>{const a=[...(p.experience||[])];a[idx]={...a[idx],location:ev.target.value};upd({...p,experience:a})}}/><input className="input" placeholder="Start — End" value={`${e.start||''} — ${e.end||''}`} readOnly/></div><textarea className="input mt-4 min-h-28" value={(e.bullets||[]).join('\n')} onChange={(ev)=>{const a=[...(p.experience||[])];a[idx]={...a[idx],bullets:ev.target.value.split('\n').filter(Boolean)};upd({...p,experience:a})}}/></div>)}<button onClick={()=>upd({...p,experience:[...(p.experience||[]),{company:'',role:'',location:'',start:'',end:'',bullets:[],evidence:[]}]})} className="mt-5 font-bold text-emerald-600">+ Add another role</button></>}

          {active==='Education'&&<section className="card mt-6 p-6">{(p.education||[]).map((e:any,i:number)=><div className="mb-4 grid grid-cols-2 gap-4" key={i}><input className="input" placeholder="School" value={e.school||''} onChange={(ev)=>{const a=[...(p.education||[])];a[i]={...a[i],school:ev.target.value};upd({...p,education:a})}}/><input className="input" placeholder="Degree / field" value={[e.degree,e.field].filter(Boolean).join(' ')} readOnly/></div>)}{!(p.education||[]).length&&<p className="text-slate-500">No education parsed yet.</p>}</section>}
          {active==='Skills'&&<section className="card mt-6 p-6"><textarea className="input min-h-64" value={(p.skills||[]).join('\n')} onChange={(e)=>upd({...p,skills:e.target.value.split('\n').filter(Boolean)})}/></section>}
          {active==='Projects'&&<section className="card mt-6 p-6">{(p.projects||[]).map((x:any,i:number)=><div className="mb-4 rounded-xl border p-4" key={i}><b>{x.name}</b><p className="mt-2 text-sm text-slate-600">{x.summary}</p></div>)}{!(p.projects||[]).length&&<p className="text-slate-500">No projects parsed yet.</p>}</section>}
          {active==='Certifications'&&<section className="card mt-6 p-6">{(p.certifications||[]).map((x:any,i:number)=><p className="border-b py-3" key={i}>{x.name}</p>)}{!(p.certifications||[]).length&&<p className="text-slate-500">No certifications parsed yet.</p>}</section>}
          {active==='Languages'&&<section className="card mt-6 p-6"><textarea className="input min-h-40" value={(p.languages||[]).join('\n')} onChange={(e)=>upd({...p,languages:e.target.value.split('\n').filter(Boolean)})}/></section>}
          {active==='Evidence & metrics'&&<section className="card mt-6 p-6"><textarea className="input min-h-64" value={(p.evidence||[]).join('\n')} onChange={(e)=>upd({...p,evidence:e.target.value.split('\n').filter(Boolean)})}/></section>}
        </section>
        <aside><div className="card p-5"><div className="text-xs font-bold uppercase tracking-widest text-slate-400">Profile completeness</div><b className="text-4xl text-emerald-500">{completion}%</b><div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-blue-500" style={{width:`${completion}%`}}/></div><p className="mt-4 text-sm text-slate-500">A single CV upload now fills all sections when data can be extracted.</p></div><div className="card mt-5 bg-blue-50 p-5"><b>Mapping status</b><p className="mt-2 text-sm text-slate-500">Experience: {(p.experience||[]).length}<br/>Education: {(p.education||[]).length}<br/>Skills: {(p.skills||[]).length}<br/>Projects: {(p.projects||[]).length}<br/>Certifications: {(p.certifications||[]).length}</p></div></aside>
      </div>
    </AppShell>
  );
}
