import { analyzeResumeOnly, ResumeInsight } from '../01-domain/services/analyze-resume';
import { RequestDocument, resolveDocumentText, isRequestDocument } from './request-document';
import { InvalidRequestError } from './analyze-handler';

// The no-job counterpart to /analyze: a candidate does not always have a
// specific posting to compare against. Deliberately its own endpoint with
// its own response shape rather than making `job` optional on
// AnalyzeRequestBody - that response is built entirely around a job
// comparison (analysis.overall, explanation, recommendations), none of
// which analyzeResumeOnly can honestly produce without a job's
// requirements. Two small, predictable contracts beat one endpoint whose
// response shape silently changes based on which fields were sent.
export interface AnalyzeResumeRequestBody {
  resume: RequestDocument;
  resumeId?: string;
}

export interface AnalyzeResumeResponseBody {
  insight: ResumeInsight;
}

export function parseAnalyzeResumeRequestBody(body: unknown): AnalyzeResumeRequestBody {
  if (typeof body !== 'object' || body === null) {
    throw new InvalidRequestError('Request body must be a JSON object');
  }
  const { resume, resumeId } = body as Record<string, unknown>;

  if (!isRequestDocument(resume)) {
    throw new InvalidRequestError('resume must be { text: string } or { base64: string, format: "pdf"|"docx" }');
  }
  if (resumeId !== undefined && typeof resumeId !== 'string') {
    throw new InvalidRequestError('resumeId must be a string if provided');
  }

  return { resume, resumeId: resumeId as string | undefined };
}

export async function handleAnalyzeResumeRequest(rawBody: unknown): Promise<AnalyzeResumeResponseBody> {
  const body = parseAnalyzeResumeRequestBody(rawBody);
  const resumeText = await resolveDocumentText(body.resume);
  const insight = analyzeResumeOnly({ resumeText, resumeId: body.resumeId });
  return { insight };
}
