export type ApiUser = { id: string; name: string; email: string };

const BASE = 'http://localhost:5174';

export async function apiSignup(input: { name: string; email: string; password: string }) {
	const res = await fetch(`${BASE}/api/auth/signup`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});
	if (!res.ok) throw new Error((await res.json()).error || 'Sign up failed');
	return (await res.json()).user as ApiUser;
}

export async function apiLogin(input: { email: string; password: string }) {
	const res = await fetch(`${BASE}/api/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(input),
	});
	if (!res.ok) throw new Error((await res.json()).error || 'Login failed');
	return (await res.json()).user as ApiUser;
}

export async function apiMe() {
	const res = await fetch(`${BASE}/api/auth/me`, { credentials: 'include' });
	if (!res.ok) return null;
	return (await res.json()).user as ApiUser;
}

export async function apiLogout() {
	await fetch(`${BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
}

export async function apiRecordsList() {
	const res = await fetch(`${BASE}/api/records`, { credentials: 'include' });
	if (!res.ok) throw new Error('Failed to load records');
	return (await res.json()).items as any[];
}

export async function apiRecordsUpload(files: File[]) {
	const form = new FormData();
	files.forEach(f => form.append('files', f));
	const res = await fetch(`${BASE}/api/records/upload`, { method: 'POST', credentials: 'include', body: form });
	if (!res.ok) throw new Error('Upload failed');
	return (await res.json()).items as any[];
}

export async function apiRecordsManual(title: string, text: string) {
	const res = await fetch(`${BASE}/api/records/manual`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ title, text }) });
	if (!res.ok) throw new Error('Save failed');
	return (await res.json()).item as any;
}

export async function apiRecordsDelete(id: string) {
	const res = await fetch(`${BASE}/api/records/${id}`, { method: 'DELETE', credentials: 'include' });
	if (!res.ok) throw new Error('Delete failed');
	return true;
}

export type PredictInput = {
    age: number;
    gender: string;
    systolic: number;
    diastolic: number;
    glucose: number;
    cholesterol: number;
    weight: number; // kg
    height: number; // cm
    smoker?: boolean;
    activityLevel?: 'low' | 'moderate' | 'high';
};

export type PredictResult = {
    id: string;
    createdAt: string;
    input: PredictInput;
    result: {
        riskLevel: 'Low' | 'Moderate' | 'High';
        conditions: string[];
        recommendations: string[];
        metrics: { bmi: number; riskScore: number };
    };
};

export async function apiPredict(input: PredictInput) {
    const res = await fetch(`${BASE}/api/ai/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Prediction failed');
    return (await res.json()).prediction as PredictResult;
}

export type ChatMessage = { id: string; created_at: string; role: 'user' | 'assistant'; message: string; language?: string };

export async function apiAssistantHistory() {
    const res = await fetch(`${BASE}/api/assistant/history`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to load history');
    return (await res.json()).items as ChatMessage[];
}

export async function apiAssistantSend(input: { message: string; language?: string }) {
    const res = await fetch(`${BASE}/api/assistant/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Assistant failed');
    return (await res.json()) as { reply: string; language: string };
}

export type EmergencyInfo = {
    name: string;
    bloodGroup: string;
    allergies: string;
    medications: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
};

export async function apiEmergencyGet() {
    const res = await fetch(`${BASE}/api/emergency/data`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to load emergency data');
    return (await res.json()) as { ok: boolean; data: EmergencyInfo | null; updatedAt?: string };
}

export async function apiEmergencyGenerate(info: EmergencyInfo) {
    const res = await fetch(`${BASE}/api/emergency/qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(info),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'QR generation failed');
    return (await res.json()) as { ok: boolean; dataUrl: string; qrText: string };
}

export async function apiEmergencyAlert(messageOverride?: string) {
    const res = await fetch(`${BASE}/api/emergency/alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messageOverride }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Alert failed');
    return (await res.json()) as { ok: boolean; delivered: boolean; limited?: boolean };
}

export type Summary = {
    overview: string;
    trends: string[];
    alerts: string[];
    recommendations: string[];
};

export async function apiSummaryGenerate() {
    const res = await fetch(`${BASE}/api/ai/summary`, { method: 'POST', credentials: 'include' });
    if (!res.ok) throw new Error((await res.json()).error || 'Summary failed');
    return (await res.json()).summary as Summary;
}

export async function apiSummaryLatest() {
    const res = await fetch(`${BASE}/api/ai/summary/latest`, { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.summary as Summary | null;
}


