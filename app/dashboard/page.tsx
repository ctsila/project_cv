'use client';
import AppShell from '@/components/AppShell';
import { useEffect, useState } from 'react';

export default function Dashboard() {
	const [apps, setApps] = useState<any[]>([]);

	useEffect(() => {
		let ignore = false;
		async function load() {
			const res = await fetch('/api/applications');
			const data = await res.json();
			if (!ignore) setApps(data.items || []);
		}
		load();
		return () => {
			ignore = true;
		};
	}, []);

	return (
		<AppShell>
			<h1 className="text-3xl font-black">Good afternoon 👋</h1>
			<p className="mt-1 text-slate-500">Track your applications, vacancy imports, and resume drafts from one place.</p>
			<div className="mt-8 grid grid-cols-4 gap-5">
				{['New application', 'Import vacancy', 'Build resume', 'Continue draft'].map((x) => (
					<div className="card p-6" key={x}>
						<div className="text-2xl">⚡</div>
						<h3 className="mt-4 font-black">{x}</h3>
						<p className="mt-1 text-sm text-slate-500">Paste, generate, compare, export.</p>
					</div>
				))}
			</div>
			<section className="card mt-6 p-5">
				<div className="flex justify-between">
					<b>Recent applications</b>
					<a className="text-sm font-bold text-emerald-600" href="/tracker">View all →</a>
				</div>
				{apps.length ? apps.slice(0, 5).map((a) => {
					const lang = a.jobPosting?.language === 'en' ? 'EN' : a.jobPosting?.language || 'EN';
					return (
					<div key={a.id} className="mt-5 flex items-center justify-between border-b pb-4 last:border-0">
						<div>
							<b>{a.jobPosting?.title || 'Application'}</b>
							<p className="text-sm text-slate-500">{a.jobPosting?.targetMarket || 'EU'} · {lang}</p>
						</div>
						<span className="pill bg-slate-100 text-slate-600">{a.status}</span>
					</div>
				);
				}) : <div className="mt-6 rounded-2xl border border-dashed p-8 text-center text-slate-500">No applications yet. Create one from a parsed vacancy.</div>}
			</section>
		</AppShell>
	);
}
