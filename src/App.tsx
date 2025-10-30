import { Route, Routes, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Upload from './pages/Upload';
import Dashboard from './pages/Dashboard';
import Records from './pages/Records';
import UploadRecord from './pages/UploadRecord';
import AppointmentsPage from './pages/Appointments';
import Predict from './pages/Predict';
import AssistantPage from './pages/Assistant';
import EmergencyPage from './pages/Emergency';
import AISummaryPage from './pages/AISummary';
import RemindersPage from './pages/Reminders';

function App() {
	return (
		<Routes>
			<Route path="/" element={<Landing />} />
			<Route path="/auth" element={<Auth />} />
			<Route path="/dashboard" element={<Dashboard />} />
			<Route path="/records" element={<Records />} />
			<Route path="/upload-record" element={<UploadRecord />} />
			<Route path="/appointments" element={<AppointmentsPage />} />
			<Route path="/predict" element={<Predict />} />
			<Route path="/assistant" element={<AssistantPage />} />
			<Route path="/emergency" element={<EmergencyPage />} />
			<Route path="/ai-summary" element={<AISummaryPage />} />
			<Route path="/reminders" element={<RemindersPage />} />
			<Route path="/upload" element={<Upload />} />
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
}

export default App;


