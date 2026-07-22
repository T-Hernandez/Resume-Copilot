import {
  CanonicalSection,
  inlineContentAfterHeader,
  looksLikeSectionHeader,
  matchCanonicalSection
} from './section-headers';

// Phase 1: structural only. This does not know what a "skill" or a "company"
// is - it only answers "where does each section start and end". Meaning
// extraction belongs to the specialized parsers that consume this output.
export interface ResumeSections {
  header: string;
  summary?: string;
  experience?: string;
  education?: string;
  skills?: string;
  projects?: string;
  certifications?: string;
  languages?: string;
  other?: string[];
}

type Cursor = 'header' | CanonicalSection | 'other';

export function parseResumeSections(text: string): ResumeSections {
  const lines = text.split(/\r?\n/);

  const headerLines: string[] = [];
  const buckets: Partial<Record<CanonicalSection, string[]>> = {};
  const otherSections: { title: string; content: string[] }[] = [];

  let cursor: Cursor = 'header';
  let sawAnySection = false;

  const currentOther = () => otherSections[otherSections.length - 1];

  // Push a blank-line marker into a content bucket, but never two in a row
  // and never before any real content - this is what lets a later parser
  // (e.g. parseExperienceSection) split a section back into separate
  // entries by blank line, instead of everything melting into one blob.
  const pushBlankMarker = () => {
    if (cursor === 'header') return;
    if (cursor === 'other') {
      const other = currentOther();
      if (other && other.content.length && other.content[other.content.length - 1] !== '') {
        other.content.push('');
      }
      return;
    }
    const bucket = buckets[cursor];
    if (bucket && bucket.length && bucket[bucket.length - 1] !== '') {
      bucket.push('');
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      pushBlankMarker();
      continue;
    }

    const canonical = matchCanonicalSection(line);
    if (canonical) {
      cursor = canonical;
      sawAnySection = true;
      const inline = inlineContentAfterHeader(line);
      if (inline) (buckets[canonical] ??= []).push(inline);
      continue;
    }

    // Experience and education are expected to contain several blank-line
    // -separated entries (one per job/degree). A short capitalized line
    // right after a blank line is the NORMAL shape of the next entry's
    // company/institution name there ("Google", "State University") - not
    // a signal of a new top-level section. Passed to looksLikeSectionHeader
    // as context (not an outright skip) - a two-column PDF's sidebar header
    // can still occasionally follow directly after an experience/education
    // entry with nothing else between them, and needs a way through; see
    // that function's own reasoning.
    const insideMultiEntrySection = cursor === 'experience' || cursor === 'education';
    // Skills commonly group into sub-categories ("Frontend:", "Backend:") -
    // parseSkillsSection reads those itself. A colon is what distinguishes
    // "sub-category of the list I'm already in" from a genuine new section
    // like "Volunteer Work" (no colon) showing up after the skills list.
    const isSkillsCategoryLabel = cursor === 'skills' && line.includes(':');
    const blankLineBefore = i === 0 || !lines[i - 1].trim();
    if (
      !isSkillsCategoryLabel &&
      looksLikeSectionHeader(line, { inHeaderBlock: cursor === 'header', blankLineBefore, insideMultiEntrySection })
    ) {
      cursor = 'other';
      sawAnySection = true;
      const inline = inlineContentAfterHeader(line);
      const title = (inline ? line.slice(0, line.indexOf(':')) : line).trim();
      otherSections.push({ title, content: inline ? [inline] : [] });
      continue;
    }

    if (cursor === 'header') {
      headerLines.push(line);
    } else if (cursor === 'other') {
      currentOther().content.push(line);
    } else {
      (buckets[cursor] ??= []).push(line);
    }
  }

  // Nothing recognized as a section boundary: treat the whole document as
  // the header block rather than guessing.
  if (!sawAnySection) {
    return { header: lines.map(l => l.trim()).filter(Boolean).join('\n') };
  }

  const result: ResumeSections = { header: headerLines.join('\n') };
  for (const section of Object.keys(buckets) as CanonicalSection[]) {
    const content = buckets[section];
    if (!content || !content.length) continue;
    while (content.length && content[content.length - 1] === '') content.pop();
    if (content.length) result[section] = content.join('\n');
  }
  if (otherSections.length) {
    result.other = otherSections
      .filter(section => section.content.length)
      .map(section => `${section.title}\n${section.content.join('\n')}`);
  }

  return result;
}
