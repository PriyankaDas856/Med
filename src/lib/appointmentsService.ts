export type Doctor = {
	id: number;
	name: string;
	specialization: string;
	rating: number;
	slots: string[];
};

export type Appointment = {
	id: string;
	doctorId: number;
	doctorName: string;
	specialization: string;
	date: string; // YYYY-MM-DD
	time: string; // e.g. 10:00 AM
	notes?: string;
	status: 'upcoming' | 'completed' | 'cancelled';
};

const DOCTORS: Doctor[] = [
	{ id: 1, name: 'Dr. Aditi Mehra', specialization: 'Cardiologist', rating: 4.8, slots: ['10:00 AM', '3:00 PM', '5:30 PM'] },
	{ id: 2, name: 'Dr. Rahul Verma', specialization: 'Dermatologist', rating: 4.5, slots: ['11:30 AM', '2:00 PM', '6:00 PM'] },
	{ id: 3, name: 'Dr. Sneha Nair', specialization: 'Pediatrician', rating: 4.9, slots: ['9:00 AM', '1:00 PM', '4:30 PM'] },
	{ id: 4, name: 'Dr. Ananya Gupta', specialization: 'General Physician', rating: 4.6, slots: ['9:30 AM', '12:30 PM', '5:00 PM'] },
	{ id: 5, name: 'Dr. Vikram Shah', specialization: 'Orthopedic', rating: 4.7, slots: ['10:15 AM', '1:45 PM', '6:15 PM'] },
];

const KEY = 'medpass_appointments';

export function listDoctors(): Doctor[] {
	return DOCTORS;
}

export function searchDoctors(query: string, specialization: string): Doctor[] {
	const q = query.toLowerCase();
	return DOCTORS.filter(d =>
		(d.name.toLowerCase().includes(q) || d.specialization.toLowerCase().includes(q)) &&
		(!specialization || specialization === 'All' || d.specialization === specialization)
	);
}

export function listAppointments(): Appointment[] {
	try {
		const raw = localStorage.getItem(KEY);
		return raw ? (JSON.parse(raw) as Appointment[]) : [];
	} catch {
		return [];
	}
}

export function saveAppointment(appt: Omit<Appointment, 'id' | 'status'>): Appointment {
	const current = listAppointments();
	const full: Appointment = { id: randomId(), status: 'upcoming', ...appt };
	localStorage.setItem(KEY, JSON.stringify([full, ...current]));
	return full;
}

function randomId(): string {
	return Math.random().toString(36).slice(2);
}


