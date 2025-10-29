import { useMemo, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';
import { extractTextFromFile } from '../lib/ocrService';
import RecordForm, { RecordFields, emptyRecordFields } from '../components/RecordForm';

export default function UploadRecord() {
	const [dragOver, setDragOver] = useState(false);
	const [file, setFile] = useState<File | null>(null);
	const [loading, setLoading] = useState(false);
	const [fields, setFields] = useState<RecordFields>(emptyRecordFields);
	const inputRef = useRef<HTMLInputElement>(null);
	const navigate = useNavigate();

	async function handleFiles(files: FileList | null) {
		if (!files || !files[0]) return;
		const f = files[0];
		if (!/\.(pdf|jpg|jpeg|png)$/i.test(f.name)) {
			alert('Supported: PDF, JPG, JPEG, PNG');
			return;
		}
		setFile(f);
		setLoading(true);
		try {
			const text = await extractTextFromFile(f);
			const next = parseMedicalText(text);
			setFields(next);
		} catch (e) {
			console.error(e);
			alert('OCR failed. Please fill in manually.');
		} finally {
			setLoading(false);
		}
	}

	function onDrop(e: React.DragEvent) {
		e.preventDefault();
		setDragOver(false);
		handleFiles(e.dataTransfer.files);
	}

	function onSave(data: RecordFields) {
		const existingRaw = localStorage.getItem('medpass_temp_records');
		const existing = existingRaw ? JSON.parse(existingRaw) as any[] : [];
		existing.unshift({ id: cryptoRandom(), savedAt: new Date().toISOString(), fileName: file?.name ?? null, ...data });
		localStorage.setItem('medpass_temp_records', JSON.stringify(existing));
		alert('Record saved');
		navigate('/dashboard');
	}

	return (
		<div className="min-h-full">
			<Navbar />
			<main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-28 sm:pt-36 pb-16">
				<div className="flex items-center justify-between">
					<h1 className="text-3xl font-bold text-white">Smart Record Upload</h1>
					<Button variant="ghost" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
				</div>

				<section className="mt-6 glass-light rounded-2xl p-6">
					<div
						onDragOver={e => { e.preventDefault(); setDragOver(true); }}
						onDragLeave={() => setDragOver(false)}
						onDrop={onDrop}
						className={`rounded-2xl border-2 border-dashed ${dragOver ? 'border-blue-500 bg-blue-100' : 'border-blue-300 bg-blue-50'} p-6 text-center`}
					>
						<p className="text-blue-800">Drag & drop an image or PDF here</p>
						<p className="text-blue-700 text-sm mt-1">or</p>
						<div className="mt-3 flex items-center justify-center gap-2">
							<Button variant="secondary" onClick={() => inputRef.current?.click()}>Choose File</Button>
							<input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => handleFiles(e.target.files)} />
						</div>
						{loading && (
							<div className="mt-4 text-blue-900">Extracting text…</div>
						)}
						{file && !loading && (
							<p className="mt-3 text-sm text-blue-700">Selected: {file.name}</p>
						)}
					</div>
				</section>

				<section className="mt-6 glass-light rounded-2xl p-6">
					<h2 className="text-blue-900 font-semibold">Review & Edit</h2>
					<RecordForm value={fields} onChange={setFields} onSave={() => onSave(fields)} />
				</section>
			</main>
		</div>
	);
}

function cryptoRandom(): string {
	if ('randomUUID' in crypto) return (crypto as any).randomUUID();
	return Math.random().toString(36).slice(2);
}

function parseMedicalText(text: string): RecordFields {
	const cleaned = (text || '').replace(/\t/g, ' ').replace(/ +/g, ' ').trim();
	const dateMatch = cleaned.match(/(\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b|\b\d{4}[\/-]\d{1,2}[\/-]\d{1,2}\b)/);
	const diagnosisMatch = cleaned.match(/Diagnosis\s*[:\-]\s*([^\n]+)/i);
	const rxMatch = cleaned.match(/(Rx|Prescription|Medicines?)\s*[:\-]?\s*([^\n]+)/i);
	return {
		patientName: '',
		date: dateMatch ? dateMatch[0] : '',
		diagnosis: diagnosisMatch ? diagnosisMatch[1].trim() : '',
		prescription: rxMatch ? rxMatch[2].trim() : '',
		notes: cleaned.slice(0, 1000),
	};
}


