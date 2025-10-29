import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';
import { apiLogin, apiSignup } from '../lib/api';
import { useNavigate } from 'react-router-dom';

type Mode = 'login' | 'signup';

export default function AuthCard() {
	const navigate = useNavigate();
	const [mode, setMode] = useState<Mode>('login');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirm, setConfirm] = useState('');
	const [message, setMessage] = useState<string | null>(null);
	const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'loading'>('idle');

	function validate(): string | null {
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email';
		if (password.length < 6) return 'Password must be at least 6 characters';
		if (mode === 'signup' && password !== confirm) return 'Passwords do not match';
		return null;
	}

	function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		const problem = validate();
		if (problem) {
			setStatus('error');
			setMessage(problem);
			return;
		}
		setStatus('loading');
		(mode === 'login'
			? apiLogin({ email, password })
			: apiSignup({ name: email.split('@')[0], email, password })
		)
			.then(() => {
				setStatus('success');
				setMessage(mode === 'login' ? 'Welcome back!' : 'Account created!');
				setTimeout(() => navigate('/dashboard'), 300);
			})
			.catch(err => {
				setStatus('error');
				setMessage(err.message || 'Authentication failed');
			});
	}

	function onGoogle() {
		window.location.href = 'http://localhost:5174/api/auth/google/start';
	}

	return (
		<div className="glass-light rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-card text-blue-900">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold text-blue-900">
					{mode === 'login' ? 'Welcome back' : 'Create your account'}
				</h2>
				<button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="text-brand.blue hover:underline">
					{mode === 'login' ? 'Sign Up' : 'Log In'}
				</button>
			</div>

			<form onSubmit={onSubmit} className="mt-6 space-y-4">
				<div>
					<label className="block text-sm text-blue-800">Email</label>
					<input
						type="email"
						className="mt-1 w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 focus:outline-none focus-visible:outline-none focus-glow"
						value={email}
						onChange={e => setEmail(e.target.value)}
						placeholder="you@medpass.app"
						required
					/>
				</div>
				<div>
					<label className="block text-sm text-blue-800">Password</label>
					<input
						type="password"
						className="mt-1 w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 focus:outline-none focus-visible:outline-none focus-glow"
						value={password}
						onChange={e => setPassword(e.target.value)}
						placeholder="••••••••"
						required
					/>
				</div>
				<AnimatePresence initial={false}>
					{mode === 'signup' && (
						<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
							<label className="block text-sm text-blue-800">Confirm Password</label>
							<input
								type="password"
								className="mt-1 w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 focus:outline-none focus-visible:outline-none focus-glow"
								value={confirm}
								onChange={e => setConfirm(e.target.value)}
								placeholder="••••••••"
								required={mode === 'signup'}
							/>
						</motion.div>
					)}
				</AnimatePresence>

				<div className="flex items-center justify-between">
					<label className="inline-flex items-center gap-2 text-sm text-blue-800">
						<input type="checkbox" className="rounded-md border-white/60 bg-white/70" />
						Remember me
					</label>
					<button type="button" className="text-sm text-blue-700 hover:underline">Forgot password?</button>
				</div>

				<Button type="submit" variant="primary" size="lg" className="w-full" disabled={status === 'loading'}>
					{mode === 'login' ? 'Log In' : 'Create Account'}
				</Button>

				<div className="relative my-2 text-center text-xs text-blue-700">
					<span className="bg-white/70 px-2 relative z-10">or</span>
					<div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t border-blue-300" />
				</div>

				<Button type="button" variant="ghost" size="md" className="w-full" onClick={onGoogle}>
					Continue with Google
				</Button>
			</form>

				<AnimatePresence>
				{(status === 'loading') && (
					<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-sm text-blue-700">Authenticating…</motion.div>
				)}
				{message && status !== 'loading' && (
					<motion.div
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 10 }}
							className={`mt-4 text-sm ${status === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}
					>
						{message}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}


