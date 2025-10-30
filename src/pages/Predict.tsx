import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import { apiMe, apiPredict, apiRecordsList, type PredictInput, type PredictResult } from '../lib/api';
import { useNavigate } from 'react-router-dom';

export default function Predict() {
    const navigate = useNavigate();
    const [authChecked, setAuthChecked] = useState(false);
    const [isAuthed, setIsAuthed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [prediction, setPrediction] = useState<PredictResult | null>(null);

    const [age, setAge] = useState<number>(30);
    const [gender, setGender] = useState<string>('male');
    const [systolic, setSystolic] = useState<number>(120);
    const [diastolic, setDiastolic] = useState<number>(80);
    const [glucose, setGlucose] = useState<number>(95);
    const [cholesterol, setCholesterol] = useState<number>(180);
    const [weight, setWeight] = useState<number>(70);
    const [height, setHeight] = useState<number>(175);
    const [smoker, setSmoker] = useState<boolean>(false);
    const [activityLevel, setActivityLevel] = useState<'low' | 'moderate' | 'high'>('moderate');

    useEffect(() => {
        let cancelled = false;
        apiMe().then(u => {
            if (cancelled) return;
            if (!u) setIsAuthed(false);
            else setIsAuthed(true);
            setAuthChecked(true);
        }).catch(() => {
            if (!cancelled) {
                setIsAuthed(false);
                setAuthChecked(true);
            }
        });
        return () => { cancelled = true; };
    }, []);

    const bmi = useMemo(() => {
        return height > 0 ? Number((weight / Math.pow(height / 100, 2)).toFixed(1)) : 0;
    }, [height, weight]);

    async function handlePredict() {
        setError(null);
        setLoading(true);
        try {
            const input: PredictInput = { age, gender, systolic, diastolic, glucose, cholesterol, weight, height, smoker, activityLevel };
            const res = await apiPredict(input);
            setPrediction(res);
        } catch (e: any) {
            setError(e?.message || 'Prediction failed');
        } finally {
            setLoading(false);
        }
    }

    async function handlePrefillFromRecords() {
        setError(null);
        try {
            const items = await apiRecordsList();
            // Try to extract any numeric hints from summaries/fields
            const texts: string[] = [];
            for (const it of items) {
                const data = it?.data || {};
                const fields = data?.fields || {};
                if (fields?.rawText) texts.push(String(fields.rawText));
                if (data?.summary) texts.push(String(data.summary));
            }
            const blob = texts.join('\n');
            const num = (p: RegExp) => {
                const m = blob.match(p);
                return m ? Number(m[1]) : undefined;
            };
            const maybeSys = num(/systolic\D{0,5}(\d{2,3})/i) ?? num(/bp\D{0,5}(\d{2,3})\/(\d{2,3})/i);
            const maybeDia = (() => {
                const m = blob.match(/bp\D{0,5}(\d{2,3})\/(\d{2,3})/i);
                return m ? Number(m[2]) : num(/diastolic\D{0,5}(\d{2,3})/i);
            })();
            const maybeGlucose = num(/glucose\D{0,5}(\d{2,3})/i);
            const maybeChol = num(/cholesterol\D{0,5}(\d{2,3})/i);
            if (maybeSys) setSystolic(maybeSys);
            if (maybeDia) setDiastolic(maybeDia);
            if (maybeGlucose) setGlucose(maybeGlucose);
            if (maybeChol) setCholesterol(maybeChol);
        } catch (e: any) {
            setError(e?.message || 'Failed to load records');
        }
    }

    if (authChecked && !isAuthed) {
        return (
            <div className="min-h-full">
                <Navbar />
                <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-28 sm:pt-36 pb-16">
                    <div className="glass-light rounded-2xl p-6">
                        <h1 className="text-xl font-semibold text-blue-900">Please log in to access Health Predictions.</h1>
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
                <h1 className="text-3xl font-bold text-white">Future Health Prediction</h1>
                <p className="text-blue-100 mt-2">Enter your health details or prefill from records, then run prediction.</p>

                <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 glass-light rounded-2xl p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <LabeledNumber label="Age" value={age} setValue={setAge} min={1} max={120} />
                            <div>
                                <label className="block text-sm font-medium text-blue-900">Gender</label>
                                <select className="mt-1 w-full rounded-xl border-blue-200 bg-white/70 text-blue-900 px-3 py-2"
                                    value={gender} onChange={e => setGender(e.target.value)}>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <LabeledNumber label="Systolic (mmHg)" value={systolic} setValue={setSystolic} min={80} max={220} />
                            <LabeledNumber label="Diastolic (mmHg)" value={diastolic} setValue={setDiastolic} min={40} max={140} />
                            <LabeledNumber label="Fasting Glucose (mg/dL)" value={glucose} setValue={setGlucose} min={60} max={300} />
                            <LabeledNumber label="Total Cholesterol (mg/dL)" value={cholesterol} setValue={setCholesterol} min={80} max={400} />
                            <LabeledNumber label="Weight (kg)" value={weight} setValue={setWeight} min={25} max={300} />
                            <LabeledNumber label="Height (cm)" value={height} setValue={setHeight} min={80} max={230} />

                            <div>
                                <label className="block text-sm font-medium text-blue-900">Smoker</label>
                                <select className="mt-1 w-full rounded-xl border-blue-200 bg-white/70 text-blue-900 px-3 py-2"
                                    value={smoker ? 'yes' : 'no'} onChange={e => setSmoker(e.target.value === 'yes')}>
                                    <option value="no">No</option>
                                    <option value="yes">Yes</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-blue-900">Activity Level</label>
                                <select className="mt-1 w-full rounded-xl border-blue-200 bg-white/70 text-blue-900 px-3 py-2"
                                    value={activityLevel} onChange={e => setActivityLevel(e.target.value as any)}>
                                    <option value="low">Low</option>
                                    <option value="moderate">Moderate</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-4 flex gap-3">
                            <Button onClick={handlePrefillFromRecords} variant="ghost">Prefill from Records</Button>
                            <Button onClick={handlePredict}>
                                {loading ? 'Predicting...' : (prediction ? 'Re-run Prediction' : 'Predict Health')}
                            </Button>
                        </div>
                        {error && <p className="text-red-600 mt-3">{error}</p>}

                        <div className="mt-4 text-blue-900 text-sm">BMI (auto): <span className="font-semibold">{bmi || '—'}</span></div>
                    </div>

                    <div className="lg:col-span-1">
                        {prediction ? (
                            <div className="space-y-4">
                                <div className="glass-light rounded-2xl p-5">
                                    <h3 className="font-semibold text-blue-900">Risk Level</h3>
                                    <p className="mt-1 text-2xl">
                                        {prediction.result.riskLevel === 'High' && <span className="text-red-600">High</span>}
                                        {prediction.result.riskLevel === 'Moderate' && <span className="text-yellow-600">Moderate</span>}
                                        {prediction.result.riskLevel === 'Low' && <span className="text-green-700">Low</span>}
                                    </p>
                                </div>
                                <div className="glass-light rounded-2xl p-5">
                                    <h3 className="font-semibold text-blue-900">Potential Conditions</h3>
                                    <ul className="mt-2 list-disc list-inside text-blue-900">
                                        {prediction.result.conditions.length ? prediction.result.conditions.map((c, i) => (
                                            <li key={i}>{c}</li>
                                        )) : <li>None detected</li>}
                                    </ul>
                                </div>
                                <div className="glass-light rounded-2xl p-5">
                                    <h3 className="font-semibold text-blue-900">Recommendations</h3>
                                    <ul className="mt-2 list-disc list-inside text-blue-900">
                                        {prediction.result.recommendations.length ? prediction.result.recommendations.map((r, i) => (
                                            <li key={i}>{r}</li>
                                        )) : <li>Maintain current lifestyle</li>}
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <div className="glass-light rounded-2xl p-6 text-blue-900">
                                <p className="text-sm">Prediction results will appear here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

function LabeledNumber({ label, value, setValue, min, max }: { label: string; value: number; setValue: (n: number) => void; min?: number; max?: number }) {
    return (
        <div>
            <label className="block text-sm font-medium text-blue-900">{label}</label>
            <input
                type="number"
                className="mt-1 w-full rounded-xl border-blue-200 bg-white/70 text-blue-900 px-3 py-2"
                value={value}
                min={min}
                max={max}
                onChange={e => setValue(Number(e.target.value))}
            />
        </div>
    );
}


