import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import { apiEmergencyAlert, apiEmergencyGenerate, apiEmergencyGet, apiMe, type EmergencyInfo } from '../lib/api';
import { useNavigate } from 'react-router-dom';

export default function EmergencyPage() {
    const navigate = useNavigate();
    const [authChecked, setAuthChecked] = useState(false);
    const [isAuthed, setIsAuthed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [me, setMe] = useState<{ id: string; name?: string; email: string } | null>(null);
    const [info, setInfo] = useState<EmergencyInfo>({
        name: '',
        bloodGroup: '',
        allergies: '',
        medications: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
    });
    const [qrUrl, setQrUrl] = useState<string | null>(null);

    useEffect(() => {
        let cancel = false;
        apiMe().then(async u => {
            if (cancel) return;
            if (!u) {
                setIsAuthed(false);
                setAuthChecked(true);
                return;
            }
            setIsAuthed(true);
            setAuthChecked(true);
            setMe(u);
            const existing = await apiEmergencyGet();
            if (existing?.data) setInfo(existing.data);
            else setInfo(prev => ({ ...prev, name: u.name || u.email }));
        }).catch(() => { setIsAuthed(false); setAuthChecked(true); });
        return () => { cancel = true; };
    }, []);

    function set<K extends keyof EmergencyInfo>(key: K, value: EmergencyInfo[K]) {
        setInfo(prev => ({ ...prev, [key]: value }));
    }

    async function onGenerate() {
        setError(null);
        setLoading(true);
        try {
            const res = await apiEmergencyGenerate(info);
            setQrUrl(res.dataUrl);
            setToast('QR code generated');
            setTimeout(() => setToast(null), 1500);
        } catch (e: any) {
            setError(e?.message || 'QR generation failed');
        } finally {
            setLoading(false);
        }
    }

    async function onAlert() {
        if (!window.confirm('Send emergency alert to your contact?')) return;
        setError(null);
        setLoading(true);
        try {
            const res = await apiEmergencyAlert();
            setToast(res.delivered ? 'Emergency SMS sent' : 'Alert queued (limited mode)');
            setTimeout(() => setToast(null), 1500);
        } catch (e: any) {
            setError(e?.message || 'Alert failed');
        } finally {
            setLoading(false);
        }
    }

    const canGenerate = useMemo(() => {
        return !!(info.name && info.bloodGroup && info.emergencyContactName && info.emergencyContactPhone);
    }, [info]);

    if (authChecked && !isAuthed) {
        return (
            <div className="min-h-full">
                <Navbar />
                <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-28 sm:pt-36 pb-16">
                    <div className="glass-light rounded-2xl p-6">
                        <h1 className="text-xl font-semibold text-blue-900">Please log in to access Emergency Health Mode.</h1>
                        <div className="mt-6 flex gap-3">
                            <Button onClick={() => navigate('/auth')}>Go to Login</Button>
                            <Button variant="ghost" onClick={() => navigate('/')}>Back to Home</Button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-full">
            <Navbar />
            <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-28 sm:pt-36 pb-16">
                <h1 className="text-3xl font-bold text-white">Emergency Health Mode</h1>
                <p className="text-blue-100 mt-2">Share critical health info securely via a personal QR and alert your emergency contact.</p>

                <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 glass-light rounded-2xl p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Full Name" value={info.name} onChange={v => set('name', v)} />
                            <Field label="Blood Group" value={info.bloodGroup} onChange={v => set('bloodGroup', v)} placeholder="O+, A-, B+, AB+" />
                            <Field label="Allergies" value={info.allergies} onChange={v => set('allergies', v)} placeholder="e.g., Penicillin, Peanuts" />
                            <Field label="Medications" value={info.medications} onChange={v => set('medications', v)} placeholder="e.g., Metformin 500mg" />
                            <Field label="Emergency Contact Name" value={info.emergencyContactName} onChange={v => set('emergencyContactName', v)} />
                            <Field label="Emergency Contact Phone" value={info.emergencyContactPhone} onChange={v => set('emergencyContactPhone', v)} />
                        </div>
                        <div className="mt-4 flex gap-3">
                            <Button variant="ghost" onClick={() => setToast('Info ready. You can generate QR now.')}>Edit Info</Button>
                            <Button onClick={onGenerate} disabled={!canGenerate || loading}>{loading ? 'Generating…' : (qrUrl ? 'Regenerate QR' : 'Generate My Emergency QR')}</Button>
                        </div>
                        {error && <p className="text-red-600 mt-3">{error}</p>}
                    </div>

                    <div className="lg:col-span-1">
                        <div className="glass-light rounded-2xl p-6 text-center">
                            {qrUrl ? (
                                <div>
                                    <img src={qrUrl} alt="Emergency QR" className="mx-auto w-48 h-48" />
                                    <a href={qrUrl} download={`medpass-emergency-${me?.id || 'user'}.png`} className="inline-block mt-3 text-blue-700 underline">Download QR</a>
                                </div>
                            ) : (
                                <div className="text-blue-900 text-sm">Generate your QR to display it here.</div>
                            )}
                            <div className="mt-4">
                                <Button onClick={onAlert} disabled={loading || !info.emergencyContactPhone}>Send SMS Alert</Button>
                            </div>
                        </div>
                    </div>
                </div>

                {toast && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 glass-dark px-4 py-2 rounded-xl text-blue-100">{toast}</div>
                )}
            </main>
        </div>
    );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
        <label className="text-sm text-blue-800">
            {label}
            <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                className="mt-1 w-full rounded-xl border border-blue-300 bg-blue-100 px-3 py-2 focus:outline-none focus-glow" />
        </label>
    );
}


