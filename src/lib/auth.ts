export type AuthResult = { success: true } | { success: false; message: string };

const USERS_KEY = 'medpass_users';
const SESSION_KEY = 'medpass_session';

type User = { email: string; password: string };

function readUsers(): User[] {
	try {
		const raw = localStorage.getItem(USERS_KEY);
		return raw ? (JSON.parse(raw) as User[]) : [];
	} catch {
		return [];
	}
}

function writeUsers(users: User[]) {
	localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function signUp(email: string, password: string): AuthResult {
	const users = readUsers();
	if (users.some(u => u.email === email)) {
		return { success: false, message: 'Account already exists' };
	}
	users.push({ email, password });
	writeUsers(users);
	localStorage.setItem(SESSION_KEY, email);
	return { success: true };
}

export function signIn(email: string, password: string): AuthResult {
	const users = readUsers();
	const match = users.find(u => u.email === email && u.password === password);
	if (!match) return { success: false, message: 'Invalid credentials' };
	localStorage.setItem(SESSION_KEY, email);
	return { success: true };
}

export function signInWithGoogleMock(): AuthResult {
	localStorage.setItem(SESSION_KEY, 'google-user@medpass.app');
	return { success: true };
}

export function signOut() {
	localStorage.removeItem(SESSION_KEY);
}

export function getCurrentUser(): string | null {
	return localStorage.getItem(SESSION_KEY);
}


