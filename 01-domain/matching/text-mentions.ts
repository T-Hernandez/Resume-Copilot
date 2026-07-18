function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Whole-phrase, case-insensitive containment check, shared by every
// Evidence Builder that needs to find a phrase inside free text (skills in
// experience bullets, degree keywords in an Education entry, ...).
//
// Uses lookaround instead of \b: `\bC++\b` never matches "C++" followed by
// whitespace/punctuation, because \b needs a word/non-word transition on
// BOTH sides and "+" is already non-word, so the trailing boundary only
// fires when the next character happens to be alphanumeric. Lookaround
// only checks that the characters immediately OUTSIDE the match aren't
// alphanumeric, regardless of what the match itself starts/ends with - so
// "Node.js", "ASP.NET", "C++", "C#", "Ph.D" all get correct boundaries.
export function textMentions(text: string | undefined, phrase: string): boolean {
  if (!text) return false;
  return new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(phrase)}(?![A-Za-z0-9])`, 'i').test(text);
}
