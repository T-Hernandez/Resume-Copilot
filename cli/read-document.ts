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
  if (extension === '.pdf' || extension === '.docx') {
    try {
      const buffer = fs.readFileSync(resolved);
      return await (extension === '.pdf' ? extractTextFromPdf(buffer) : extractTextFromDocx(buffer));
    } catch {
      // pdf-parse/mammoth throw their own low-level parser errors (bad
      // header, truncated structure, etc.) on bytes that do not decode as a
      // real file of that extension - a plain-language message and a clean
      // exit beats a raw parser stack trace, same reasoning as the API's
      // equivalent handling in request-document.ts.
      console.error(`Could not read ${filePath} - it may be corrupted, empty, or not a valid ${extension.slice(1).toUpperCase()} file.`);
      process.exit(1);
    }
  }
  return fs.readFileSync(resolved, 'utf8');
}
