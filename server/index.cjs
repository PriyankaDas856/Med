'use strict';

const path = require('path');
const fs = require('fs');
const express = require('express');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const cors = require('cors');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');
const mammoth = require('mammoth');
const Database = require('better-sqlite3');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const PORT = process.env.PORT || 5174;
const ORIGIN = process.env.ORIGIN || 'http://localhost:5173';
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_PATH = path.join(DATA_DIR, 'medpass.db');
const ENC_KEY = process.env.ENC_KEY || crypto.createHash('sha256').update('medpass-dev-key').digest(); // 32 bytes
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const app = express();
app.use(cors({
	origin: ORIGIN,
	credentials: true,
	allowedHeaders: ['Content-Type', 'X-User-Id'],
	optionsSuccessStatus: 204,
}));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(UPLOADS_DIR));

// Auth helpers (JWT cookie)
function setSession(res, payload) {
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('mp_session', token, { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 7*24*3600*1000, path: '/' });
}

function clearSession(res) {
    res.clearCookie('mp_session', { path: '/' });
}

function requireUser(req, res, next) {
    const token = req.cookies && req.cookies.mp_session;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;
        req.userEmail = decoded.email;
        req.userName = decoded.name;
        return next();
    } catch (e) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}

// Storage
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS records (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	created_at TEXT NOT NULL,
	data_enc BLOB NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS predictions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    input_json TEXT NOT NULL,
    result_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS assistant_chats (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    role TEXT NOT NULL, -- 'user' | 'assistant'
    message TEXT NOT NULL,
    language TEXT
);
CREATE TABLE IF NOT EXISTS emergency_info (
    user_id TEXT PRIMARY KEY,
    data_enc BLOB NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS medical_summaries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    summary_json TEXT NOT NULL
);
`);

function aesEncrypt(jsonObj) {
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv);
	const plaintext = Buffer.from(JSON.stringify(jsonObj));
	const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
	const tag = cipher.getAuthTag();
	return Buffer.concat([iv, tag, enc]);
}

function aesDecrypt(buffer) {
	const iv = buffer.subarray(0, 12);
	const tag = buffer.subarray(12, 28);
	const data = buffer.subarray(28);
	const decipher = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, iv);
	decipher.setAuthTag(tag);
	const dec = Buffer.concat([decipher.update(data), decipher.final()]);
	return JSON.parse(dec.toString('utf8'));
}

// Multer setup
const storage = multer.diskStorage({
	destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
	filename: (_req, file, cb) => {
		const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
		cb(null, `${unique}-${file.originalname}`);
	},
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// OCR helpers
async function extractFromPdf(filePath) {
	const data = await pdfParse(fs.readFileSync(filePath));
	return data.text || '';
}

async function extractFromImage(filePath) {
	const { data } = await Tesseract.recognize(filePath, 'eng', { logger: () => {} });
	return data.text || '';
}

async function extractFromDocx(filePath) {
	const { value } = await mammoth.extractRawText({ path: filePath });
	return value || '';
}

async function extractFromTxt(filePath) {
	return fs.readFileSync(filePath, 'utf8');
}

function categorizeRecord(fileName, text) {
	const name = (fileName || '').toLowerCase();
	const t = (text || '').toLowerCase();
	if (name.includes('rx') || name.includes('prescrip') || /rx|prescrip/.test(t)) return 'Prescription';
	if (name.includes('report') || /report|result/.test(t)) return 'Report';
	if (name.includes('scan') || /mri|ct|x-?ray|ultra/.test(t)) return 'Scan';
	return 'Other';
}

function basicEntityExtract(text) {
	const cleaned = text.replace(/\t/g, ' ').replace(/ +/g, ' ').trim();
	const dateMatch = cleaned.match(/(\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b|\b\d{4}[\/-]\d{1,2}[\/-]\d{1,2}\b)/);
	const doctorMatch = cleaned.match(/Dr\.?\s+[A-Z][a-zA-Z]+\s?[A-Z]?[a-z]*/);
	const hospitalMatch = cleaned.match(/Hospital|Clinic|Medical Center|Med Centre/i);
	const diagnosisMatch = cleaned.match(/Diagnosis\s*[:\-]\s*([^\n]+)/i);
	const medicinesMatch = cleaned.match(/(Rx|Prescription|Medicines?)\s*[:\-]?\s*([^\n]+)/i);
	const followupMatch = cleaned.match(/(Follow\s?up|Next Visit|Review)\s*[:\-]?\s*([^\n]+)/i);
	return {
		patientName: '',
		doctor: doctorMatch ? doctorMatch[0] : '',
		hospital: hospitalMatch ? hospitalMatch[0] : '',
		date: dateMatch ? dateMatch[0] : '',
		diagnosis: diagnosisMatch ? diagnosisMatch[1].trim() : '',
		medicines: medicinesMatch ? medicinesMatch[2].trim() : '',
		followUp: followupMatch ? followupMatch[2].trim() : '',
		rawText: cleaned,
	};
}

// Routes
// Auth
app.post('/api/auth/signup', async (req, res) => {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (exists) return res.status(409).json({ error: 'Email already registered' });
    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    const createdAt = new Date().toISOString();
    db.prepare('INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)').run(id, name, email, passwordHash, createdAt);
    setSession(res, { id, email, name });
    return res.json({ ok: true, user: { id, email, name, createdAt } });
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
    const row = db.prepare('SELECT id, name, email, password_hash FROM users WHERE email = ?').get(email);
    if (!row) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    setSession(res, { id: row.id, email: row.email, name: row.name });
    return res.json({ ok: true, user: { id: row.id, email: row.email, name: row.name } });
});

app.post('/api/auth/logout', (req, res) => {
    clearSession(res);
    return res.json({ ok: true });
});

app.get('/api/auth/me', requireUser, (req, res) => {
    return res.json({ ok: true, user: { id: req.userId, email: req.userEmail, name: req.userName } });
});
app.post('/api/upload', requireUser, upload.single('file'), async (req, res) => {
	try {
		if (!req.file) return res.status(400).json({ error: 'No file' });
		const ext = path.extname(req.file.originalname).toLowerCase();
		let text = '';
		if (ext === '.pdf') text = await extractFromPdf(req.file.path);
		else if (['.jpg', '.jpeg', '.png'].includes(ext)) text = await extractFromImage(req.file.path);
		else return res.status(400).json({ error: 'Unsupported file type' });
		const fields = basicEntityExtract(text);
		return res.json({ ok: true, fields });
	} catch (e) {
		console.error(e);
		return res.status(500).json({ error: 'OCR failed' });
	}
});

// New: multi-upload with categorization and saving
app.post('/api/records/upload', requireUser, upload.array('files', 10), async (req, res) => {
	try {
		const files = req.files || [];
		if (!files.length) return res.status(400).json({ error: 'No files' });
		const results = [];
		for (const f of files) {
			const ext = path.extname(f.originalname).toLowerCase();
			let text = '';
			if (ext === '.pdf') text = await extractFromPdf(f.path);
			else if (['.jpg', '.jpeg', '.png'].includes(ext)) text = await extractFromImage(f.path);
			else if (ext === '.docx') text = await extractFromDocx(f.path);
			else if (ext === '.txt') text = await extractFromTxt(f.path);
			else text = '';
			const fields = basicEntityExtract(text);
			const record_type = categorizeRecord(f.originalname, text);
			const summary = (fields.diagnosis || '').slice(0, 200) || (text || '').slice(0, 200);
			const payload = {
				id: crypto.randomUUID(),
				user_id: req.userId,
				file_name: f.originalname,
				file_url: `/uploads/${path.basename(f.path)}`,
				record_type,
				summary,
				uploaded_at: new Date().toISOString(),
				fields,
			};
			const dataEnc = aesEncrypt(payload);
			db.prepare('INSERT INTO records (id, user_id, created_at, data_enc) VALUES (?, ?, ?, ?)')
				.run(payload.id, req.userId, payload.uploaded_at, dataEnc);
			results.push(payload);
		}
		return res.json({ ok: true, items: results });
	} catch (e) {
		console.error(e);
		return res.status(500).json({ error: 'Upload failed' });
	}
});

// Manual text record
app.post('/api/records/manual', requireUser, (req, res) => {
	try {
		const { title, text } = req.body || {};
		const record_type = categorizeRecord(title || 'manual.txt', text || '');
		const fields = basicEntityExtract(text || '');
		const payload = {
			id: crypto.randomUUID(),
			user_id: req.userId,
			file_name: title || 'Manual Entry',
			file_url: null,
			record_type,
			summary: (fields.diagnosis || '').slice(0, 200) || (text || '').slice(0, 200),
			uploaded_at: new Date().toISOString(),
			fields,
		};
		const dataEnc = aesEncrypt(payload);
		db.prepare('INSERT INTO records (id, user_id, created_at, data_enc) VALUES (?, ?, ?, ?)')
			.run(payload.id, req.userId, payload.uploaded_at, dataEnc);
		return res.json({ ok: true, item: payload });
	} catch (e) {
		console.error(e);
		return res.status(500).json({ error: 'Save failed' });
	}
});

// Delete record
app.delete('/api/records/:id', requireUser, (req, res) => {
	const { id } = req.params;
	const row = db.prepare('SELECT data_enc FROM records WHERE id = ? AND user_id = ?').get(id, req.userId);
	if (!row) return res.status(404).json({ error: 'Not found' });
	// Attempt to delete file if exists
	try {
		const data = aesDecrypt(row.data_enc);
		if (data && data.file_url) {
			const abs = path.join(__dirname, data.file_url.replace(/^\//, ''));
			if (abs.startsWith(UPLOADS_DIR) && fs.existsSync(abs)) fs.unlinkSync(abs);
		}
	} catch {}
	db.prepare('DELETE FROM records WHERE id = ? AND user_id = ?').run(id, req.userId);
	return res.json({ ok: true });
});

app.post('/api/records', requireUser, (req, res) => {
	try {
		const payload = req.body; // expects structured fields
		const id = crypto.randomUUID();
		const createdAt = new Date().toISOString();
		const dataEnc = aesEncrypt(payload);
		const stmt = db.prepare('INSERT INTO records (id, user_id, created_at, data_enc) VALUES (?, ?, ?, ?)');
		stmt.run(id, req.userId, createdAt, dataEnc);
		return res.json({ ok: true, id });
	} catch (e) {
		console.error(e);
		return res.status(500).json({ error: 'Save failed' });
	}
});

app.get('/api/records', requireUser, (req, res) => {
	const rows = db.prepare('SELECT id, user_id, created_at, data_enc FROM records WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
	const items = rows.map(r => ({ id: r.id, createdAt: r.created_at, data: aesDecrypt(r.data_enc) }));
	return res.json({ ok: true, items });
});

// AI Medical Summary
app.post('/api/ai/summary', requireUser, async (req, res) => {
    try {
        const rows = db.prepare('SELECT data_enc FROM records WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
        if (!rows.length) {
            return res.json({ ok: true, summary: {
                overview: 'No medical data found. Please upload your records first.',
                trends: [],
                alerts: [],
                recommendations: ['Upload medical records to enable analysis']
            }});
        }
        const items = rows.map(r => aesDecrypt(r.data_enc));
        const textBlob = items.map(it => [it.summary, it.fields?.diagnosis, it.fields?.medicines, it.fields?.rawText].filter(Boolean).join('\n')).join('\n\n');

        const summary = await generateSummaryFromText(textBlob);
        const id = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        db.prepare('INSERT INTO medical_summaries (id, user_id, created_at, summary_json) VALUES (?, ?, ?, ?)')
          .run(id, req.userId, createdAt, JSON.stringify(summary));
        return res.json({ ok: true, summary, createdAt, id });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Summary generation failed' });
    }
});

app.get('/api/ai/summary/latest', requireUser, (req, res) => {
    const row = db.prepare('SELECT id, created_at, summary_json FROM medical_summaries WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(req.userId);
    if (!row) return res.json({ ok: true, summary: null });
    return res.json({ ok: true, id: row.id, createdAt: row.created_at, summary: JSON.parse(row.summary_json) });
});

async function generateSummaryFromText(text) {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) return mockSummary(text);
        const fetchFn = global.fetch || (await import('node-fetch')).default;
        const sys = 'Summarize the following medical record text into concise sections: overview, trends (array), alerts (array), recommendations (array). Keep it factual and non-diagnostic.';
        const resp = await fetchFn('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: sys },
                    { role: 'user', content: text.slice(0, 12000) }
                ],
                temperature: 0.2
            }),
        });
        if (!resp.ok) return mockSummary(text);
        const data = await resp.json();
        const content = data?.choices?.[0]?.message?.content || '';
        // Simple parse: attempt JSON first
        try {
            const parsed = JSON.parse(content);
            if (parsed && typeof parsed === 'object') return normalizeSummary(parsed);
        } catch {}
        // Fallback: build structured sections from text
        return normalizeSummary({
            overview: content.slice(0, 400),
            trends: [],
            alerts: [],
            recommendations: []
        });
    } catch {
        return mockSummary(text);
    }
}

function normalizeSummary(obj) {
    return {
        overview: String(obj.overview || '').trim() || 'Summary generated.',
        trends: Array.isArray(obj.trends) ? obj.trends.map(String) : [],
        alerts: Array.isArray(obj.alerts) ? obj.alerts.map(String) : [],
        recommendations: Array.isArray(obj.recommendations) ? obj.recommendations.map(String) : [],
    };
}

function mockSummary(text) {
    const lower = (text || '').toLowerCase();
    const trends = [];
    if (lower.includes('bp') || lower.includes('blood pressure')) trends.push('Blood pressure noted in records');
    if (lower.includes('glucose') || lower.includes('sugar')) trends.push('Glucose-related entries detected');
    if (lower.includes('cholesterol')) trends.push('Cholesterol values mentioned');
    const alerts = [];
    if (lower.includes('high') && (lower.includes('bp') || lower.includes('glucose') || lower.includes('cholesterol'))) alerts.push('Potential elevated metrics present');
    const recommendations = ['Maintain regular exercise (30 mins daily)', 'Balanced diet with reduced processed sugar', 'Stay hydrated'];
    return {
        overview: 'Automated summary based on your uploaded records. Verify with your physician.',
        trends,
        alerts,
        recommendations,
    };
}

// AI Prediction (rule-based mock)
app.post('/api/ai/predict', requireUser, (req, res) => {
    try {
        const input = req.body || {};
        const {
            age = 0,
            gender = 'unknown',
            systolic = 0,
            diastolic = 0,
            glucose = 0,
            cholesterol = 0,
            weight = 0,
            height = 0,
            smoker = false,
            activityLevel = 'low',
        } = input;

        const bmi = height > 0 ? Number((weight / Math.pow(height / 100, 2)).toFixed(1)) : 0;

        let riskScore = 0;
        if (age >= 60) riskScore += 2; else if (age >= 45) riskScore += 1;
        if ((gender || '').toLowerCase() === 'male' && age >= 50) riskScore += 1;
        if (systolic >= 140 || diastolic >= 90) riskScore += 2; else if (systolic >= 130 || diastolic >= 85) riskScore += 1;
        if (glucose >= 126) riskScore += 2; else if (glucose >= 110) riskScore += 1;
        if (cholesterol >= 240) riskScore += 2; else if (cholesterol >= 200) riskScore += 1;
        if (bmi >= 30) riskScore += 2; else if (bmi >= 25) riskScore += 1;
        if (smoker) riskScore += 2;
        if (activityLevel === 'low') riskScore += 1;

        let riskLevel = 'Low';
        if (riskScore >= 6) riskLevel = 'High';
        else if (riskScore >= 3) riskLevel = 'Moderate';

        const conditions = [];
        if (systolic >= 130 || diastolic >= 85) conditions.push('Hypertension risk');
        if (glucose >= 110) conditions.push('Diabetes risk');
        if (cholesterol >= 200) conditions.push('Hypercholesterolemia risk');
        if (bmi >= 25) conditions.push('Overweight/Obesity risk');

        const recommendations = [];
        if (activityLevel === 'low') recommendations.push('Exercise 30 minutes daily');
        if (glucose >= 110) recommendations.push('Limit processed sugar and refined carbs');
        if (cholesterol >= 200) recommendations.push('Adopt a heart-healthy diet (more fiber, less saturated fat)');
        if (systolic >= 130 || diastolic >= 85) recommendations.push('Monitor blood pressure weekly');
        if (bmi >= 25) recommendations.push('Aim for 5-10% weight reduction over 6 months');
        if (smoker) recommendations.push('Enroll in a smoking cessation program');

        const result = {
            riskLevel,
            conditions,
            recommendations,
            metrics: { bmi, riskScore },
        };

        const id = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        db.prepare('INSERT INTO predictions (id, user_id, created_at, input_json, result_json) VALUES (?, ?, ?, ?, ?)')
          .run(id, req.userId, createdAt, JSON.stringify(input), JSON.stringify(result));

        return res.json({ ok: true, prediction: { id, createdAt, input, result } });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Prediction failed' });
    }
});

// Assistant Endpoints
app.get('/api/assistant/history', requireUser, (req, res) => {
    const rows = db.prepare('SELECT id, created_at, role, message, language FROM assistant_chats WHERE user_id = ? ORDER BY created_at ASC LIMIT 200')
        .all(req.userId);
    return res.json({ ok: true, items: rows });
});

app.post('/api/assistant/message', requireUser, async (req, res) => {
    try {
        const { message, language } = req.body || {};
        if (!message || typeof message !== 'string') return res.status(400).json({ error: 'Missing message' });
        const userId = req.userId;
        const now = new Date().toISOString();

        // Save user message
        db.prepare('INSERT INTO assistant_chats (id, user_id, created_at, role, message, language) VALUES (?, ?, ?, ?, ?, ?)')
          .run(crypto.randomUUID(), userId, now, 'user', message, language || detectLanguage(message));

        // Generate reply (mock or OpenAI if configured)
        const replyLang = language || detectLanguage(message);
        const reply = await generateAssistantReply({ message, userId, language: replyLang });

        db.prepare('INSERT INTO assistant_chats (id, user_id, created_at, role, message, language) VALUES (?, ?, ?, ?, ?, ?)')
          .run(crypto.randomUUID(), userId, new Date().toISOString(), 'assistant', reply, replyLang);

        return res.json({ ok: true, reply, language: replyLang });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Assistant failed' });
    }
});

function detectLanguage(text) {
    // Basic heuristic: return 'en' unless we detect non-Latin range
    if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Devanagari (Hindi)
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te'; // Telugu
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'; // Tamil
    if (/[\u00C0-\u017F]/.test(text) || /ñ|á|é|í|ó|ú/i.test(text)) return 'es'; // crude Spanish hints
    return 'en';
}

async function generateAssistantReply({ message, userId, language }) {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return fallbackAssistant(message, language);
        }
        // Lazy import to avoid dependency when not configured
        const fetchFn = global.fetch || (await import('node-fetch')).default;
        const sys = `You are MedPass AI Assistant. Be concise, friendly, and medically cautious. If asked, summarize user's records but never invent data.`;
        const payload = {
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: sys },
                { role: 'user', content: message },
            ],
        };
        const resp = await fetchFn('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify(payload),
        });
        if (!resp.ok) return fallbackAssistant(message, language);
        const data = await resp.json();
        const content = data?.choices?.[0]?.message?.content || '';
        return translateIfNeeded(content, language);
    } catch {
        return fallbackAssistant(message, language);
    }
}

function fallbackAssistant(message, language) {
    // Very simple rule-based advice and echo
    const lower = message.toLowerCase();
    let base = 'I am here to help. For personalized care, consult a certified doctor. ';
    if (lower.includes('bp') || lower.includes('blood pressure')) base += 'Monitor your blood pressure regularly and reduce sodium intake. ';
    if (lower.includes('glucose') || lower.includes('sugar')) base += 'Limit processed sugar and stay active 30 minutes daily. ';
    if (lower.includes('cholesterol')) base += 'Adopt a heart-healthy diet rich in fiber and healthy fats. ';
    if (lower.includes('headache')) base += 'Stay hydrated, rest, and seek care if persistent or severe. ';
    const reply = base.trim();
    return translateIfNeeded(reply, language);
}

function translateIfNeeded(text, language) {
    // Placeholder: since we may not have a translation API key, return as-is.
    // In a real setup, call translation API if language !== 'en'.
    return text;
}

// Emergency Health Mode Endpoints (auth required)
app.get('/api/emergency/data', requireUser, (req, res) => {
    const row = db.prepare('SELECT data_enc, updated_at FROM emergency_info WHERE user_id = ?').get(req.userId);
    if (!row) return res.json({ ok: true, data: null });
    try {
        const data = aesDecrypt(row.data_enc);
        return res.json({ ok: true, data, updatedAt: row.updated_at });
    } catch (e) {
        return res.status(500).json({ error: 'Decrypt failed' });
    }
});

app.post('/api/emergency/qr', requireUser, async (req, res) => {
    try {
        const info = req.body || {};
        // Persist encrypted info tied to user
        const payload = {
            userId: req.userId,
            name: info.name || req.userName || req.userEmail,
            bloodGroup: info.bloodGroup || '',
            allergies: info.allergies || '',
            medications: info.medications || '',
            emergencyContactName: info.emergencyContactName || '',
            emergencyContactPhone: info.emergencyContactPhone || '',
            updatedAt: new Date().toISOString(),
        };
        const enc = aesEncrypt(payload);
        db.prepare('INSERT INTO emergency_info (user_id, data_enc, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data_enc = excluded.data_enc, updated_at = excluded.updated_at')
          .run(req.userId, enc, payload.updatedAt);

        // QR encodes a compact encrypted token (hex) with prefix
        const tokenHex = enc.toString('hex');
        const qrText = `mpemg:${tokenHex}`;
        const QRCode = require('qrcode');
        const dataUrl = await QRCode.toDataURL(qrText, { margin: 2, scale: 6, errorCorrectionLevel: 'M' });

        return res.json({ ok: true, dataUrl, qrText });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'QR generation failed' });
    }
});

app.post('/api/emergency/alert', requireUser, async (req, res) => {
    try {
        const { messageOverride } = req.body || {};
        // Load current info
        const row = db.prepare('SELECT data_enc FROM emergency_info WHERE user_id = ?').get(req.userId);
        if (!row) return res.status(400).json({ error: 'No emergency info saved' });
        const info = aesDecrypt(row.data_enc);
        const to = (info.emergencyContactPhone || '').trim();
        if (!to) return res.status(400).json({ error: 'Missing emergency contact phone' });

        const text = messageOverride || `Emergency Alert: ${info.name || 'MedPass User'} may need assistance. Health: ${info.bloodGroup || 'N/A'}; Allergies: ${info.allergies || 'N/A'}. Shared by MedPass.`;

        const accountSid = process.env.TWILIO_SID;
        const authToken = process.env.TWILIO_TOKEN;
        const fromNumber = process.env.TWILIO_FROM;
        if (accountSid && authToken && fromNumber) {
            try {
                const twilio = require('twilio')(accountSid, authToken);
                await twilio.messages.create({ body: text, from: fromNumber, to });
                return res.json({ ok: true, delivered: true });
            } catch (e) {
                console.error('Twilio send failed', e);
                return res.json({ ok: true, delivered: false, limited: true });
            }
        }
        // Fallback: simulate success in dev
        console.log('[DEV] SMS to', to, '=>', text);
        return res.json({ ok: true, delivered: false, limited: true });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Alert failed' });
    }
});

app.listen(PORT, () => {
	console.log(`MedPass server running on http://localhost:${PORT} (CORS origin: ${ORIGIN})`);
});


