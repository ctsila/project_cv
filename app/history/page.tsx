'use client';
import AppShell from '@/components/AppShell';
import { useEffect, useState } from 'react';

export default function HistoryPage() {
	const [items, setItems] = useState<any[]>([]);

	useEffect(() => {
		let ignore = false;
		async function load() {
			const res = await fetch('/api/history');
			const data = await res.json();
			if (!ignore) setItems(data.items || []);
		}
		load();
		return () => {
			ignore = true;
		};
	}, []);

	return (
		<AppShell>
			<h1 className="text-3xl font-black">Generation and Upload History</h1>
			<p className="mt-1 text-slate-500">Every parsed vacancy, uploaded profile source, generated resume, cover letter and interview-prep set is recorded here.</p>
			<section className="card mt-8 p-5">
				{items.length ? items.map((x) => (
					<div key={x.id} className="flex items-center justify-between border-b py-4 last:border-0">
						<div>
							<span className="pill bg-slate-100 text-slate-600">{x.type}</span>
							<b className="ml-3">{x.title}</b>
							<p className="mt-2 text-sm text-slate-500">{x.details}</p>
						</div>
						<time className="text-sm text-slate-400">{new Date(x.createdAt).toLocaleString()}</time>
					</div>
				)) : <div className="rounded-2xl border border-dashed p-10 text-center text-slate-500">No history yet. Parse a vacancy or generate a resume to create the first record.</div>}
			</section>
		</AppShell>
	);
}
