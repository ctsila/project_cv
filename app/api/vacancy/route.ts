import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
function clean(html:string){return html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,14000)}
function isVacancy(text:string){const t=text.toLowerCase();const jobTerms=['responsibilities','requirements','required','preferred','experience','skills','vacancy','job','role','position','candidate','we offer','salary','remote','full-time','part-time','обязанности','требования','вакансия','кандидат','опыт','навыки','puesto','requisitos','responsabilidades','experiencia'];const hits=jobTerms.filter(w=>t.includes(w)).length;return text.trim().length>80&&hits>=2}
function extract(text:string){const dict=['SQL','Python','JavaScript','React','Next','Product','Roadmap','Roadmapping','User Research','Agile','Scrum','Stakeholder','Security','SIEM','SOC','Cloud','AWS','Azure','API','Testing','Growth','PLG'];const keywords=dict.filter(k=>new RegExp(k.replace('/','\\/'),'i').test(text));return {title:(text.match(/(?:Senior|Lead|Middle|Junior)?\s*(?:Product Manager|Security Analyst|SOC Analyst|UX Researcher|Project Manager|Business Analyst)/i)?.[0]||'Parsed vacancy'),company:(text.match(/(?:at|company)\s+([A-Z][\w.-]+)/)?.[1]||'Target company'),responsibilities:text.split(/[.!?]\s/).filter(s=>/own|lead|manage|develop|analyz|coordinate|support|implement/i.test(s)).slice(0,6),requiredSkills:keywords.slice(0,8),preferredSkills:keywords.slice(8,13),senioritySignals:(text.match(/senior|lead|ownership|stakeholder|strategy/ig)||[]).slice(0,5),softSkills:(text.match(/communication|stakeholder|collaboration|ownership|leadership/ig)||[]).slice(0,5),tone:'professional, concise, evidence-driven',marketSignals:['Use concise ATS-friendly structure','Avoid unsupported claims','Prioritize measurable impact'],keywords:keywords.length?keywords:['responsibilities','skills','experience'],sourceText:text.slice(0,4500)}}
export async function POST(req:NextRequest){
	const session = await getServerSession(authOptions);
	if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	const userId = (session.user as any).id as string;
	const {url,text,language,targetMarket}=await req.json();let source=text||'';try{if(url){const hh=url.match(/hh\.(ru|kz|uz|by)\/vacancy\/(\d+)/);if(hh){const r=await fetch(`https://api.hh.ru/vacancies/${hh[2]}`,{headers:{'User-Agent':'AI Resume Generator MVP'}});const j=await r.json();source=[j.name,j.employer?.name,j.description,j.key_skills?.map((x:any)=>x.name).join(', ')].filter(Boolean).join('\n');}else{const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0'}});source=clean(await r.text())||source;}}}catch{source=text||''}if(!isVacancy(source)){return NextResponse.json({error:'This does not look like a vacancy. Paste a real job description with responsibilities, requirements, skills, company or role details.'},{status:400})}
	const analysis = extract(source);
	const job = await prisma.jobPosting.create({
		data: {
			userId,
			title: analysis.title,
			sourceUrl: url || null,
			sourceText: source,
			language: language || 'en',
			targetMarket: targetMarket || 'EU',
			analysis,
			companySignals: analysis.marketSignals || [],
		},
	});
	await prisma.historyItem.create({ data: { userId, type: 'vacancy', title: analysis.title, details: analysis.company } });
	return NextResponse.json({analysis, job})
}
