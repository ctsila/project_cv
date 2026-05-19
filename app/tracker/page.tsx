'use client';
import AppShell from '@/components/AppShell';
import { useEffect, useState } from 'react';

const STATUSES = ['Saved', 'Applied', 'HR Screen', 'Interview', 'Offer', 'Rejected'];

export default function Tracker() {
	const [items, setItems] = useState<any[]>([]);
	const [view, setView] = useState<'kanban' | 'list' | 'calendar'>('kanban');

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
					<button type="button" onClick={() => setView('kanban')} className={`rounded-lg px-4 py-2 font-bold ${view === 'kanban' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Kanban</button>
					<button type="button" onClick={() => setView('list')} className={`px-4 py-2 ${view === 'list' ? 'font-bold text-slate-900' : 'text-slate-500'}`}>List</button>
					<button type="button" onClick={() => setView('calendar')} className={`px-4 py-2 ${view === 'calendar' ? 'font-bold text-slate-900' : 'text-slate-500'}`}>Calendar</button>
				</div>
			</div>
			{view === 'kanban' && (
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
			)}
			{view === 'list' && (
				<div className="mt-8 space-y-3">
					{items.length ? items.map((x: any) => (
						<div className="card flex items-center justify-between p-4" key={x.id}>
							<div>
								<b>{x.jobPosting?.title || 'Untitled role'}</b>
								<p className="text-sm text-slate-500">{x.status} · {x.jobPosting?.targetMarket || 'EU'}</p>
							</div>
							<span className="pill bg-slate-100 text-slate-600">{x.jobPosting?.language === 'en' ? 'EN' : x.jobPosting?.language || 'EN'}</span>
						</div>
					)) : <div className="rounded-2xl border border-dashed p-10 text-center text-slate-500">No items yet</div>}
				</div>
			)}
			{view === 'calendar' && (
				<div className="mt-8 grid grid-cols-7 gap-4">
					{Array.from({ length: 14 }).map((_, index) => (
						<div key={index} className="rounded-2xl border bg-white p-4 text-sm text-slate-400">
							Day {index + 1}
							{index < items.length && <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-slate-700">{items[index]?.jobPosting?.title || 'Untitled role'}</div>}
						</div>
					))}
				</div>
			)}
		</AppShell>
	);
}
