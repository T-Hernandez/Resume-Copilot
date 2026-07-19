export interface CliArguments {
  resumePath: string;
  jobPath: string;
  wantsRecommendations: boolean;
}

export const USAGE = 'Usage: npm run analyze -- <resume.(txt|pdf|docx)> <job.(txt|pdf|docx)> [--recommend]';

export function parseArguments(argv: string[]): CliArguments {
  const wantsRecommendations = argv.includes('--recommend');
  const [resumePath, jobPath] = argv.filter(arg => arg !== '--recommend');

  if (!resumePath || !jobPath) {
    throw new Error(USAGE);
  }

  return { resumePath, jobPath, wantsRecommendations };
}
