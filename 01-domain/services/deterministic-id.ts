// Small self-contained hash (djb2 variant), deliberately not using Node's
// `crypto` module - 01-domain/README.md's "no external deps" rule is
// applied here to platform built-ins too, not just npm packages, so the
// domain stays runnable anywhere a JS engine exists, not just Node.
//
// Used as the *fallback* identity for a resume/job when the caller doesn't
// supply one (see generate-analysis-v2.ts) - previously every Analysis
// hardcoded id/resumeId/jobId to the same literal strings regardless of
// input, which was fine while nothing consumed those fields but becomes a
// real problem the moment something needs to tell two different resumes'
// Analyses apart (persistence, history, comparing many candidates). This is
// intentionally NOT cryptographic - two different inputs producing the same
// hash is a labeling collision, not a security concern, so a fast
// non-cryptographic hash is the right tool.
export function deterministicId(prefix: string, text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  return `${prefix}-${hex}`;
}
