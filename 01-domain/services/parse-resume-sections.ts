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

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const canonical = matchCanonicalSection(line);
    if (canonical) {
      cursor = canonical;
      sawAnySection = true;
      const inline = inlineContentAfterHeader(line);
      if (inline) (buckets[canonical] ??= []).push(inline);
      continue;
    }

    if (looksLikeSectionHeader(line)) {
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
    if (content && content.length) result[section] = content.join('\n');
  }
  if (otherSections.length) {
    result.other = otherSections
      .filter(section => section.content.length)
      .map(section => `${section.title}\n${section.content.join('\n')}`);
  }

  return result;
}
