import { extractTextFromPdf, extractTextFromDocx } from '../infrastructure/extract-text';

// The HTTP-body equivalent of cli/analyze.ts's readResumeOrJobText(): a
// resume/job arrives either as plain text or as a base64-encoded PDF/DOCX
// (JSON body, not multipart - avoids adding a second new dependency like
// multer just to support two small file uploads). Same infrastructure
// extractors as the CLI, so a PDF submitted via the API and one submitted
// via `npm run analyze` are read identically.
export type RequestDocument = { text: string } | { base64: string; format: 'pdf' | 'docx' };

export async function resolveDocumentText(doc: RequestDocument): Promise<string> {
  if ('text' in doc) {
    return doc.text;
  }
  const buffer = Buffer.from(doc.base64, 'base64');
  return doc.format === 'pdf' ? extractTextFromPdf(buffer) : extractTextFromDocx(buffer);
}

export function isRequestDocument(value: unknown): value is RequestDocument {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { text?: unknown; base64?: unknown; format?: unknown };
  if (typeof candidate.text === 'string') return true;
  return typeof candidate.base64 === 'string' && (candidate.format === 'pdf' || candidate.format === 'docx');
}
