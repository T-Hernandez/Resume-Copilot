import { generateAnalysis } from '../01-domain/services/generate-analysis';
import { buildRecommendationInput } from '../01-domain/services/build-recommendation-input';
import { buildDeterministicRecommendations } from '../01-domain/services/build-recommendations';
import { Analysis } from '../01-domain/entities/analysis';
import { Recommendation } from '../01-domain/value-objects/recommendation';
import { CategoryExplanation } from '../01-domain/services/build-score-explanation';
import { ClaudeRecommendationGenerator } from '../infrastructure/claude-recommendation-generator';
import { DEFAULT_PIPELINE_CONFIG } from '../config/default-pipeline-config';
import { RequestDocument, resolveDocumentText, isRequestDocument, InvalidRequestError } from './request-document';

// Second consumer of the domain (cli/analyze.ts is the first) - same rule
// applies: this only calls generateAnalysis()/buildRecommendationInput() and
// shapes the result for HTTP, no domain logic lives here.

// Re-exported for backward compatibility - see request-document.ts for why
// this now lives there instead.
export { InvalidRequestError };

export interface AnalyzeRequestBody {
  resume: RequestDocument;
  job: RequestDocument;
  recommend?: boolean;
  // Optional caller-supplied identity, passed straight through to
  // Analysis.resumeId/jobId (see generate-analysis-v2.ts). Falls back to a
  // deterministic content hash when omitted - still real identity, just not
  // a caller-chosen one.
  resumeId?: string;
  jobId?: string;
}

export interface AnalyzeResponseBody {
  analysis: Analysis;
  // Structured, per-category (skills/experience/education) matched/missing
  // facts - the same data cli/output.ts renders as a bar chart, offered
  // here as data instead of ASCII so a frontend can render it however it
  // wants (bars, progress rings, whatever). See build-score-explanation.ts.
  explanation: CategoryExplanation[];
  // Always present, zero-dependency baseline - see build-recommendations.ts.
  // Distinct from aiRecommendations below, which is opt-in and can fail.
  recommendations: Recommendation[];
  aiRecommendations?: Recommendation[];
  recommendationError?: string;
}

export function parseAnalyzeRequestBody(body: unknown): AnalyzeRequestBody {
  if (typeof body !== 'object' || body === null) {
    throw new InvalidRequestError('Request body must be a JSON object');
  }
  const { resume, job, recommend, resumeId, jobId } = body as Record<string, unknown>;

  if (!isRequestDocument(resume)) {
    throw new InvalidRequestError('resume must be { text: string } or { base64: string, format: "pdf"|"docx" }');
  }
  if (!isRequestDocument(job)) {
    throw new InvalidRequestError('job must be { text: string } or { base64: string, format: "pdf"|"docx" }');
  }
  if (recommend !== undefined && typeof recommend !== 'boolean') {
    throw new InvalidRequestError('recommend must be a boolean if provided');
  }
  if (resumeId !== undefined && typeof resumeId !== 'string') {
    throw new InvalidRequestError('resumeId must be a string if provided');
  }
  if (jobId !== undefined && typeof jobId !== 'string') {
    throw new InvalidRequestError('jobId must be a string if provided');
  }

  return {
    resume,
    job,
    recommend: (recommend as boolean | undefined) ?? false,
    resumeId: resumeId as string | undefined,
    jobId: jobId as string | undefined
  };
}

// Opt-in only, same reasoning as cli/analyze.ts's --recommend: a failed LLM
// call (missing credentials, refusal, network error) degrades to
// recommendationError on the response rather than failing the whole
// request - the deterministic analysis is still valid and already computed.
export async function handleAnalyzeRequest(rawBody: unknown): Promise<AnalyzeResponseBody> {
  const body = parseAnalyzeRequestBody(rawBody);

  const resumeText = await resolveDocumentText(body.resume);
  const jobText = await resolveDocumentText(body.job);

  const { analysis, explanation } = generateAnalysis({
    resume: resumeText,
    job: jobText,
    pipelineConfig: DEFAULT_PIPELINE_CONFIG,
    resumeId: body.resumeId,
    jobId: body.jobId
  });

  const recommendationInput = buildRecommendationInput(analysis);
  const result: AnalyzeResponseBody = {
    analysis,
    explanation,
    recommendations: buildDeterministicRecommendations(recommendationInput)
  };

  if (body.recommend) {
    try {
      const generator = new ClaudeRecommendationGenerator();
      result.aiRecommendations = await generator.generate(recommendationInput);
    } catch (error) {
      result.recommendationError = error instanceof Error ? error.message : String(error);
    }
  }

  return result;
}
