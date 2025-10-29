import { Doctor } from '../lib/appointmentsService';

export default function DoctorCard({ doctor, onSelect }: { doctor: Doctor; onSelect: (d: Doctor) => void }) {
	return (
		<button onClick={() => onSelect(doctor)} className="w-full text-left glass-light rounded-2xl p-5 hover:shadow-glow transition-transform hover:-translate-y-0.5">
			<div className="flex items-center gap-4">
				<div className="h-12 w-12 rounded-xl bg-blue-300 flex items-center justify-center text-blue-900">🩺</div>
				<div>
					<h4 className="font-semibold text-blue-900">{doctor.name}</h4>
					<p className="text-sm text-blue-800">{doctor.specialization} • ⭐ {doctor.rating.toFixed(1)}</p>
				</div>
			</div>
			<div className="mt-3 flex flex-wrap gap-2">
				{doctor.slots.map(s => (
					<span key={s} className="text-xs px-2 py-1 rounded-md bg-blue-200 text-blue-800">{s}</span>
				))}
			</div>
		</button>
	);
}


