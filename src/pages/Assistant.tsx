import { useEffect, useMemo, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import { apiAssistantHistory, apiAssistantSend, apiMe, type ChatMessage } from '../lib/api';
import { useNavigate } from 'react-router-dom';

export default function AssistantPage() {
    const navigate = useNavigate();
    const [authChecked, setAuthChecked] = useState(false);
    const [isAuthed, setIsAuthed] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [language, setLanguage] = useState<string>('auto');
    const [sending, setSending] = useState(false);
    const endRef = useRef<HTMLDivElement | null>(null);

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
            const hist = await apiAssistantHistory();
            if (!cancel) setMessages(hist);
        }).catch(() => { setIsAuthed(false); setAuthChecked(true); });
        return () => { cancel = true; };
    }, []);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, sending]);

    const canSend = useMemo(() => input.trim().length > 0 && !sending, [input, sending]);

    async function onSend() {
        if (!canSend) return;
        const text = input.trim();
        setInput('');
        const optimistic: ChatMessage = { id: Math.random().toString(36).slice(2), created_at: new Date().toISOString(), role: 'user', message: text } as any;
        setMessages(prev => [...prev, optimistic]);
        setSending(true);
        try {
            const res = await apiAssistantSend({ message: text, language: language === 'auto' ? undefined : language });
            const aiMsg: ChatMessage = { id: Math.random().toString(36).slice(2), created_at: new Date().toISOString(), role: 'assistant', message: res.reply, language: res.language } as any;
            setMessages(prev => [...prev, aiMsg]);
        } catch (e: any) {
            const err: ChatMessage = { id: Math.random().toString(36).slice(2), created_at: new Date().toISOString(), role: 'assistant', message: `Error: ${e?.message || 'Assistant failed'}` } as any;
            setMessages(prev => [...prev, err]);
        } finally {
            setSending(false);
        }
    }

    if (authChecked && !isAuthed) {
        return (
            <div className="min-h-full">
                <Navbar />
                <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-28 sm:pt-36 pb-16">
                    <div className="glass-light rounded-2xl p-6">
                        <h1 className="text-xl font-semibold text-blue-900">Please log in to access MedPass AI Assistant.</h1>
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
            <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-28 sm:pt-36 pb-16">
                <h1 className="text-3xl font-bold text-white">MedPass AI Assistant</h1>
                <p className="text-blue-100 mt-2">Ask health questions, get tips, and summaries. Multilingual support enabled.</p>

                <div className="mt-4 glass-light rounded-2xl p-4 h-[60vh] overflow-y-auto">
                    {messages.length === 0 && (
                        <p className="text-blue-900 text-sm">Start the conversation. Your chat is private and linked to your account.</p>
                    )}
                    <div className="space-y-3">
                        {messages.map(m => (
                            <div key={m.id} className={`max-w-[80%] ${m.role === 'user' ? 'ml-auto' : ''}`}>
                                <div className={`rounded-2xl px-4 py-2 ${m.role === 'user' ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-900'}`}>
                                    <div className="text-xs opacity-80">{m.role === 'user' ? 'You' : 'MedPass AI'} • {new Date(m.created_at).toLocaleTimeString()}</div>
                                    <div className="mt-1 whitespace-pre-wrap">{m.message}</div>
                                </div>
                            </div>
                        ))}
                        {sending && (
                            <div className="max-w-[80%]">
                                <div className="rounded-2xl px-4 py-2 bg-blue-100 text-blue-900">
                                    <div className="text-xs opacity-80">MedPass AI • typing…</div>
                                    <div className="mt-1">
                                        <span className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-bounce mr-1"></span>
                                        <span className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-bounce mr-1" style={{ animationDelay: '0.1s' }}></span>
                                        <span className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={endRef} />
                    </div>
                </div>

                <div className="mt-4 flex items-center gap-3">
                    <select value={language} onChange={e => setLanguage(e.target.value)} className="rounded-xl border border-blue-300 bg-blue-100 px-3 py-2">
                        <option value="auto">Auto</option>
                        <option value="en">English</option>
                        <option value="hi">Hindi</option>
                        <option value="te">Telugu</option>
                        <option value="ta">Tamil</option>
                        <option value="es">Spanish</option>
                    </select>
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
                        placeholder="Type your message..."
                        className="flex-1 rounded-xl border border-blue-300 bg-blue-100 px-3 py-2 focus:outline-none focus-glow"
                    />
                    <Button onClick={onSend} disabled={!canSend}>{sending ? 'Sending…' : 'Send'}</Button>
                </div>
            </main>
        </div>
    );
}


