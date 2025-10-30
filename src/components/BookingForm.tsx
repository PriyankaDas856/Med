import { Doctor } from '../lib/appointmentsService';

export default function BookingForm({ doctor, patientName, onSubmit }: { doctor: Doctor; patientName?: string; onSubmit: (data: { date: string; time: string; notes: string; type: 'Online' | 'Offline' }) => void }) {
	return (
		<form
			onSubmit={e => {
				e.preventDefault();
				const form = e.target as HTMLFormElement;
				const data = Object.fromEntries(new FormData(form).entries()) as any;
                onSubmit({
                    date: data.date as string,
                    time: data.time as string,
                    notes: (data.notes as string) || '',
                    type: (data.type as 'Online' | 'Offline') || 'Online',
                });
			}}
			className="glass-light rounded-2xl p-5"
		>
			<h3 className="font-semibold text-blue-900">Book with {doctor.name}</h3>
			<p className="text-blue-800 text-sm">{doctor.specialization} • ⭐ {doctor.rating.toFixed(1)}</p>
			<div className="grid sm:grid-cols-2 gap-4 mt-4">
                {patientName && (
                    <label className="text-sm text-blue-800 sm:col-span-2">Full Name
                        <input name="patientName" value={patientName} readOnly className="mt-1 w-full rounded-xl border border-blue-300 bg-blue-100 px-3 py-2 focus:outline-none" />
                    </label>
                )}
				<label className="text-sm text-blue-800">Date
					<input name="date" type="date" className="mt-1 w-full rounded-xl border border-blue-300 bg-blue-100 px-3 py-2 focus:outline-none focus-glow" required />
				</label>
				<label className="text-sm text-blue-800">Time
					<select name="time" className="mt-1 w-full rounded-xl border border-blue-300 bg-blue-100 px-3 py-2 focus:outline-none focus-glow" required>
						<option value="">Select a slot</option>
						{doctor.slots.map(s => (
							<option key={s} value={s}>{s}</option>
						))}
					</select>
				</label>
                <fieldset className="text-sm text-blue-800 sm:col-span-2">
                    <legend>Appointment Type</legend>
                    <div className="mt-1 flex items-center gap-4">
                        <label className="inline-flex items-center gap-2">
                            <input type="radio" name="type" value="Online" defaultChecked className="accent-blue-600" />
                            <span>Online</span>
                        </label>
                        <label className="inline-flex items-center gap-2">
                            <input type="radio" name="type" value="Offline" className="accent-blue-600" />
                            <span>Offline</span>
                        </label>
                    </div>
                </fieldset>
				<label className="text-sm text-blue-800 sm:col-span-2">Notes
					<textarea name="notes" rows={3} className="mt-1 w-full rounded-xl border border-blue-300 bg-blue-100 px-3 py-2 focus:outline-none focus-glow" placeholder="Anything the doctor should know?" />
				</label>
			</div>
			<div className="mt-4">
				<button type="submit" className="rounded-xl px-5 py-2.5 bg-blue-500 text-white hover:brightness-110 focus:outline-none focus-glow">Book Appointment</button>
			</div>
		</form>
	);
}


