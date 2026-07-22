// mammoth ships no TypeScript types of its own and there is no @types/mammoth
// package - this is the minimal ambient declaration for the functions this
// codebase actually calls (extractRawText, convertToHtml), not a full API
// surface.
declare module 'mammoth' {
  export interface ExtractRawTextResult {
    value: string;
    messages: unknown[];
  }

  export function extractRawText(input: { path?: string; buffer?: Buffer }): Promise<ExtractRawTextResult>;

  export interface ConvertToHtmlOptions {
    // false keeps a genuinely empty paragraph in the output as <p></p>
    // instead of silently dropping it (mammoth's default) - see
    // docx-structured-text.ts for why this is the one real signal a resume
    // author leaves for "these are two different entries", recoverable no
    // other way once the DOCX has been parsed.
    ignoreEmptyParagraphs?: boolean;
  }

  // Used instead of extractRawText for DOCX (see docx-structured-text.ts) -
  // its HTML output distinguishes a real bulleted list (<ul><li>) from plain
  // paragraphs (<p>), which extractRawText's flattened plain text cannot.
  export function convertToHtml(
    input: { path?: string; buffer?: Buffer },
    options?: ConvertToHtmlOptions
  ): Promise<ExtractRawTextResult>;
}
