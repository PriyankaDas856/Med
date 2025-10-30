import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import { apiMe } from '../lib/api';
import { apiSummaryGenerate, apiSummaryLatest, type Summary } from '../lib/api';
import { useNavigate } from 'react-router-dom';

export default function AISummaryPage() {
    const navigate = useNavigate();
    const [authChecked, setAuthChecked] = useState(false);
    const [isAuthed, setIsAuthed] = useState(false);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
            const latest = await apiSummaryLatest();
            if (!cancel) setSummary(latest);
        }).catch(() => { setIsAuthed(false); setAuthChecked(true); });
        return () => { cancel = true; };
    }, []);

    async function onGenerate() {
        setError(null);
        setLoading(true);
        try {
            const s = await apiSummaryGenerate();
            setSummary(s);
        } catch (e: any) {
            setError(e?.message || 'Failed to generate summary');
        } finally {
            setLoading(false);
        }
    }

    if (authChecked && !isAuthed) {
        return (
            <div className="min-h-full">
                <Navbar />
                <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-28 sm:pt-36 pb-16">
                    <div className="glass-light rounded-2xl p-6">
                        <h1 className="text-xl font-semibold text-blue-900">Please log in to access AI Medical Summary.</h1>
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
                <h1 className="text-3xl font-bold text-white">AI Medical Summary</h1>
                <p className="text-blue-100 mt-2">Generate a concise summary of your health records with key insights.</p>

                <div className="mt-6 glass-light rounded-2xl p-6">
                    <div className="flex items-center gap-3">
                        <Button onClick={onGenerate} disabled={loading}>{loading ? 'Analyzing your health data…' : (summary ? 'Regenerate Summary' : 'Generate Summary')}</Button>
                        {error && <span className="text-red-600 text-sm">{error}</span>}
                    </div>

                    {summary ? (
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-blue-900">
                            <section className="glass-light rounded-xl p-4">
                                <h3 className="font-semibold">Overview</h3>
                                <p className="mt-2 text-sm whitespace-pre-wrap">{summary.overview}</p>
                            </section>
                            <section className="glass-light rounded-xl p-4">
                                <h3 className="font-semibold">Trends</h3>
                                <ul className="mt-2 list-disc list-inside text-sm">
                                    {summary.trends.length ? summary.trends.map((t, i) => <li key={i}>{t}</li>) : <li>No trends detected</li>}
                                </ul>
                            </section>
                            <section className="glass-light rounded-xl p-4">
                                <h3 className="font-semibold">Alerts</h3>
                                <ul className="mt-2 list-disc list-inside text-sm">
                                    {summary.alerts.length ? summary.alerts.map((a, i) => <li key={i}>{a}</li>) : <li>No alerts</li>}
                                </ul>
                            </section>
                            <section className="glass-light rounded-xl p-4">
                                <h3 className="font-semibold">Recommendations</h3>
                                <ul className="mt-2 list-disc list-inside text-sm">
                                    {summary.recommendations.length ? summary.recommendations.map((r, i) => <li key={i}>{r}</li>) : <li>No recommendations at this time</li>}
                                </ul>
                            </section>
                        </div>
                    ) : (
                        <p className="mt-6 text-blue-900 text-sm">No summary yet. Click "Generate Summary" to analyze your records. If you have not uploaded any records, you will be prompted to do so.</p>
                    )}
                </div>
            </main>
        </div>
    );
}


