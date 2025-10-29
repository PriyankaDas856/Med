import { useEffect, useMemo, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import { motion, AnimatePresence } from 'framer-motion';

type Fields = {
	patientName: string;
	doctor: string;
	hospital: string;
	date: string;
	diagnosis: string;
	medicines: string;
	followUp: string;
	rawText: string;
};

const emptyFields: Fields = { patientName: '', doctor: '', hospital: '', date: '', diagnosis: '', medicines: '', followUp: '', rawText: '' };

export default function Upload() {
	const [dragOver, setDragOver] = useState(false);
	const [file, setFile] = useState<File | null>(null);
	const [step, setStep] = useState<'upload' | 'ocr' | 'review' | 'saved'>('upload');
	const [progress, setProgress] = useState(0);
	const [fields, setFields] = useState<Fields>(emptyFields);
	const inputRef = useRef<HTMLInputElement>(null);

	const userId = useMemo(() => localStorage.getItem('medpass_session') || 'demo@medpass.app', []);

	function onFilesSelected(files: FileList | null) {
		if (!files || !files[0]) return;
		const f = files[0];
		if (!/\.(pdf|jpg|jpeg|png)$/i.test(f.name)) {
			alert('Supported: PDF, JPG, JPEG, PNG');
			return;
		}
		setFile(f);
		setStep('ocr');
		setProgress(10);
		processFile(f).catch(() => {
			setStep('upload');
			alert('OCR failed');
		});
	}

	async function processFile(f: File) {
		setProgress(25);
		const form = new FormData();
		form.append('file', f);
		const res = await fetch('http://localhost:5174/api/upload', {
			method: 'POST',
			headers: { 'X-User-Id': userId },
			body: form,
		});
		setProgress(70);
		if (!res.ok) throw new Error('upload failed');
		const json = await res.json();
		setFields(json.fields as Fields);
		setProgress(100);
		setTimeout(() => setStep('review'), 400);
	}

	function onDrop(e: React.DragEvent) {
		e.preventDefault();
		setDragOver(false);
		onFilesSelected(e.dataTransfer.files);
	}

	async function onSave() {
		const res = await fetch('http://localhost:5174/api/records', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
			body: JSON.stringify({ ...fields, sourceFileName: file?.name ?? null }),
		});
		if (!res.ok) {
			alert('Save failed');
			return;
		}
		setStep('saved');
	}

	function onManual() {
		setFile(null);
		setFields(emptyFields);
		setStep('review');
	}

	return (
		<div className="min-h-full">
			<Navbar />
			<main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-28 sm:pt-36 pb-16">
				<div className="grid lg:grid-cols-2 gap-6 items-start">
					<section className="glass-light rounded-2xl p-6">
						<h2 className="text-2xl font-semibold text-blue-900">Smart Record Upload</h2>
						<p className="text-blue-800 mt-1 text-sm">Upload PDFs or images. We’ll extract the medical details for you to review.</p>

						{step === 'upload' && (
							<div
								onDragOver={e => { e.preventDefault(); setDragOver(true); }}
								onDragLeave={() => setDragOver(false)}
								onDrop={onDrop}
								className={`mt-5 rounded-2xl border-2 border-dashed ${dragOver ? 'border-blue-500 bg-blue-100' : 'border-blue-300 bg-blue-50'} p-8 text-center`}
							>
								<p className="text-blue-800">Drag & drop file here</p>
								<p className="text-blue-700 text-sm mt-1">or</p>
								<div className="mt-3 flex items-center justify-center gap-2">
									<Button onClick={() => inputRef.current?.click()} variant="secondary">Choose file</Button>
									<Button onClick={onManual} variant="ghost">Enter manually</Button>
									<input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => onFilesSelected(e.target.files)} />
								</div>
								<p className="text-xs text-blue-700 mt-2">Supported: PDF, JPG, JPEG, PNG</p>
							</div>
						)}

						{step === 'ocr' && (
							<div className="mt-6">
								<p className="text-blue-900">Extracting text…</p>
								<div className="mt-3 h-2 rounded-full bg-blue-100 overflow-hidden">
									<div className="h-full bg-blue-500" style={{ width: `${progress}%`, transition: 'width 300ms' }} />
								</div>
							</div>
						)}

						{step === 'saved' && (
							<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 text-blue-900">
								<p className="text-blue-100">Saved successfully.</p>
								<Button className="mt-3" onClick={() => { setStep('upload'); setFields(emptyFields); setFile(null); }} variant="primary">Upload another</Button>
							</motion.div>
						)}
					</section>

					<section className="glass-light rounded-2xl p-6">
						<h3 className="text-lg font-semibold text-blue-900">Review & Edit</h3>
						<div className="grid sm:grid-cols-2 gap-4 mt-4">
							<label className="text-sm text-blue-800">Patient Name
								<input className="mt-1 w-full rounded-xl border border-blue-300 bg-blue-100 px-3 py-2 focus:outline-none focus-glow" value={fields.patientName} onChange={e => setFields({ ...fields, patientName: e.target.value })} />
							</label>
							<label className="text-sm text-blue-800">Doctor
								<input className="mt-1 w-full rounded-xl border border-blue-300 bg-blue-100 px-3 py-2 focus:outline-none focus-glow" value={fields.doctor} onChange={e => setFields({ ...fields, doctor: e.target.value })} />
							</label>
							<label className="text-sm text-blue-800">Hospital
								<input className="mt-1 w-full rounded-xl border border-blue-300 bg-blue-100 px-3 py-2 focus:outline-none focus-glow" value={fields.hospital} onChange={e => setFields({ ...fields, hospital: e.target.value })} />
							</label>
							<label className="text-sm text-blue-800">Date
								<input type="date" className="mt-1 w-full rounded-xl border border-blue-300 bg-blue-100 px-3 py-2 focus:outline-none focus-glow" value={fields.date} onChange={e => setFields({ ...fields, date: e.target.value })} />
							</label>
							<label className="text-sm text-blue-800 sm:col-span-2">Diagnosis / Summary
								<textarea className="mt-1 w-full rounded-xl border border-blue-300 bg-blue-100 px-3 py-2 focus:outline-none focus-glow" rows={3} value={fields.diagnosis} onChange={e => setFields({ ...fields, diagnosis: e.target.value })} />
							</label>
							<label className="text-sm text-blue-800 sm:col-span-2">Medicines
								<textarea className="mt-1 w-full rounded-xl border border-blue-300 bg-blue-100 px-3 py-2 focus:outline-none focus-glow" rows={2} value={fields.medicines} onChange={e => setFields({ ...fields, medicines: e.target.value })} />
							</label>
							<label className="text-sm text-blue-800 sm:col-span-2">Next Follow-up / Remarks
								<textarea className="mt-1 w-full rounded-xl border border-blue-300 bg-blue-100 px-3 py-2 focus:outline-none focus-glow" rows={2} value={fields.followUp} onChange={e => setFields({ ...fields, followUp: e.target.value })} />
							</label>
						</div>
						<div className="mt-4 flex items-center gap-2">
							<Button variant="primary" onClick={onSave}>Save Record</Button>
							<Button variant="ghost" onClick={() => { setFields(emptyFields); setStep('upload'); }}>Cancel</Button>
						</div>
					</section>
				</div>

				<AnimatePresence>
					{step === 'review' && file && (
						<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="mt-6 glass-dark rounded-2xl p-4">
							<p className="text-blue-100 text-sm">Selected file: <span className="underline">{file.name}</span></p>
						</motion.div>
					)}
				</AnimatePresence>
			</main>
		</div>
	);
}


