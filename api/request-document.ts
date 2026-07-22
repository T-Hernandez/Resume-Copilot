import { extractTextFromPdf, extractTextFromDocx } from '../infrastructure/extract-text';

// The HTTP-body equivalent of cli/analyze.ts's readResumeOrJobText(): a
// resume/job arrives either as plain text or as a base64-encoded PDF/DOCX
// (JSON body, not multipart - avoids adding a second new dependency like
// multer just to support two small file uploads). Same infrastructure
// extractors as the CLI, so a PDF submitted via the API and one submitted
// via `npm run analyze` are read identically.
export type RequestDocument = { text: string } | { base64: string; format: 'pdf' | 'docx' };

// Thrown only for malformed requests, so server.ts can map it to 400 without
// the handler needing to know about HTTP status codes itself. Defined here
// (not analyze-handler.ts, its original home) because resolveDocumentText -
// the one place that needs to throw it for a corrupt/unreadable upload -
// lives here; analyze-handler.ts re-exports it so existing imports elsewhere
// do not need to change.
export class InvalidRequestError extends Error {}

export async function resolveDocumentText(doc: RequestDocument): Promise<string> {
  if ('text' in doc) {
    return doc.text;
  }
  const buffer = Buffer.from(doc.base64, 'base64');
  try {
    return await (doc.format === 'pdf' ? extractTextFromPdf(buffer) : extractTextFromDocx(buffer));
  } catch {
    // pdf-parse/mammoth throw their own low-level parser errors (bad
    // header, truncated structure, etc.) on bytes that do not decode as a
    // real file of the declared format - almost always a bad upload (wrong
    // file, truncated download, renamed extension), not a server bug, so a
    // plain-language 400 beats a bare "Internal server error" 500.
    const label = doc.format.toUpperCase();
    throw new InvalidRequestError(`Could not read this ${label} file - it may be corrupted, empty, or not a valid ${label} file.`);
  }
}

export function isRequestDocument(value: unknown): value is RequestDocument {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { text?: unknown; base64?: unknown; format?: unknown };
  if (typeof candidate.text === 'string') return true;
  return typeof candidate.base64 === 'string' && (candidate.format === 'pdf' || candidate.format === 'docx');
}
