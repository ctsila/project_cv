'use client';

import AppShell from '@/components/AppShell';
import { demoProfile } from '@/lib/storage';
import { safeJson } from '@/lib/http';
import { getUiLang, type UiLang } from '@/lib/i18n';
import { useEffect, useState } from 'react';

const text:any = {
  en:{title:'Career Profile',help:'Upload your CV once. The parser maps data into editable fields below.',upload:'Upload CV',paste:'Or paste CV text',parse:'Parse and fill profile',saved:'Saved',saving:'Saving...',photo:'Profile photo'},
  ru:{title:'Профиль карьеры',help:'Загрузите CV один раз. Парсер разложит данные по редактируемым полям ниже.',upload:'Загрузить CV',paste:'Или вставить текст CV',parse:'Разобрать и заполнить профиль',saved:'Сохранено',saving:'Сохранение...',photo:'Фото профиля'},
  es:{title:'Perfil profesional',help:'Carga el CV una vez. El parser separa los datos en campos editables.',upload:'Cargar CV',paste:'O pegar texto',parse:'Analizar y completar perfil',saved:'Guardado',saving:'Guardando...',photo:'Foto'}
};
const empty:any={name:'',title:'',email:'',phone:'',location:'',summary:'',links:[],skills:[],languages:[],evidence:[],experience:[],education:[],projects:[],certifications:[],photoDataUrl:''};
const toLines=(v:any)=>Array.isArray(v)?v.join('\n'):'';
const toArr=(v:string)=>v.split('\n').map(x=>x.trim()).filter(Boolean);
function mergeProfile(cur:any,p:any){return{...cur,...p,links:p.links||cur.links||[],skills:p.skills||cur.skills||[],languages:p.languages||cur.languages||[],evidence:p.evidence||cur.evidence||[],experience:p.experience||cur.experience||[],education:p.education||cur.education||[],projects:p.projects||cur.projects||[],certifications:p.certifications||cur.certifications||[]};}
function readPhoto(file:File){return new Promise<string>((resolve,reject)=>{if(!file.type.startsWith('image/'))return reject(new Error('Image only'));if(file.size>2000000)return reject(new Error('Photo must be under 2 MB'));const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(new Error('Could not read photo'));r.readAsDataURL(file);});}

export default function ProfilePage(){
 const [lang,setLang]=useState<UiLang>('en');
 const [p,setP]=useState<any>({...empty,...demoProfile});
 const [loaded,setLoaded]=useState(false);
 const [saving,setSaving]=useState(false);
 const [uploadText,setUploadText]=useState('');
 const [uploadFileState,setUploadFileState]=useState<File|null>(null);
 const [busy,setBusy]=useState(false);
 const [msg,setMsg]=useState('');
 const [err,setErr]=useState('');
 const [parser,setParser]=useState<any>(null);
 const t=text[lang];
 async function save(next:any){setSaving(true);try{await fetch('/api/profile',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(next)});}finally{setSaving(false);}}
 useEffect(()=>{setLang(getUiLang());let ignore=false;async function load(){const res=await fetch('/api/profile');const data=await safeJson(res);if(!ignore){if(data.profile)setP({...empty,...data.profile});setLoaded(true);}}load();return()=>{ignore=true};},[]);
 useEffect(()=>{if(!loaded)return;const id=setTimeout(()=>save(p),700);return()=>clearTimeout(id);},[p,loaded]);
 async function applyUpload(formData:FormData){setBusy(true);setErr('');setMsg('');const res=await fetch('/api/uploads/cv',{method:'POST',body:formData});const data=await safeJson(res);setBusy(false);if(!res.ok){setErr(data.error||'Upload failed');return;}const next=mergeProfile(p,data.parsedProfile||data.profile||{});setP(next);await save(next);setParser({parser:data.parser,counts:data.counts,warning:data.parserWarning});setMsg('CV parsed and mapped into fields.');setUploadText('');}
 async function uploadCvText(){const fd=new FormData();fd.append('text',uploadText);await applyUpload(fd);}
 async function parseAndFillProfile(){
  if(!uploadFileState&&!uploadText.trim()){setErr('Select a CV file or paste CV text.');return;}
  const fd=new FormData();
  if(uploadFileState)fd.append('file',uploadFileState);
  else fd.append('text',uploadText);
  await applyUpload(fd);
  setUploadFileState(null);
 }
 async function uploadPhoto(file:File){try{const photoDataUrl=await readPhoto(file);const next={...p,photoDataUrl};setP(next);await save(next);}catch(e){setErr(e instanceof Error?e.message:'Photo failed');}}
 function upd(next:any){setP(next);}function exp(i:number,n:any){const a=[...(p.experience||[])];a[i]=n;upd({...p,experience:a});}function edu(i:number,n:any){const a=[...(p.education||[])];a[i]=n;upd({...p,education:a});}
 return <AppShell><h1 className="text-3xl font-black">{t.title}</h1><p className="mt-1 text-slate-500">{t.help}</p>
  <section className="card mt-6 p-6"><h2 className="font-black">{t.upload}</h2><input className="input mt-3" type="file" accept=".pdf,.doc,.docx,.txt" onChange={e=>setUploadFileState(e.target.files?.[0]||null)}/>{uploadFileState&&<p className="mt-2 text-sm text-slate-500">Selected file: {uploadFileState.name}</p>}<div className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400">{t.paste}</div><textarea className="input mt-2 min-h-28" value={uploadText} onChange={e=>setUploadText(e.target.value)}/><button className="btn btn-primary mt-4" disabled={busy||(!uploadFileState&&!uploadText.trim())} onClick={parseAndFillProfile}>{busy?'...':`${t.parse} →`}</button>{msg&&<div className="mt-4 rounded-xl bg-emerald-50 p-4 font-bold text-emerald-700">{msg}</div>}{err&&<div className="mt-4 rounded-xl bg-rose-50 p-4 font-bold text-rose-700">{err}</div>}</section>
 <section className="card mt-6 p-6"><div className="flex items-center justify-between"><b>Basics</b><span className="text-sm text-slate-400">{saving?t.saving:t.saved}</span></div><div className="mt-4 flex gap-5"><div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-slate-100">{p.photoDataUrl?<img src={p.photoDataUrl} className="h-full w-full object-cover" alt="Profile"/>:(p.name||'U').slice(0,1)}</div><div><b>{t.photo}</b><input className="mt-3 block" type="file" accept="image/*" onChange={e=>e.target.files?.[0]&&uploadPhoto(e.target.files[0])}/></div></div><div className="mt-5 grid grid-cols-2 gap-4"><input className="input" placeholder="Name" value={p.name||''} onChange={e=>upd({...p,name:e.target.value})}/><input className="input" placeholder="Title" value={p.title||''} onChange={e=>upd({...p,title:e.target.value})}/><input className="input" placeholder="Email" value={p.email||''} onChange={e=>upd({...p,email:e.target.value})}/><input className="input" placeholder="Phone" value={p.phone||''} onChange={e=>upd({...p,phone:e.target.value})}/><input className="input" placeholder="Location" value={p.location||''} onChange={e=>upd({...p,location:e.target.value})}/></div><textarea className="input mt-4 min-h-28" placeholder="Summary" value={p.summary||''} onChange={e=>upd({...p,summary:e.target.value})}/></section>
 <section className="card mt-6 p-6"><b>Experience</b>{(p.experience||[]).map((x:any,i:number)=><div className="mt-4 rounded-2xl border p-4" key={i}><div className="grid grid-cols-2 gap-3"><input className="input" placeholder="Role" value={x.role||''} onChange={e=>exp(i,{...x,role:e.target.value})}/><input className="input" placeholder="Company" value={x.company||''} onChange={e=>exp(i,{...x,company:e.target.value})}/><input className="input" placeholder="Start" value={x.start||''} onChange={e=>exp(i,{...x,start:e.target.value})}/><input className="input" placeholder="End" value={x.end||''} onChange={e=>exp(i,{...x,end:e.target.value})}/></div><textarea className="input mt-3 min-h-24" value={toLines(x.bullets)} onChange={e=>exp(i,{...x,bullets:toArr(e.target.value)})}/></div>)}<button className="mt-4 font-bold text-emerald-600" onClick={()=>upd({...p,experience:[...(p.experience||[]),{role:'',company:'',start:'',end:'',bullets:[]}]})}>+ Add role</button></section>
 <section className="card mt-6 p-6"><b>Education</b>{(p.education||[]).map((x:any,i:number)=><div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border p-4" key={i}><input className="input" placeholder="School" value={x.school||''} onChange={e=>edu(i,{...x,school:e.target.value})}/><input className="input" placeholder="Degree" value={x.degree||''} onChange={e=>edu(i,{...x,degree:e.target.value})}/><input className="input" placeholder="Field" value={x.field||''} onChange={e=>edu(i,{...x,field:e.target.value})}/><input className="input" placeholder="End" value={x.end||''} onChange={e=>edu(i,{...x,end:e.target.value})}/></div>)}<button className="mt-4 font-bold text-emerald-600" onClick={()=>upd({...p,education:[...(p.education||[]),{school:'',degree:'',field:'',end:''}]})}>+ Add education</button></section>
 <section className="card mt-6 p-6"><b>Skills</b><textarea className="input mt-3 min-h-36" value={toLines(p.skills)} onChange={e=>upd({...p,skills:toArr(e.target.value)})}/></section>
 <section className="card mt-6 p-6"><b>Projects</b><textarea className="input mt-3 min-h-28" value={(p.projects||[]).map((x:any)=>x.name||x.summary).join('\n')} onChange={e=>upd({...p,projects:toArr(e.target.value).map(x=>({name:x,summary:x,skills:[],evidence:[]}))})}/></section>
 <section className="card mt-6 p-6"><b>Certifications / Languages / Evidence</b><div className="mt-3 grid grid-cols-3 gap-4"><textarea className="input min-h-32" placeholder="Certifications" value={(p.certifications||[]).map((x:any)=>x.name).join('\n')} onChange={e=>upd({...p,certifications:toArr(e.target.value).map(x=>({name:x}))})}/><textarea className="input min-h-32" placeholder="Languages" value={toLines(p.languages)} onChange={e=>upd({...p,languages:toArr(e.target.value)})}/><textarea className="input min-h-32" placeholder="Evidence" value={toLines(p.evidence)} onChange={e=>upd({...p,evidence:toArr(e.target.value)})}/></div></section></AppShell>;
}
