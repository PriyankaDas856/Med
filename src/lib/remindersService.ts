// Reminders Feature: local per-user storage and utilities

export type ReminderType = 'Medication' | 'Appointment' | 'Check-up' | 'Health Habit';

export type Reminder = {
    id: string;
    title: string;
    type: ReminderType;
    datetime: string; // ISO string
    notes?: string;
    createdAt: string; // ISO
    notified?: boolean; // set when a notification has been shown
};

const KEY_PREFIX = 'medpass_reminders_';
const DEMO_FLAG_PREFIX = 'medpass_reminders_demo_';

function keyFor(userId: string) { return `${KEY_PREFIX}${userId}`; }
function demoKeyFor(userId: string) { return `${DEMO_FLAG_PREFIX}${userId}`; }

export function listRemindersFor(userId: string): Reminder[] {
    if (!userId) return [];
    try {
        const raw = localStorage.getItem(keyFor(userId));
        return raw ? (JSON.parse(raw) as Reminder[]) : [];
    } catch {
        return [];
    }
}

export function saveRemindersFor(userId: string, items: Reminder[]) {
    localStorage.setItem(keyFor(userId), JSON.stringify(items));
}

export function addReminderFor(userId: string, input: Omit<Reminder, 'id' | 'createdAt' | 'notified'>): Reminder {
    const existing = listRemindersFor(userId);
    const full: Reminder = { id: randomId(), createdAt: new Date().toISOString(), notified: false, ...input };
    saveRemindersFor(userId, [full, ...existing]);
    return full;
}

export function deleteReminderFor(userId: string, id: string) {
    const current = listRemindersFor(userId).filter(r => r.id !== id);
    saveRemindersFor(userId, current);
}

export function markNotified(userId: string, id: string) {
    const items = listRemindersFor(userId).map(r => r.id === id ? { ...r, notified: true } : r);
    saveRemindersFor(userId, items);
}

export function ensureDemoReminder(userId: string) {
    if (!userId) return;
    const flagKey = demoKeyFor(userId);
    if (localStorage.getItem(flagKey)) return;
    const inTwoMinutes = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    addReminderFor(userId, { title: 'Drink Water', type: 'Health Habit', datetime: inTwoMinutes, notes: 'Stay hydrated!' });
    localStorage.setItem(flagKey, '1');
}

export function formatTimeRemaining(iso: string): string {
    const due = new Date(iso).getTime();
    const now = Date.now();
    const diff = due - now;
    const prefix = diff >= 0 ? 'in ' : '';
    const ms = Math.abs(diff);
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    if (mins > 0) return `${prefix}${mins}m ${secs}s`;
    return `${prefix}${secs}s`;
}

function randomId(): string {
    return Math.random().toString(36).slice(2);
}


