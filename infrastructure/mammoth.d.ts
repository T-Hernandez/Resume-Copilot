// mammoth ships no TypeScript types of its own and there is no @types/mammoth
// package - this is the minimal ambient declaration for the one function
// this codebase actually calls (extractRawText), not a full API surface.
declare module 'mammoth' {
  export interface ExtractRawTextResult {
    value: string;
    messages: unknown[];
  }

  export function extractRawText(input: { path?: string; buffer?: Buffer }): Promise<ExtractRawTextResult>;
}
