import { compareResumesToJob } from '../01-domain/services/compare-resumes';
import { DEFAULT_PIPELINE_CONFIG } from '../config/default-pipeline-config';
import { readResumeOrJobText } from './read-document';

const USAGE = 'Usage: npm run compare-resumes -- <job.(txt|pdf|docx)> <resume1> <resume2> [...more resumes]';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const [jobPath, ...resumePaths] = args;

  if (!jobPath || resumePaths.length < 2) {
    console.error(USAGE);
    console.error('(at least 2 resumes are required for a comparison to be meaningful)');
    process.exit(1);
  }

  const jobText = await readResumeOrJobText(jobPath);
  const candidates = await Promise.all(
    resumePaths.map(async resumePath => ({ id: resumePath, text: await readResumeOrJobText(resumePath) }))
  );

  const ranked = compareResumesToJob(candidates, jobText, DEFAULT_PIPELINE_CONFIG);

  console.log('Resume Copilot - Comparison');
  console.log('='.repeat(40));
  for (const result of ranked) {
    const confidence = typeof result.analysis.confidence === 'number' ? `${result.analysis.confidence}%` : 'n/a';
    console.log(`#${result.rank}  ${result.id}  overall=${result.analysis.overall}%  confidence=${confidence}`);
    if (result.analysis.weaknesses?.length) {
      for (const weakness of result.analysis.weaknesses) {
        console.log(`      - ${weakness}`);
      }
    }
  }
  console.log('');
}

main();
