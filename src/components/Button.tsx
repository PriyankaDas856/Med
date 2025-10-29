import { ButtonHTMLAttributes } from 'react';
import { motion } from 'framer-motion';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: 'primary' | 'secondary' | 'ghost';
	size?: 'md' | 'lg';
};

export default function Button({ variant = 'primary', size = 'md', className = '', children, ...rest }: Props) {
	const base = 'rounded-xl focus:outline-none focus-visible:outline-none focus-glow transition-all font-medium';
	const sizes = size === 'lg' ? 'px-6 py-3 text-base' : 'px-5 py-2.5 text-sm';
	const variants = {
		primary: 'text-white bg-gradient-to-br from-sky-400 via-blue-500 to-sky-500 hover:brightness-110 shadow-glow',
		secondary: 'text-blue-800 bg-blue-200 hover:bg-blue-300 border border-blue-300',
		ghost: 'text-blue-800 bg-blue-100 hover:bg-blue-200 border border-blue-200',
	};
	return (
		<motion.button whileTap={{ scale: 0.98 }} whileHover={{ y: -1 }} className={`${base} ${sizes} ${variants[variant]} ${className}`} {...rest}>
			{children}
		</motion.button>
	);
}


