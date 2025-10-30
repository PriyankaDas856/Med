// Reminders Feature: Auth-gated page with form, list, and notifications
import { useEffect, useMemo, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import { apiMe, type ApiUser } from '../lib/api';
import { addReminderFor, deleteReminderFor, ensureDemoReminder, formatTimeRemaining, listRemindersFor, markNotified, type Reminder, type ReminderType } from '../lib/remindersService';
import { useNavigate } from 'react-router-dom';

export default function RemindersPage() {
    const navigate = useNavigate();
    const [user, setUser] = useState<ApiUser | null>(null);
    const [items, setItems] = useState<Reminder[]>([]);
    const [title, setTitle] = useState('');
    const [type, setType] = useState<ReminderType>('Medication');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [notes, setNotes] = useState('');
    const [toast, setToast] = useState<string | null>(null);
    const checkTimer = useRef<number | null>(null);

    useEffect(() => {
        apiMe().then(u => {
            if (!u) {
                navigate('/auth');
                return;
            }
            setUser(u);
            ensureDemoReminder(u.id);
            setItems(listRemindersFor(u.id));
        });
        return () => {
            if (checkTimer.current) window.clearInterval(checkTimer.current);
        };
    }, [navigate]);

    useEffect(() => {
        if (!user) return;
        if (checkTimer.current) window.clearInterval(checkTimer.current);
        checkTimer.current = window.setInterval(() => {
            const now = Date.now();
            const all = listRemindersFor(user.id);
            for (const r of all) {
                const due = new Date(r.datetime).getTime();
                if (!r.notified && due <= now) {
                    // show pop notification
                    setToast(`🩺 ${r.title} • Type: ${r.type}${r.notes ? ` • ${r.notes}` : ''}`);
                    markNotified(user.id, r.id);
                    setItems(listRemindersFor(user.id));
                    setTimeout(() => setToast(null), 3000);
                }
            }
        }, 30000);
    }, [user]);

    const canAdd = useMemo(() => {
        return title.trim() && date && time;
    }, [title, date, time]);

    function onAdd() {
        if (!user || !canAdd) return;
        const iso = new Date(`${date}T${time}`).toISOString();
        addReminderFor(user.id, { title: title.trim(), type, datetime: iso, notes: notes.trim() || undefined });
        setItems(listRemindersFor(user.id));
        setTitle('');
        setNotes('');
    }

    function onDelete(id: string) {
        if (!user) return;
        deleteReminderFor(user.id, id);
        setItems(listRemindersFor(user.id));
    }

    return (
        <div className="min-h-full">
            <Navbar />
            <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-28 sm:pt-36 pb-16">
                <h1 className="text-3xl font-bold text-white">Reminders</h1>
                <p className="text-blue-100 mt-2">Create health-related reminders and get timely alerts.</p>

                <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 glass-light rounded-2xl p-6">
                        <h3 className="font-semibold text-blue-900">New Reminder</h3>
                        <div className="mt-4 space-y-3">
                            <Field label="Title" value={title} onChange={setTitle} placeholder="Take BP Medicine" />
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Date" value={date} onChange={setDate} type="date" />
                                <Field label="Time" value={time} onChange={setTime} type="time" />
                            </div>
                            <div>
                                <label className="block text-sm text-blue-800">Type</label>
                                <select value={type} onChange={e => setType(e.target.value as ReminderType)} className="mt-1 w-full rounded-xl border border-blue-300 bg-blue-100 px-3 py-2 focus:outline-none focus-glow">
                                    <option>Medication</option>
                                    <option>Appointment</option>
                                    <option>Check-up</option>
                                    <option>Health Habit</option>
                                </select>
                            </div>
                            <Field label="Notes (optional)" value={notes} onChange={setNotes} placeholder="With water after breakfast" />
                            <Button onClick={onAdd} disabled={!canAdd}>Add Reminder</Button>
                        </div>
                    </div>

                    <div className="lg:col-span-2 glass-light rounded-2xl p-6">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-blue-900">My Reminders</h3>
                            <span className="text-blue-800 text-sm">{items.length} items</span>
                        </div>
                        <div className="mt-4 grid sm:grid-cols-2 gap-4">
                            {items.map(r => (
                                <div key={r.id} className="rounded-2xl border border-blue-200 bg-white/70 p-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="font-semibold text-blue-900">{r.title}</div>
                                            <div className="text-xs mt-1">
                                                <Badge t={r.type} />
                                            </div>
                                        </div>
                                        <button onClick={() => onDelete(r.id)} className="text-sm text-blue-700 hover:underline">Delete</button>
                                    </div>
                                    {r.notes && <div className="text-blue-800 text-sm mt-2">{r.notes}</div>}
                                    <div className="text-blue-700 text-sm mt-2">Due: {new Date(r.datetime).toLocaleString()} ({formatTimeRemaining(r.datetime)})</div>
                                    {r.notified && <div className="text-green-700 text-xs mt-1">Notified</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {toast && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 glass-dark px-4 py-2 rounded-xl text-blue-100 z-50">{toast}</div>
                )}
            </main>
        </div>
    );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
    return (
        <label className="block text-sm text-blue-800">
            {label}
            <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                className="mt-1 w-full rounded-xl border border-blue-300 bg-blue-100 px-3 py-2 focus:outline-none focus-glow" />
        </label>
    );
}

function Badge({ t }: { t: ReminderType }) {
    const color = t === 'Medication' ? 'bg-blue-200 text-blue-900' : t === 'Appointment' ? 'bg-teal-200 text-teal-900' : t === 'Check-up' ? 'bg-amber-200 text-amber-900' : 'bg-emerald-200 text-emerald-900';
    return <span className={`inline-block px-2 py-0.5 rounded-md text-xs ${color}`}>{t}</span>;
}


