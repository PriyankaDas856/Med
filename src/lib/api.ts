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


