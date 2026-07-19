import * as fs from 'fs';
import * as path from 'path';
import { generateAnalysis } from '../01-domain/services/generate-analysis';
import { buildRecommendationInput } from '../01-domain/services/build-recommendation-input';
import { PipelineConfig } from '../01-domain/entities/pipeline-config';
import { ClaudeRecommendationGenerator } from '../infrastructure/claude-recommendation-generator';
import { extractTextFromPdf, extractTextFromDocx } from '../infrastructure/extract-text';
import { parseArguments } from './arguments';
import { printAnalysis, printRecommendations } from './output';

// First public interface consuming the domain (Ubiquitous-Language.md's
// "Aplicación / Presentación (externo a dominio)" layer) - not 01-domain
// work, deliberately: this only ever calls generateAnalysis() and formats
// what comes back, same boundary the spec harness's executor.ts has
// respected all along. No new domain logic lives here.
const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  algorithmVersion: '2.0.0',
  weights: { skills: 0.4, experience: 0.25, education: 0.1, keywords: 0.15 }
};

// Extracts to plain text regardless of source format - PDF and DOCX both go
// through infrastructure/extract-text.ts before this function returns, so
// generateAnalysis() (and everything under 01-domain) never has to know a
// PDF was ever involved. .txt stays a plain read - no extraction needed.
async function readResumeOrJobText(filePath: string): Promise<string> {
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const extension = path.extname(resolved).toLowerCase();
  if (extension === '.pdf') {
    return extractTextFromPdf(fs.readFileSync(resolved));
  }
  if (extension === '.docx') {
    return extractTextFromDocx(fs.readFileSync(resolved));
  }
  return fs.readFileSync(resolved, 'utf8');
}

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

  const { analysis } = generateAnalysis({
    resume: resumeText,
    job: jobText,
    pipelineConfig: DEFAULT_PIPELINE_CONFIG
  });

  printAnalysis(analysis);

  // Opt-in only: the RecommendationGenerator adapter calls the Claude API,
  // which needs credentials this CLI does not manage (ANTHROPIC_API_KEY, or
  // an `ant auth login` profile - see .env.example). Everything above this
  // point is the deterministic engine and requires no network access at
  // all; --recommend is the one path that does.
  if (args.wantsRecommendations) {
    console.log('\nGenerating recommendations (Claude API)...');
    try {
      const recommendationInput = buildRecommendationInput(analysis);
      const generator = new ClaudeRecommendationGenerator();
      const recommendations = await generator.generate(recommendationInput);
      printRecommendations(recommendations);
    } catch (error) {
      console.error('\nCould not generate recommendations:', error instanceof Error ? error.message : error);
    }
  }

  console.log('');
}

main();
