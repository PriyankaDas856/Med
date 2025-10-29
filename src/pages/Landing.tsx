import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Button from '../components/Button';
import FeatureCard from '../components/FeatureCard';

export default function Landing() {
	return (
		<div className="min-h-full relative">
			<Navbar />
			<main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<section className="pt-36 sm:pt-40 text-center">
					<motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
						Your Health, Simplified.
					</motion.h1>
					<motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className="mt-4 text-blue-100 max-w-2xl mx-auto">
						Smart care starts with MedPass — track, predict, and simplify your health journey.
					</motion.p>
					<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }} className="mt-8 flex items-center justify-center gap-3">
						<Link to="/auth"><Button size="lg">Get Started</Button></Link>
						<a href="#features"><Button variant="ghost" size="lg">Learn More</Button></a>
					</motion.div>
				</section>

				<section id="features" className="mt-24 sm:mt-28">
					<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
						<FeatureCard icon={<span>🤖</span>} title="AI Chat Assistant" description="Get instant answers to health questions with compassionate guidance." />
						<FeatureCard icon={<span>📄</span>} title="Smart Record Upload" description="Scan, organize, and summarize medical records with ease." />
						<FeatureCard icon={<span>🚨</span>} title="Emergency Health Mode" description="One-tap access to critical info for first responders." />
						<FeatureCard icon={<span>🔮</span>} title="Health Predictions" description="Personalized insights to stay ahead of potential risks." />
						<FeatureCard icon={<span>📅</span>} title="Appointment Booking" description="Manage visits, reminders, and follow-ups seamlessly." />
						<FeatureCard icon={<span>🌍</span>} title="Multilingual" description="Care that speaks your language, anywhere you are." />
					</div>
				</section>
			</main>
			<Footer />
		</div>
	);
}


