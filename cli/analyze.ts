import { generateAnalysis } from '../01-domain/services/generate-analysis';
import { buildRecommendationInput } from '../01-domain/services/build-recommendation-input';
import { buildDeterministicRecommendations } from '../01-domain/services/build-recommendations';
import { ClaudeRecommendationGenerator } from '../infrastructure/claude-recommendation-generator';
import { DEFAULT_PIPELINE_CONFIG } from '../config/default-pipeline-config';
import { parseArguments } from './arguments';
import { printAnalysis, printRecommendations } from './output';
import { readResumeOrJobText } from './read-document';

// First public interface consuming the domain (Ubiquitous-Language.md's
// "Aplicación / Presentación (externo a dominio)" layer) - not 01-domain
// work, deliberately: this only ever calls generateAnalysis() and formats
// what comes back, same boundary the spec harness's executor.ts has
// respected all along. No new domain logic lives here.

async function main(): Promise<void> {
  let args;
  try {
    args = parseArguments(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  const resumeText = await readResumeOrJobText(args.resumePath);
  const jobText = await readResumeOrJobText(args.jobPath);

  const { analysis, explanation } = generateAnalysis({
    resume: resumeText,
    job: jobText,
    pipelineConfig: DEFAULT_PIPELINE_CONFIG,
    resumeId: args.resumePath,
    jobId: args.jobPath
  });

  printAnalysis(analysis, explanation);

  // Deterministic recommendations are always shown, no flag or network
  // required - the "aunque sean deterministas al principio" baseline every
  // caller gets for free. See 01-domain/services/build-recommendations.ts.
  const recommendationInput = buildRecommendationInput(analysis);
  printRecommendations(buildDeterministicRecommendations(recommendationInput), 'Recommendations');

  // Opt-in enhancement on top of the baseline above: the RecommendationGenerator
  // adapter calls the Claude API, which needs credentials this CLI does not
  // manage (ANTHROPIC_API_KEY, or an `ant auth login` profile - see
  // .env.example). Everything above this point requires no network access
  // at all; --recommend is the one path that does.
  if (args.wantsRecommendations) {
    console.log('\nGenerating AI-enhanced recommendations (Claude API)...');
    try {
      const generator = new ClaudeRecommendationGenerator();
      const recommendations = await generator.generate(recommendationInput);
      printRecommendations(recommendations, 'Recommendations (AI-enhanced)');
    } catch (error) {
      console.error('\nCould not generate AI-enhanced recommendations:', error instanceof Error ? error.message : error);
    }
  }

  console.log('');
}

main();
