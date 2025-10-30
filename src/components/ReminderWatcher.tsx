// Reminders Feature: background watcher to pop notifications on Dashboard
import { useEffect, useRef, useState } from 'react';
import { apiMe } from '../lib/api';
import { listRemindersFor, markNotified } from '../lib/remindersService';

export default function ReminderWatcher() {
    const [toast, setToast] = useState<string | null>(null);
    const timer = useRef<number | null>(null);
    const userIdRef = useRef<string | null>(null);

    useEffect(() => {
        apiMe().then(u => {
            if (!u) return;
            userIdRef.current = u.id;
            if (timer.current) window.clearInterval(timer.current);
            timer.current = window.setInterval(() => {
                const userId = userIdRef.current;
                if (!userId) return;
                const now = Date.now();
                const all = listRemindersFor(userId);
                for (const r of all) {
                    const due = new Date(r.datetime).getTime();
                    if (!r.notified && due <= now) {
                        setToast(`🩺 Reminder: ${r.title} • ${r.type}${r.notes ? ` • ${r.notes}` : ''}`);
                        markNotified(userId, r.id);
                        setTimeout(() => setToast(null), 3000);
                        break;
                    }
                }
            }, 30000);
        });
        return () => { if (timer.current) window.clearInterval(timer.current); };
    }, []);

    return toast ? (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 glass-dark px-4 py-2 rounded-xl text-blue-100 z-50">{toast}</div>
    ) : null;
}


