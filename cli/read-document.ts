import * as fs from 'fs';
import * as path from 'path';
import { extractTextFromPdf, extractTextFromDocx } from '../infrastructure/extract-text';

// Shared by every CLI entry point that reads a resume/job off disk
// (analyze.ts, compare-resumes.ts) - previously duplicated inline in
// analyze.ts only, extracted now rather than copy-pasted into a second
// script, same lesson as config/default-pipeline-config.ts.
export async function readResumeOrJobText(filePath: string): Promise<string> {
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
