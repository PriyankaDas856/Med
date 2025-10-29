import Navbar from '../components/Navbar';
import AuthCard from '../components/AuthCard';
import { motion } from 'framer-motion';

export default function Auth() {
	return (
		<div className="min-h-full relative">
			<Navbar />
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-28 sm:pt-40 pb-16">
				<div className="grid lg:grid-cols-2 gap-8 items-center">
					<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="hidden lg:block">
						<div className="relative h-[520px] rounded-2xl overflow-hidden border border-white/60 bg-white/50">
							{/* Subtle translucent medical icons */}
							<svg className="absolute -top-6 left-6 h-40 w-40 text-brand.blue" viewBox="0 0 64 64" aria-hidden="true">
								<path fill="currentColor" fillOpacity="0.06" d="M20 8a2 2 0 0 1 2 2v12a10 10 0 1 0 20 0V10a2 2 0 1 1 4 0v12a14 14 0 0 1-28 0V10a2 2 0 0 1 2-2zm30 26a8 8 0 0 0-8 8v6a8 8 0 0 1-8 8h-4a2 2 0 1 1 0-4h4a4 4 0 0 0 4-4v-6a12 12 0 1 1 12 12h-2a2 2 0 1 1 0-4h2a8 8 0 0 0 0-16z" />
							</svg>
							<svg className="absolute top-24 left-28 h-28 w-28 text-brand.teal" viewBox="0 0 64 64" aria-hidden="true">
								<path fill="currentColor" fillOpacity="0.06" d="M14 10h36a2 2 0 0 1 2 2v40a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2V12a2 2 0 0 1 2-2zm16 8h4v8h8v4h-8v8h-4v-8h-8v-4h8v-8z" />
							</svg>
							<svg className="absolute bottom-8 right-10 h-36 w-36 text-brand.blue" viewBox="0 0 64 64" aria-hidden="true">
								<path fill="currentColor" fillOpacity="0.06" d="M32 54s-18-10.6-24-20C3.3 29.6 6 22 14 20c6.6-1.6 11.3 3 13 6 1.7-3 6.4-7.6 13-6 8 2 10.7 9.6 6 14-6 9.4-24 20-24 20z" />
							</svg>
						</div>
					<p className="mt-6 text-blue-100">Secure, modern, and designed for calm. Log in or create your MedPass to begin.</p>
					</motion.div>
					<motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
						<AuthCard />
					</motion.div>
				</div>
			</div>
		</div>
	);
}


