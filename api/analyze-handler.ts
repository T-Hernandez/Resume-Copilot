import { generateAnalysis } from '../01-domain/services/generate-analysis';
import { buildRecommendationInput } from '../01-domain/services/build-recommendation-input';
import { PipelineConfig } from '../01-domain/entities/pipeline-config';
import { Analysis } from '../01-domain/entities/analysis';
import { Recommendation } from '../01-domain/value-objects/recommendation';
import { ClaudeRecommendationGenerator } from '../infrastructure/claude-recommendation-generator';
import { RequestDocument, resolveDocumentText, isRequestDocument } from './request-document';

// Second consumer of the domain (cli/analyze.ts is the first) - same rule
// applies: this only calls generateAnalysis()/buildRecommendationInput() and
// shapes the result for HTTP, no domain logic lives here.
const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  algorithmVersion: '2.0.0',
  weights: { skills: 0.4, experience: 0.25, education: 0.1, keywords: 0.15 }
};

// Thrown only for malformed requests, so server.ts can map it to 400
// without the handler needing to know about HTTP status codes itself.
export class InvalidRequestError extends Error {}

export interface AnalyzeRequestBody {
  resume: RequestDocument;
  job: RequestDocument;
  recommend?: boolean;
}

export interface AnalyzeResponseBody {
  analysis: Analysis;
  recommendations?: Recommendation[];
  recommendationError?: string;
}

export function parseAnalyzeRequestBody(body: unknown): AnalyzeRequestBody {
  if (typeof body !== 'object' || body === null) {
    throw new InvalidRequestError('Request body must be a JSON object');
  }
  const { resume, job, recommend } = body as Record<string, unknown>;

  if (!isRequestDocument(resume)) {
    throw new InvalidRequestError('resume must be { text: string } or { base64: string, format: "pdf"|"docx" }');
  }
  if (!isRequestDocument(job)) {
    throw new InvalidRequestError('job must be { text: string } or { base64: string, format: "pdf"|"docx" }');
  }
  if (recommend !== undefined && typeof recommend !== 'boolean') {
    throw new InvalidRequestError('recommend must be a boolean if provided');
  }

  return { resume, job, recommend: (recommend as boolean | undefined) ?? false };
}

// Opt-in only, same reasoning as cli/analyze.ts's --recommend: a failed LLM
// call (missing credentials, refusal, network error) degrades to
// recommendationError on the response rather than failing the whole
// request - the deterministic analysis is still valid and already computed.
export async function handleAnalyzeRequest(rawBody: unknown): Promise<AnalyzeResponseBody> {
  const body = parseAnalyzeRequestBody(rawBody);

  const resumeText = await resolveDocumentText(body.resume);
  const jobText = await resolveDocumentText(body.job);

  const { analysis } = generateAnalysis({
    resume: resumeText,
    job: jobText,
    pipelineConfig: DEFAULT_PIPELINE_CONFIG
  });

  const result: AnalyzeResponseBody = { analysis };

  if (body.recommend) {
    try {
      const recommendationInput = buildRecommendationInput(analysis);
      const generator = new ClaudeRecommendationGenerator();
      result.recommendations = await generator.generate(recommendationInput);
    } catch (error) {
      result.recommendationError = error instanceof Error ? error.message : String(error);
    }
  }

  return result;
}
