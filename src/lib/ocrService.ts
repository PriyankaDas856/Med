import Tesseract from 'tesseract.js';

export async function extractTextFromFile(file: File): Promise<string> {
	const ext = file.name.toLowerCase();
	// For PDFs, tesseract.js can rasterize but is heavy; here we fallback to client-side simple read for .txt
	if (ext.endsWith('.txt')) {
		return await file.text();
	}
	const { data } = await Tesseract.recognize(file, 'eng', { logger: () => {} });
	return data.text || '';
}


