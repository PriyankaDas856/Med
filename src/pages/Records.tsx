import { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import { apiMe, apiRecordsDelete, apiRecordsList, apiRecordsManual, apiRecordsUpload } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

type RecordItem = {
	id: string;
	file_name: string;
	file_url: string | null;
	record_type: string;
	summary: string;
	uploaded_at: string;
};

export default function Records() {
	const [items, setItems] = useState<RecordItem[]>([]);
	const [dragOver, setDragOver] = useState(false);
	const [progress, setProgress] = useState<number | null>(null);
	const [manualText, setManualText] = useState('');
	const [toast, setToast] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const navigate = useNavigate();

	useEffect(() => {
		apiMe().then(u => { if (!u) navigate('/auth'); });
		load();
	}, [navigate]);

	async function load() {
		const list = await apiRecordsList();
		setItems(list.map((i: any) => ({ id: i.id, file_name: i.data.file_name, file_url: i.data.file_url, record_type: i.data.record_type, summary: i.data.summary, uploaded_at: i.createdAt })));
	}

	function onDrop(e: React.DragEvent) {
		e.preventDefault();
		setDragOver(false);
		const files = Array.from(e.dataTransfer.files).filter(f => /\.(pdf|jpg|jpeg|png|docx|txt)$/i.test(f.name));
		if (files.length) onUpload(files);
	}

	async function onUpload(files: File[]) {
		try {
			setProgress(10);
			await apiRecordsUpload(files);
			setProgress(100);
			setToast('Upload successful');
			await load();
		} catch (e) {
			setToast('Upload failed');
		} finally {
			setTimeout(() => setProgress(null), 800);
		}
	}

	async function onSaveManual() {
		if (!manualText.trim()) return;
		try {
			await apiRecordsManual('Manual Entry', manualText);
			setManualText('');
			setToast('Record saved');
			await load();
		} catch {
			setToast('Save failed');
		}
	}

	async function onDelete(id: string) {
		if (!confirm('Delete this record?')) return;
		try {
			await apiRecordsDelete(id);
			setItems(prev => prev.filter(i => i.id !== id));
			setToast('Deleted');
		} catch {
			setToast('Delete failed');
		}
	}

	return (
		<div className="min-h-full">
			<Navbar />
			<main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-28 sm:pt-36 pb-16">
				<h1 className="text-3xl font-bold text-white">Smart Record Upload</h1>
				<p className="text-blue-100 mt-2">Upload files or add text-only records. We auto-tag and summarize.</p>

				<div className="mt-6 grid lg:grid-cols-3 gap-6">
					<section className="glass-light rounded-2xl p-5 lg:col-span-2">
						<div
							onDragOver={e => { e.preventDefault(); setDragOver(true); }}
							onDragLeave={() => setDragOver(false)}
							onDrop={onDrop}
							className={`rounded-2xl border-2 border-dashed ${dragOver ? 'border-blue-500 bg-blue-100' : 'border-blue-300 bg-blue-50'} p-8 text-center`}
						>
							<p className="text-blue-800">Drag & drop files here</p>
							<p className="text-blue-700 text-sm mt-1">or</p>
							<div className="mt-3 flex items-center justify-center gap-2">
								<Button variant="secondary" onClick={() => fileInputRef.current?.click()}>Browse files</Button>
								<input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.docx,.txt" multiple className="hidden" onChange={e => { const fs = Array.from(e.target.files || []); if (fs.length) onUpload(fs); }} />
							</div>
							<p className="text-xs text-blue-700 mt-2">Accepted: .pdf, .jpg, .jpeg, .png, .docx, .txt</p>
							{progress !== null && (
								<div className="mt-4 h-2 rounded-full bg-blue-100 overflow-hidden">
									<div className="h-full bg-blue-500" style={{ width: `${progress}%`, transition: 'width 300ms' }} />
								</div>
							)}
						</div>

						<div className="mt-5">
							<h3 className="text-blue-900 font-semibold">Manual entry</h3>
							<textarea className="mt-2 w-full rounded-xl border border-blue-300 bg-blue-100 px-3 py-2 focus:outline-none focus-glow" rows={4} value={manualText} onChange={e => setManualText(e.target.value)} placeholder="Paste or type medical notes here..." />
							<div className="mt-3">
								<Button variant="primary" onClick={onSaveManual}>Save Record</Button>
							</div>
						</div>
					</section>

					<section className="lg:col-span-1">
						<div className="glass-dark rounded-2xl p-5">
							<h3 className="text-white font-semibold">Analytics</h3>
							<p className="text-blue-100 text-sm mt-2">Total Records: {items.length}</p>
							<p className="text-blue-100 text-sm mt-1">Most Common Type: {modeType(items)}</p>
						</div>
					</section>
				</div>

				<div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
					{items.map(item => (
						<div key={item.id} className="glass-light rounded-2xl p-5">
							<p className="text-xs text-blue-700">{new Date(item.uploaded_at).toLocaleString()}</p>
							<h4 className="mt-1 font-semibold text-blue-900">{item.file_name}</h4>
							<p className="text-blue-800 text-sm mt-2 line-clamp-3">{item.summary}</p>
							<div className="mt-3 flex items-center justify-between">
								<span className="text-xs px-2 py-1 rounded-md bg-blue-200 text-blue-800">{item.record_type}</span>
								<div className="flex gap-2">
									{item.file_url ? (
										<a href={`http://localhost:5174${item.file_url}`} target="_blank" rel="noreferrer">
											<Button variant="ghost">View</Button>
										</a>
									) : null}
									<Button variant="ghost" onClick={() => onDelete(item.id)}>Delete</Button>
								</div>
							</div>
						</div>
					))}
				</div>

				<AnimatePresence>
					{toast && (
						<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 glass-dark px-4 py-2 rounded-xl text-blue-100">
							{toast}
						</motion.div>
					)}
				</AnimatePresence>
			</main>
		</div>
	);
}

function modeType(items: RecordItem[]): string {
	const counts = new Map<string, number>();
	for (const i of items) counts.set(i.record_type, (counts.get(i.record_type) || 0) + 1);
	let best = '—'; let max = 0;
	for (const [k, v] of counts) { if (v > max) { max = v; best = k; } }
	return best;
}


