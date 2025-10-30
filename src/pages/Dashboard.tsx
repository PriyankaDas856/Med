import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { apiLogout, apiMe } from '../lib/api';
import Button from '../components/Button';
import { Link, useNavigate } from 'react-router-dom';
import FeatureCard from '../components/FeatureCard';
import AppointmentsList from '../components/AppointmentsList';
import { listAppointmentsFor } from '../lib/appointmentsService';
import ReminderWatcher from '../components/ReminderWatcher';
 

export default function Dashboard() {
	const [name, setName] = useState<string>('');
    
    const [upcoming, setUpcoming] = useState<any[]>([]);
	const navigate = useNavigate();

    useEffect(() => {
        apiMe().then(u => {
            if (!u) navigate('/auth');
            else {
                setName(u.name || u.email);
                const items = listAppointmentsFor(u.id).filter(a => a.status === 'upcoming').slice(0, 3);
                setUpcoming(items);
            }
        });
    }, [navigate]);

	async function onLogout() {
		await apiLogout();
		navigate('/auth');
	}

	return (
		<div className="min-h-full">
			<Navbar />
			<main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-28 sm:pt-36 pb-16">
				<h1 className="text-3xl font-bold text-white">Welcome, {name || '...'}</h1>
				<p className="text-blue-100 mt-2">Explore MedPass modules:</p>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
					<Link to="/assistant" className="block">
						<FeatureCard icon={<span>🤖</span>} title="AI Chat Assistant" description="Talk with an AI about your health in any language." />
					</Link>
					<Link to="/upload-record" className="block">
						<FeatureCard icon={<span>📄</span>} title="Smart Record Upload" description="Upload, scan, or enter medical records." />
					</Link>
					<Link to="/emergency" className="block">
						<FeatureCard icon={<span>🚨</span>} title="Emergency Health Mode" description="Generate QR & alert emergency contacts." />
					</Link>
					<FeatureCard icon={<span>⏰</span>} title="Reminders" description="Set medication and appointment reminders." />
					<Link to="/reminders" className="block">
						<FeatureCard icon={<span>⏰</span>} title="Reminders" description="Set medication and appointment reminders." />
					</Link>
					<Link to="/predict" className="block">
						<FeatureCard icon={<span>🔮</span>} title="Future Health Prediction" description="AI-based prediction & prevention insights." />
					</Link>
					<Link to="/ai-summary" className="block">
						<FeatureCard icon={<span>🧠</span>} title="AI Medical Summary" description="Auto-generate summary of all health data." />
					</Link>
					<FeatureCard icon={<span>🔐</span>} title="Access Control" description="Manage sharing between patients and doctors." />
                    <Link to="/appointments" className="block">
                        <FeatureCard icon={<span>📅</span>} title="Appointment Booking" description="Schedule consultations easily." />
                    </Link>
					<FeatureCard icon={<span>🩺</span>} title="Consulting Specialist" description="Connect with the right doctor instantly." />
					<FeatureCard icon={<span>🌍</span>} title="Multilingual Support" description="Use MedPass in your preferred language." />
				</div>
                <div className="mt-10">
                    <h2 className="text-2xl font-semibold text-white">Upcoming Appointments</h2>
                    <div className="mt-4">
                        <AppointmentsList items={upcoming} />
                    </div>
                </div>

				<ReminderWatcher />

                <div className="mt-8">
					<Button variant="ghost" onClick={onLogout}>Logout</Button>
				</div>
			</main>
		</div>
	);
}


