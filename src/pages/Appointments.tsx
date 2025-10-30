import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import { Appointment, Doctor, listAppointmentsFor, listDoctors, saveAppointmentFor, searchDoctors } from '../lib/appointmentsService';
import DoctorCard from '../components/DoctorCard';
import BookingForm from '../components/BookingForm';
import AppointmentsList from '../components/AppointmentsList';
import { useNavigate } from 'react-router-dom';
import { apiMe, type ApiUser } from '../lib/api';

export default function AppointmentsPage() {
	const [query, setQuery] = useState('');
	const [spec, setSpec] = useState('All');
	const [doctors, setDoctors] = useState<Doctor[]>(listDoctors());
	const [selected, setSelected] = useState<Doctor | null>(null);
    const [bookings, setBookings] = useState<Appointment[]>([]);
	const [toast, setToast] = useState<string | null>(null);
    const [user, setUser] = useState<ApiUser | null>(null);
	const navigate = useNavigate();

    useEffect(() => {
        apiMe().then(u => {
            if (!u) {
                navigate('/auth');
                return;
            }
            setUser(u);
            setBookings(listAppointmentsFor(u.id));
        });
    }, [navigate]);

	useEffect(() => {
		const result = searchDoctors(query, spec);
		setDoctors(result);
	}, [query, spec]);

    function onBooked(data: { date: string; time: string; notes: string; type: 'Online' | 'Offline' }) {
		if (!selected) return;
        if (!user) return;
        const appt = saveAppointmentFor(user.id, {
			doctorId: selected.id,
			doctorName: selected.name,
			specialization: selected.specialization,
			date: data.date,
			time: data.time,
            notes: data.notes,
            type: data.type,
            patientId: user.id,
            patientName: user.name || user.email,
		});
        setBookings(prev => [appt, ...prev]);
		setToast('Appointment booked successfully');
		setSelected(null);
		setTimeout(() => setToast(null), 1500);
	}

	const specializations = useMemo(() => ['All', ...Array.from(new Set(listDoctors().map(d => d.specialization)))], []);

	return (
		<div className="min-h-full">
			<Navbar />
			<main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-28 sm:pt-36 pb-16">
				<h1 className="text-3xl font-bold text-white">Book Your Appointment</h1>
				<div className="mt-4 grid sm:grid-cols-3 gap-3">
					<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search doctor or specialization" className="sm:col-span-2 rounded-xl border border-blue-300 bg-blue-100 px-3 py-2 focus:outline-none focus-glow" />
					<select value={spec} onChange={e => setSpec(e.target.value)} className="rounded-xl border border-blue-300 bg-blue-100 px-3 py-2 focus:outline-none focus-glow">
						{specializations.map(s => <option key={s} value={s}>{s}</option>)}
					</select>
				</div>

				<div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{doctors.map(d => (
						<DoctorCard key={d.id} doctor={d} onSelect={setSelected} />
					))}
				</div>

                {selected && (
					<div className="mt-6">
                        <BookingForm doctor={selected} patientName={user?.name || user?.email} onSubmit={onBooked} />
					</div>
				)}

				<h2 className="text-2xl font-semibold text-white mt-10">My Appointments</h2>
				<div className="mt-4">
					<AppointmentsList items={bookings} />
				</div>

				{toast && (
					<div className="fixed bottom-6 left-1/2 -translate-x-1/2 glass-dark px-4 py-2 rounded-xl text-blue-100">{toast}</div>
				)}
			</main>
		</div>
	);
}


