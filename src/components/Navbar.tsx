import { Link, useLocation } from 'react-router-dom';
import Button from './Button';

export default function Navbar() {
	const { pathname } = useLocation();
	const isAuth = pathname.startsWith('/auth');
	return (
		<nav className="w-full fixed top-0 left-0 z-40">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="mt-4 glass-dark rounded-2xl flex items-center justify-between px-4 py-3">
					<Link to="/" className="flex items-center gap-2">
						<div className="h-8 w-8 rounded-xl bg-blue-400 shadow-card" />
						<span className="font-semibold text-white text-lg">MedPass</span>
					</Link>
					<div className="flex items-center gap-2">
						{!isAuth && (
							<Link to="/auth">
								<Button variant="primary" size="md">Get Started</Button>
							</Link>
						)}
					</div>
				</div>
			</div>
		</nav>
	);
}


