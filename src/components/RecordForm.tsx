export type RecordFields = {
	patientName: string;
	date: string;
	diagnosis: string;
	prescription: string;
	notes: string;
};

export const emptyRecordFields: RecordFields = { patientName: '', date: '', diagnosis: '', prescription: '', notes: '' };

export default function RecordForm({ value, onChange, onSave }: { value: RecordFields; onChange: (v: RecordFields) => void; onSave: () => void; }) {
	return (
		<div className="grid sm:grid-cols-2 gap-4 mt-4">
			<label className="text-sm text-blue-800">Patient Name
				<input className="mt-1 w-full rounded-xl border border-blue-300 bg-blue-100 px-3 py-2 focus:outline-none focus-glow" value={value.patientName} onChange={e => onChange({ ...value, patientName: e.target.value })} />
			</label>
			<label className="text-sm text-blue-800">Date
				<input type="date" className="mt-1 w-full rounded-xl border border-blue-300 bg-blue-100 px-3 py-2 focus:outline-none focus-glow" value={value.date} onChange={e => onChange({ ...value, date: e.target.value })} />
			</label>
			<label className="text-sm text-blue-800 sm:col-span-2">Diagnosis
				<textarea rows={3} className="mt-1 w-full rounded-xl border border-blue-300 bg-blue-100 px-3 py-2 focus:outline-none focus-glow" value={value.diagnosis} onChange={e => onChange({ ...value, diagnosis: e.target.value })} />
			</label>
			<label className="text-sm text-blue-800 sm:col-span-2">Prescription
				<textarea rows={2} className="mt-1 w-full rounded-xl border border-blue-300 bg-blue-100 px-3 py-2 focus:outline-none focus-glow" value={value.prescription} onChange={e => onChange({ ...value, prescription: e.target.value })} />
			</label>
			<label className="text-sm text-blue-800 sm:col-span-2">Notes
				<textarea rows={3} className="mt-1 w-full rounded-xl border border-blue-300 bg-blue-100 px-3 py-2 focus:outline-none focus-glow" value={value.notes} onChange={e => onChange({ ...value, notes: e.target.value })} />
			</label>
			<div className="sm:col-span-2 mt-2">
				<button type="button" onClick={onSave} className="rounded-xl px-5 py-2.5 bg-blue-500 text-white hover:brightness-110 focus:outline-none focus-glow">Save</button>
			</div>
		</div>
	);
}


