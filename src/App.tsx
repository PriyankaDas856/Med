import { Route, Routes, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Upload from './pages/Upload';
import Dashboard from './pages/Dashboard';
import Records from './pages/Records';
import UploadRecord from './pages/UploadRecord';
import AppointmentsPage from './pages/Appointments';

function App() {
	return (
		<Routes>
			<Route path="/" element={<Landing />} />
			<Route path="/auth" element={<Auth />} />
			<Route path="/dashboard" element={<Dashboard />} />
			<Route path="/records" element={<Records />} />
			<Route path="/upload-record" element={<UploadRecord />} />
			<Route path="/appointments" element={<AppointmentsPage />} />
			<Route path="/upload" element={<Upload />} />
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
}

export default App;


