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

app.listen(PORT, () => {
	console.log(`MedPass server running on http://localhost:${PORT} (CORS origin: ${ORIGIN})`);
});


