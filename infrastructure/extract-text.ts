import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';

// Second infrastructure-layer concern, same boundary as
// claude-recommendation-generator.ts: raw file-format extraction is not
// domain work, so it lives here, not under 01-domain. Both functions return
// plain text - the exact same input shape parseResumeDocument/
// parseJobDocument already accept, so nothing downstream of extraction
// changes at all. This is deliberately the only responsibility of this
// file: turn bytes into text. Structuring that text is still the domain's
// job.
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}
