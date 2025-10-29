import { ReactNode } from 'react';
import { motion } from 'framer-motion';

type Props = {
	icon: ReactNode;
	title: string;
	description: string;
};

export default function FeatureCard({ icon, title, description }: Props) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20, scale: 0.98 }}
			whileInView={{ opacity: 1, y: 0, scale: 1 }}
			viewport={{ once: true, margin: '-50px' }}
			transition={{ duration: 0.5, ease: 'easeOut' }}
			className="glass-light rounded-2xl p-5 hover:shadow-glow transition-shadow h-full"
		>
			<div className="text-2xl text-blue-700">{icon}</div>
			<h3 className="mt-3 font-semibold text-blue-900">{title}</h3>
			<p className="mt-2 text-blue-800 text-sm leading-relaxed">{description}</p>
		</motion.div>
	);
}


