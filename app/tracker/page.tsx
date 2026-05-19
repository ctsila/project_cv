'use client';
import AppShell from '@/components/AppShell';
import { useEffect, useState } from 'react';

const STATUSES = ['Saved', 'Applied', 'HR Screen', 'Interview', 'Offer', 'Rejected'];

export default function Tracker() {
	const [items, setItems] = useState<any[]>([]);

	useEffect(() => {
		let ignore = false;
		async function load() {
			const res = await fetch('/api/applications');
			const data = await res.json();
			if (!ignore) setItems(data.items || []);
		}
		load();
		return () => {
			ignore = true;
		};
	}, []);

	const cols: Record<string, any[]> = STATUSES.reduce((acc, status) => {
		acc[status] = items.filter((x) => x.status === status);
		return acc;
	}, {} as Record<string, any[]>);

	return (
		<AppShell>
			<div className="flex justify-between">
				<h1 className="text-3xl font-black">Application Tracker</h1>
				<div className="rounded-xl bg-slate-100 p-1 text-sm">
					<span className="rounded-lg bg-white px-4 py-2 font-bold shadow-sm">Kanban</span>
					<span className="px-4 py-2 text-slate-500">List</span>
					<span className="px-4 py-2 text-slate-500">Calendar</span>
				</div>
			</div>
			<div className="mt-8 grid grid-cols-6 gap-4">
				{Object.keys(cols).map((c) => (
					<section key={c}>
						<div className="mb-3 flex justify-between rounded-xl bg-slate-100 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-500">
							<span>{c}</span>
							<span>{cols[c].length}</span>
						</div>
						{cols[c].length ? cols[c].map((x: any) => {
							const lang = x.jobPosting?.language === 'en' ? 'EN' : x.jobPosting?.language || 'EN';
							return (
							<div className="card mb-3 p-4" key={x.id}>
								<b>{x.jobPosting?.title || 'Untitled role'}</b>
								<p className="mt-3 text-xs text-slate-500">{x.jobPosting?.targetMarket || 'EU'} · {lang}</p>
								<div className="mt-3 h-1.5 rounded-full bg-slate-100">
									<div className="h-1.5 w-4/5 rounded-full bg-gradient-to-r from-emerald-400 to-blue-500" />
								</div>
							</div>
						);
						}) : <div className="rounded-2xl border border-dashed p-5 text-center text-sm text-slate-400">No items yet</div>}
					</section>
				))}
			</div>
		</AppShell>
	);
}
