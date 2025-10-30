import { Appointment } from '../lib/appointmentsService';

export default function AppointmentsList({ items }: { items: Appointment[] }) {
	if (!items.length) return <p className="text-blue-100">No appointments yet.</p>;
	return (
		<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
			{items.map(a => (
				<div key={a.id} className="glass-light rounded-2xl p-4">
					<p className="text-xs text-blue-700">{a.status.toUpperCase()}</p>
					<h4 className="mt-1 font-semibold text-blue-900">{a.doctorName}</h4>
					<p className="text-blue-800 text-sm">{a.specialization}</p>
                    <p className="text-blue-800 text-sm mt-2">{a.date} • {a.time}</p>
                    {a.type && <p className="text-blue-800 text-sm mt-1">Type: {a.type}</p>}
				</div>
			))}
		</div>
	);
}


