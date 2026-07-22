export interface CliArguments {
  resumePath: string;
  // Optional: a candidate does not always have a specific job posting to
  // compare against. Omitting it switches analyze.ts to the resume-only
  // path (analyzeResumeOnly) instead of generateAnalysis().
  jobPath?: string;
  wantsRecommendations: boolean;
}

export const USAGE = 'Usage: npm run analyze -- <resume.(txt|pdf|docx)> [job.(txt|pdf|docx)] [--recommend]';

export function parseArguments(argv: string[]): CliArguments {
  const wantsRecommendations = argv.includes('--recommend');
  const [resumePath, jobPath] = argv.filter(arg => arg !== '--recommend');

  if (!resumePath) {
    throw new Error(USAGE);
  }
  if (wantsRecommendations && !jobPath) {
    throw new Error('--recommend requires a job posting to compare against - omit --recommend for resume-only analysis, or provide a job path.');
  }

  return { resumePath, jobPath, wantsRecommendations };
}
