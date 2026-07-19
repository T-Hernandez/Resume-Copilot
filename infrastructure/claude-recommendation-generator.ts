import Anthropic from '@anthropic-ai/sdk';
import { RecommendationGenerator } from '../01-domain/services/recommendation-generator';
import { RecommendationInput } from '../01-domain/services/build-recommendation-input';
import { Recommendation } from '../01-domain/value-objects/recommendation';

// The infrastructure-layer implementation of the RecommendationGenerator
// port (01-domain/services/recommendation-generator.ts). This is the first
// and only place in the codebase that depends on an LLM SDK - 01-domain
// stays dependency-free per its own README.
//
// Per ADR-001 ("el dominio produce hechos; el LLM solo los explica"), the
// system prompt is written to make it structurally hard for Claude to
// invent a new fact: it is only ever given the already-decided
// RecommendationInput (overall/confidence/breakdown/strengths/weaknesses/
// gaps), never the raw resume or job text, and is instructed to phrase and
// prioritize those facts, not add to them. Structured outputs
// (output_config.format) constrain the response to a fixed shape so
// parsing never depends on the model choosing to format correctly.
const RECOMMENDATION_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          severity: { type: 'string', enum: ['low', 'medium', 'high'] }
        },
        required: ['text', 'severity'],
        additionalProperties: false
      }
    }
  },
  required: ['recommendations'],
  additionalProperties: false
} as const;

const SYSTEM_PROMPT = `You are the recommendation-writing step of a deterministic resume-analysis pipeline.

You will receive a JSON object with fields already decided by a deterministic scoring engine:
- overall: the final match score (0-100)
- confidence: how much evidence backed that score (0-100), or absent if nothing was evaluated
- breakdown: per-category subscores
- strengths: facts about what the candidate has that the job wants
- weaknesses: facts about what the candidate is missing or falls short on
- gaps: skills the job requires that were not found

Your only job is to turn these already-decided facts into a short list of clear, actionable recommendations for the candidate. Rules:
- Do not invent any skill, requirement, score, or fact that is not present in the input.
- Do not contradict or soften any strength or weakness given to you.
- Do not recompute or restate the score - recommendations are about what to do, not what the score was.
- Prioritize weaknesses and gaps over strengths - a candidate reading this wants to know what to improve first.
- Each recommendation is one clear, actionable sentence.
- Return between 1 and 6 recommendations. If there are no weaknesses or gaps, it is fine to return fewer, encouragement-oriented ones grounded only in the given strengths.
- Assign "severity" per recommendation: "high" for a missing required skill or an unmet hard requirement (experience/education), "medium" for a partial gap, "low" for a minor or optional improvement.`;

const DEFAULT_MODEL = 'claude-opus-4-8';

export class ClaudeRecommendationGenerator implements RecommendationGenerator {
  private readonly client: Anthropic;
  private readonly model: string;

  // No manual API-key handling: the zero-arg Anthropic() client already
  // resolves credentials in order (ANTHROPIC_API_KEY -> ANTHROPIC_AUTH_TOKEN
  // -> an `ant auth login` profile -> Workload Identity Federation), so
  // gating on `process.env.ANTHROPIC_API_KEY` being set would incorrectly
  // reject a valid CLI-login profile.
  //
  // Model is overridable via ANTHROPIC_MODEL so cost/quality can be tuned
  // (e.g. Sonnet) without recompiling - this step reformulates an already-
  // structured RecommendationInput rather than reasoning over a full
  // resume/job, so it's a reasonable place to trade Opus for a cheaper model.
  constructor(client: Anthropic = new Anthropic(), model: string = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL) {
    this.client = client;
    this.model = model;
  }

  async generate(input: RecommendationInput): Promise<Recommendation[]> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      thinking: { type: 'adaptive' },
      output_config: {
        format: { type: 'json_schema', schema: RECOMMENDATION_RESPONSE_SCHEMA }
      },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: JSON.stringify(input) }]
    });

    if (response.stop_reason === 'refusal') {
      throw new Error('ClaudeRecommendationGenerator: request was refused, no recommendations generated');
    }

    const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === 'text');
    if (!textBlock) {
      throw new Error('ClaudeRecommendationGenerator: response contained no text content to parse');
    }

    // output_config.format constrains what Claude is instructed to produce,
    // not what JSON.parse actually returns - a malformed or truncated
    // response would otherwise throw deep inside .map() with a confusing
    // stack trace. Validate the shape explicitly before trusting it.
    let parsed: unknown;
    try {
      parsed = JSON.parse(textBlock.text);
    } catch {
      throw new Error('ClaudeRecommendationGenerator: response text was not valid JSON');
    }

    const recommendations = (parsed as { recommendations?: unknown })?.recommendations;
    if (!Array.isArray(recommendations)) {
      throw new Error('ClaudeRecommendationGenerator: response JSON did not contain a recommendations array');
    }

    return recommendations.map((recommendation, index) => {
      if (
        typeof recommendation !== 'object' || recommendation === null ||
        typeof (recommendation as any).text !== 'string' ||
        !['low', 'medium', 'high'].includes((recommendation as any).severity)
      ) {
        throw new Error(`ClaudeRecommendationGenerator: recommendation at index ${index} did not match the expected shape`);
      }
      return {
        id: `rec-${index + 1}`,
        text: (recommendation as { text: string }).text,
        severity: (recommendation as { severity: 'low' | 'medium' | 'high' }).severity
      };
    });
  }
}
