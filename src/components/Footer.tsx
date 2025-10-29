import { Link } from 'react-router-dom';

export default function Footer() {
	return (
		<footer className="mt-24 border-t border-blue-700 glass-dark">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between text-sm text-slate-600">
				<p className="text-blue-100">© {new Date().getFullYear()} MedPass</p>
				<nav className="flex items-center gap-4 mt-4 sm:mt-0">
					<Link to="#" className="text-blue-200 hover:text-white">Privacy Policy</Link>
					<Link to="#" className="text-blue-200 hover:text-white">Terms</Link>
					<Link to="#" className="text-blue-200 hover:text-white">Contact</Link>
				</nav>
			</div>
		</footer>
	);
}


