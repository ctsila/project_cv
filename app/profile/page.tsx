'use client';
import AppShell from '@/components/AppShell';
import { demoProfile } from '@/lib/storage';
import { safeJson } from '@/lib/http';
import { getUiLang, type UiLang } from '@/lib/i18n';
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

<<<<<<< HEAD
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
=======
const sectionKeys = ['basics','experience','education','skills','projects','certifications','languages','evidence'] as const;
const copy:any={
  en:{sections:{basics:'Basics',experience:'Experience',education:'Education',skills:'Skills',projects:'Projects',certifications:'Certifications',languages:'Languages',evidence:'Evidence & metrics'},upload:'Upload your current CV',uploadHelp:'Single upload point for the whole profile. Upload PDF, DOCX, TXT, or paste CV text once.',paste:'Or paste CV text',button:'Validate and map full CV',uploading:'Uploading and mapping all sections...',saved:'Saved',saving:'Saving...',title:'Career Profile',desc:'Upload the CV once here. The app fills every profile section automatically.',emptyEdu:'No education parsed yet.',emptyProjects:'No projects parsed yet.',emptyCerts:'No certifications parsed yet.',mapping:'Mapping status',complete:'Profile completeness',photo:'Profile photo',photoHelp:'Optional. Upload a square photo if you want it included in profile/export layouts.'},
  ru:{sections:{basics:'Основное',experience:'Опыт',education:'Образование',skills:'Навыки',projects:'Проекты',certifications:'Сертификаты',languages:'Языки',evidence:'Доказательства и метрики'},upload:'Загрузите текущий CV',uploadHelp:'Одна точка загрузки для всего профиля. Загрузите PDF, DOCX, TXT или вставьте текст CV один раз.',paste:'Или вставьте текст CV',button:'Проверить и заполнить профиль',uploading:'Загрузка и заполнение всех разделов...',saved:'Сохранено',saving:'Сохранение...',title:'Профиль карьеры',desc:'Загрузите CV один раз здесь. Приложение автоматически заполнит все разделы профиля.',emptyEdu:'Образование пока не найдено.',emptyProjects:'Проекты пока не найдены.',emptyCerts:'Сертификаты пока не найдены.',mapping:'Статус заполнения',complete:'Заполненность профиля',photo:'Фото профиля',photoHelp:'Необязательно. Загрузите квадратное фото, если хотите использовать его в профиле и экспортируемых макетах.'},
  es:{sections:{basics:'Datos básicos',experience:'Experiencia',education:'Educación',skills:'Habilidades',projects:'Proyectos',certifications:'Certificaciones',languages:'Idiomas',evidence:'Evidencia y métricas'},upload:'Carga tu CV actual',uploadHelp:'Un solo punto de carga para todo el perfil. Carga PDF, DOCX, TXT o pega el texto una vez.',paste:'O pega el texto del CV',button:'Validar y completar perfil',uploading:'Cargando y asignando secciones...',saved:'Guardado',saving:'Guardando...',title:'Perfil profesional',desc:'Carga el CV una vez. La app completa todas las secciones.',emptyEdu:'No se encontró educación.',emptyProjects:'No se encontraron proyectos.',emptyCerts:'No se encontraron certificaciones.',mapping:'Estado de mapeo',complete:'Completitud del perfil',photo:'Foto de perfil',photoHelp:'Opcional. Carga una foto cuadrada si quieres usarla en el perfil y exportaciones.'}
};
function mergeParsedProfile(current:any, parsed:any){return{...current,name:parsed.name||current.name||'',title:parsed.title||current.title||'',email:parsed.email||current.email||'',phone:parsed.phone||current.phone||'',location:parsed.location||current.location||'',links:parsed.links?.length?parsed.links:current.links||[],summary:parsed.summary||current.summary||'',skills:parsed.skills?.length?parsed.skills:current.skills||[],languages:parsed.languages?.length?parsed.languages:current.languages||[],evidence:parsed.evidence?.length?parsed.evidence:current.evidence||[],experience:parsed.experience?.length?parsed.experience:current.experience||[],education:parsed.education?.length?parsed.education:current.education||[],projects:parsed.projects?.length?parsed.projects:current.projects||[],certifications:parsed.certifications?.length?parsed.certifications:current.certifications||[]};}
function readPhoto(file:File){return new Promise<string>((resolve,reject)=>{if(!file.type.startsWith('image/')){reject(new Error('Upload an image file.'));return}if(file.size>2_000_000){reject(new Error('Profile photo must be under 2 MB.'));return}const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Could not read image.'));reader.readAsDataURL(file);});}
export default function ProfilePage(){const [p,setP]=useState<any>({...demoProfile,education:[],projects:[],certifications:[],languages:[],evidence:[],photoDataUrl:''});const [active,setActive]=useState<any>('basics');const [loaded,setLoaded]=useState(false);const [saving,setSaving]=useState(false);const [uploading,setUploading]=useState(false);const [uploadText,setUploadText]=useState('');const [message,setMessage]=useState('');const [error,setError]=useState('');const [lang,setLang]=useState<UiLang>('en');const [parserInfo,setParserInfo]=useState<any>(null);const t=copy[lang];async function saveProfile(next:any){setSaving(true);try{const res=await fetch('/api/profile',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(next)});const data=await safeJson(res);if(!res.ok)throw new Error(data.error||'Profile save failed.');}finally{setSaving(false);}}
useEffect(()=>{setLang(getUiLang());let ignore=false;async function load(){try{const res=await fetch('/api/profile');const data=await safeJson(res);if(!ignore&&data.profile)setP((cur:any)=>({...cur,...data.profile}));}finally{if(!ignore)setLoaded(true)}}load();return()=>{ignore=true}},[]);
useEffect(()=>{if(!loaded)return;const timer=setTimeout(()=>saveProfile(p).catch(()=>setError('Profile autosave failed.')),700);return()=>clearTimeout(timer)},[p,loaded]);
async function handleParsed(data:any){const next=mergeParsedProfile(p,data.parsedProfile);setP(next);setParserInfo({parser:data.parser,warning:data.parserWarning,counts:data.counts});await saveProfile(next);setActive('basics');setMessage(`CV parsed once and applied across all sections. Parser: ${data.parser}. Experience: ${data.counts?.experience||0}, education: ${data.counts?.education||0}, skills: ${data.counts?.skills||0}, projects: ${data.counts?.projects||0}.`)}
async function uploadFile(file:File){setUploading(true);setMessage('');setError('');try{const formData=new FormData();formData.append('file',file);const res=await fetch('/api/uploads/cv',{method:'POST',body:formData});const data=await safeJson(res);if(!res.ok){setError(`${data.error||'Upload failed.'}${data.detail?` Details: ${data.detail}`:''}`);return}await handleParsed(data)}catch(e){setError(e instanceof Error?e.message:'CV upload failed.')}finally{setUploading(false)}}
async function uploadTextCv(){setUploading(true);setMessage('');setError('');try{const formData=new FormData();formData.append('text',uploadText);const res=await fetch('/api/uploads/cv',{method:'POST',body:formData});const data=await safeJson(res);if(!res.ok){setError(`${data.error||'Upload failed.'}${data.detail?` Details: ${data.detail}`:''}`);return}await handleParsed(data);setUploadText('')}catch(e){setError(e instanceof Error?e.message:'CV text upload failed.')}finally{setUploading(false)}}
async function uploadPhoto(file:File){setError('');try{const photoDataUrl=await readPhoto(file);const next={...p,photoDataUrl};setP(next);await saveProfile(next);}catch(e){setError(e instanceof Error?e.message:'Photo upload failed.')}}
function upd(next:any){setP(next)}const completion=Math.min(100,Math.round(([p.name,p.title,p.summary].filter(Boolean).length*8)+((p.experience||[]).length?20:0)+((p.education||[]).length?15:0)+Math.min((p.skills||[]).length,10)*2+((p.projects||[]).length?10:0)+((p.languages||[]).length?7:0)));return <AppShell><div className="grid grid-cols-[200px_1fr_260px] gap-8"><aside><div className="text-xs font-bold uppercase tracking-widest text-slate-400">{t.title}</div>{sectionKeys.map((key)=><button onClick={()=>setActive(key)} className={`mt-3 block w-full rounded-xl px-4 py-3 text-left text-sm font-bold ${active===key?'bg-blue-50 text-blue-600 ring-2 ring-slate-900':'text-slate-600'}`} key={key}>{t.sections[key]}</button>)}</aside><section><div className="flex items-center justify-between"><div><h1 className="text-2xl font-black">{t.sections[active]}</h1><p className="text-slate-500">{t.desc}</p></div><span className="text-sm text-slate-400">{saving?t.saving:t.saved}</span></div><section className="card mt-8 p-6"><h2 className="text-lg font-black">{t.upload}</h2><p className="mt-2 text-sm text-slate-500">{t.uploadHelp}</p><input className="input mt-4" type="file" accept=".txt,.pdf,.doc,.docx" onChange={e=>e.target.files?.[0]&&uploadFile(e.target.files[0])}/><div className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400">{t.paste}</div><textarea className="input mt-2 min-h-28" value={uploadText} onChange={e=>setUploadText(e.target.value)} placeholder="Paste your CV text here"/><button className="btn btn-primary mt-4" onClick={uploadTextCv} disabled={uploading||!uploadText.trim()}>{uploading?t.uploading:`${t.button} →`}</button>{message&&<div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</div>}{parserInfo?.warning&&<div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm font-bold text-amber-700">Parser warning: {parserInfo.warning}</div>}{error&&<div className="mt-4 rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}</section>
{active==='basics'&&<section className="card mt-6 p-6"><div className="mb-6 flex items-center gap-5 rounded-2xl border p-4"><div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-slate-100 text-2xl font-black text-slate-400">{p.photoDataUrl?<img src={p.photoDataUrl} alt="Profile" className="h-full w-full object-cover"/>:(p.name||'U').slice(0,1)}</div><div><b>{t.photo}</b><p className="mt-1 text-sm text-slate-500">{t.photoHelp}</p><input className="mt-3 text-sm" type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>e.target.files?.[0]&&uploadPhoto(e.target.files[0])}/>{p.photoDataUrl&&<button className="ml-3 text-sm font-bold text-rose-600" onClick={()=>upd({...p,photoDataUrl:''})}>Remove</button>}</div></div><div className="grid grid-cols-2 gap-4"><input className="input" placeholder="Full name" value={p.name||''} onChange={e=>upd({...p,name:e.target.value})}/><input className="input" placeholder="Headline / title" value={p.title||''} onChange={e=>upd({...p,title:e.target.value})}/><input className="input" placeholder="Email" value={p.email||''} onChange={e=>upd({...p,email:e.target.value})}/><input className="input" placeholder="Phone" value={p.phone||''} onChange={e=>upd({...p,phone:e.target.value})}/><input className="input" placeholder="Location" value={p.location||''} onChange={e=>upd({...p,location:e.target.value})}/></div><textarea className="input mt-4 min-h-28" placeholder="Summary" value={p.summary||''} onChange={e=>upd({...p,summary:e.target.value})}/><label className="mt-4 block text-xs font-bold uppercase tracking-widest text-slate-400">Links</label><textarea className="input mt-2 min-h-24" value={(p.links||[]).join('\n')} onChange={e=>upd({...p,links:e.target.value.split('\n').filter(Boolean)})}/></section>}
{active==='experience'&&<>{(p.experience||[]).map((e:any,idx:number)=><div className="card mt-6 p-6" key={idx}><div className="grid grid-cols-2 gap-4"><input className="input font-bold" placeholder="Role" value={e.role||''} onChange={ev=>{const a=[...(p.experience||[])];a[idx]={...a[idx],role:ev.target.value};upd({...p,experience:a})}}/><input className="input" placeholder="Company" value={e.company||''} onChange={ev=>{const a=[...(p.experience||[])];a[idx]={...a[idx],company:ev.target.value};upd({...p,experience:a})}}/><input className="input" placeholder="Location" value={e.location||''} onChange={ev=>{const a=[...(p.experience||[])];a[idx]={...a[idx],location:ev.target.value};upd({...p,experience:a})}}/><div className="grid grid-cols-2 gap-2"><input className="input" placeholder="Start" value={e.start||''} onChange={ev=>{const a=[...(p.experience||[])];a[idx]={...a[idx],start:ev.target.value};upd({...p,experience:a})}}/><input className="input" placeholder="End" value={e.end||''} onChange={ev=>{const a=[...(p.experience||[])];a[idx]={...a[idx],end:ev.target.value};upd({...p,experience:a})}}/></div></div><textarea className="input mt-4 min-h-28" value={(e.bullets||[]).join('\n')} onChange={ev=>{const a=[...(p.experience||[])];a[idx]={...a[idx],bullets:ev.target.value.split('\n').filter(Boolean)};upd({...p,experience:a})}}/></div>)}<button onClick={()=>upd({...p,experience:[...(p.experience||[]),{company:'',role:'',location:'',start:'',end:'',bullets:[],evidence:[]}]})} className="mt-5 font-bold text-emerald-600">+ Add another role</button></>}
{active==='education'&&<section className="card mt-6 p-6">{(p.education||[]).map((e:any,i:number)=><div className="mb-4 grid grid-cols-2 gap-4" key={i}><input className="input" placeholder="School" value={e.school||''} onChange={ev=>{const a=[...(p.education||[])];a[i]={...a[i],school:ev.target.value};upd({...p,education:a})}}/><input className="input" placeholder="Degree" value={e.degree||''} onChange={ev=>{const a=[...(p.education||[])];a[i]={...a[i],degree:ev.target.value};upd({...p,education:a})}}/><input className="input" placeholder="Field" value={e.field||''} onChange={ev=>{const a=[...(p.education||[])];a[i]={...a[i],field:ev.target.value};upd({...p,education:a})}}/><div className="grid grid-cols-2 gap-2"><input className="input" placeholder="Start" value={e.start||''} onChange={ev=>{const a=[...(p.education||[])];a[i]={...a[i],start:ev.target.value};upd({...p,education:a})}}/><input className="input" placeholder="End" value={e.end||''} onChange={ev=>{const a=[...(p.education||[])];a[i]={...a[i],end:ev.target.value};upd({...p,education:a})}}/></div></div>)}{!(p.education||[]).length&&<p className="text-slate-500">{t.emptyEdu}</p>}<button onClick={()=>upd({...p,education:[...(p.education||[]),{school:'',degree:'',field:'',start:'',end:''}]})} className="mt-3 font-bold text-emerald-600">+ Add education</button></section>}
{active==='skills'&&<section className="card mt-6 p-6"><textarea className="input min-h-64" value={(p.skills||[]).join('\n')} onChange={e=>upd({...p,skills:e.target.value.split('\n').filter(Boolean)})}/></section>}
{active==='projects'&&<section className="card mt-6 p-6">{(p.projects||[]).map((x:any,i:number)=><div className="mb-4 rounded-xl border p-4" key={i}><input className="input font-bold" value={x.name||''} onChange={e=>{const a=[...(p.projects||[])];a[i]={...a[i],name:e.target.value};upd({...p,projects:a})}}/><textarea className="input mt-2" value={x.summary||''} onChange={e=>{const a=[...(p.projects||[])];a[i]={...a[i],summary:e.target.value};upd({...p,projects:a})}}/></div>)}{!(p.projects||[]).length&&<p className="text-slate-500">{t.emptyProjects}</p>}<button onClick={()=>upd({...p,projects:[...(p.projects||[]),{name:'',summary:'',skills:[],evidence:[]}]})} className="mt-3 font-bold text-emerald-600">+ Add project</button></section>}
{active==='certifications'&&<section className="card mt-6 p-6">{(p.certifications||[]).map((x:any,i:number)=><div className="mb-4 grid grid-cols-3 gap-4" key={i}><input className="input" placeholder="Name" value={x.name||''} onChange={e=>{const a=[...(p.certifications||[])];a[i]={...a[i],name:e.target.value};upd({...p,certifications:a})}}/><input className="input" placeholder="Issuer" value={x.issuer||''} onChange={e=>{const a=[...(p.certifications||[])];a[i]={...a[i],issuer:e.target.value};upd({...p,certifications:a})}}/><input className="input" placeholder="Date" value={x.issuedAt||''} onChange={e=>{const a=[...(p.certifications||[])];a[i]={...a[i],issuedAt:e.target.value};upd({...p,certifications:a})}}/></div>)}{!(p.certifications||[]).length&&<p className="text-slate-500">{t.emptyCerts}</p>}<button onClick={()=>upd({...p,certifications:[...(p.certifications||[]),{name:'',issuer:'',issuedAt:''}]})} className="mt-3 font-bold text-emerald-600">+ Add certification</button></section>}
{active==='languages'&&<section className="card mt-6 p-6"><textarea className="input min-h-40" value={(p.languages||[]).join('\n')} onChange={e=>upd({...p,languages:e.target.value.split('\n').filter(Boolean)})}/></section>}
{active==='evidence'&&<section className="card mt-6 p-6"><textarea className="input min-h-64" value={(p.evidence||[]).join('\n')} onChange={e=>upd({...p,evidence:e.target.value.split('\n').filter(Boolean)})}/></section>}</section><aside><div className="card p-5"><div className="text-xs font-bold uppercase tracking-widest text-slate-400">{t.complete}</div><b className="text-4xl text-emerald-500">{completion}%</b><div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-blue-500" style={{width:`${completion}%`}}/></div></div><div className="card mt-5 bg-blue-50 p-5"><b>{t.mapping}</b><p className="mt-2 text-sm text-slate-500">Experience: {(p.experience||[]).length}<br/>Education: {(p.education||[]).length}<br/>Skills: {(p.skills||[]).length}<br/>Projects: {(p.projects||[]).length}<br/>Certifications: {(p.certifications||[]).length}</p></div></aside></div></AppShell>}
>>>>>>> 475a928ccaa35cdc12da7906e7db53c29a96b8a9
