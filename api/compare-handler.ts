import { compareResumesToJob, RankedCandidate } from '../01-domain/services/compare-resumes';
import { DEFAULT_PIPELINE_CONFIG } from '../config/default-pipeline-config';
import { RequestDocument, resolveDocumentText, isRequestDocument } from './request-document';
import { InvalidRequestError } from './analyze-handler';

// Third consumer of the domain, same boundary as analyze-handler.ts: this
// only calls compareResumesToJob() and shapes the result for HTTP - no
// ranking/scoring logic lives here, that's 01-domain/services/rank-analyses.ts.
export interface CompareRequestBody {
  job: RequestDocument;
  resumes: Array<{ id: string; document: RequestDocument }>;
}

export interface CompareResponseBody {
  compared: number;
  algorithmVersion: string;
  generatedAt: string;
  results: RankedCandidate[];
}

function isResumeEntry(value: unknown): value is { id: string; document: RequestDocument } {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { id?: unknown; document?: unknown };
  return typeof candidate.id === 'string' && isRequestDocument(candidate.document);
}

export function parseCompareRequestBody(body: unknown): CompareRequestBody {
  if (typeof body !== 'object' || body === null) {
    throw new InvalidRequestError('Request body must be a JSON object');
  }
  const { job, resumes } = body as Record<string, unknown>;

  if (!isRequestDocument(job)) {
    throw new InvalidRequestError('job must be { text: string } or { base64: string, format: "pdf"|"docx" }');
  }
  if (!Array.isArray(resumes) || resumes.length < 2) {
    throw new InvalidRequestError('resumes must be an array of at least 2 { id: string, document: RequestDocument } entries');
  }
  // Unbounded above only by the 10mb JSON body limit otherwise - a public
  // endpoint with no upper bound lets one request fan out into dozens of
  // full analyses (each parsing text/PDF/DOCX and running the scoring
  // pipeline), which is a real cost/DoS vector on a single free-tier
  // instance. 50 comfortably covers real comparison use cases.
  if (resumes.length > 50) {
    throw new InvalidRequestError('resumes cannot contain more than 50 entries per request');
  }
  if (!resumes.every(isResumeEntry)) {
    throw new InvalidRequestError('each resumes entry must be { id: string, document: { text: string } | { base64: string, format: "pdf"|"docx" } }');
  }
  const ids = resumes.map(r => r.id);
  if (new Set(ids).size !== ids.length) {
    throw new InvalidRequestError('resumes[].id must be unique - it is the only way the response can be matched back to a candidate');
  }

  return { job, resumes };
}

export async function handleCompareRequest(rawBody: unknown): Promise<CompareResponseBody> {
  const body = parseCompareRequestBody(rawBody);

  const jobText = await resolveDocumentText(body.job);
  const candidates = await Promise.all(
    body.resumes.map(async resume => ({ id: resume.id, text: await resolveDocumentText(resume.document) }))
  );

  const results = compareResumesToJob(candidates, jobText, DEFAULT_PIPELINE_CONFIG);
  return {
    compared: results.length,
    algorithmVersion: DEFAULT_PIPELINE_CONFIG.algorithmVersion,
    generatedAt: new Date().toISOString(),
    results
  };
}
