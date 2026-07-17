import { matchCanonicalSection } from './section-headers';

export interface ParsedSection {
  title: string;
  content: string[];
  startLine: number;
  endLine: number;
}

export interface ParsedDocument {
  rawText: string;
  sections: ParsedSection[];
  metadata: {
    sectionCount: number;
    skillCount: number;
  };
}

export interface StructuredResume {
  skills: Array<{ raw: string; confidence: number }>;
  experience: Array<{ role?: string; company?: string; dates?: string; description?: string }>;
}

export interface DocumentPipelineResult {
  parsedDocument: ParsedDocument;
  structuredResume: StructuredResume;
}

export function buildDocumentPipeline(text: string): DocumentPipelineResult {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const sections: ParsedSection[] = [];

  let currentTitle = 'overview';
  let currentContent: string[] = [];
  let currentStart = 0;

  const flush = () => {
    if (currentTitle === 'overview' && !currentContent.length) return;
    sections.push({ title: currentTitle, content: currentContent, startLine: currentStart, endLine: currentStart + currentContent.length });
  };

  // Header recognition lives in section-headers.ts so new header variants
  // (e.g. "Core Competencies", "Stack") are a config change, not a code change.
  const detectSection = (line: string) => matchCanonicalSection(line);

  lines.forEach((line, index) => {
    const detected = detectSection(line);
    if (detected) {
      flush();
      const inlineContent = line.includes(':') ? line.split(':').slice(1).join(':').trim() : '';
      currentTitle = detected;
      currentContent = inlineContent ? [inlineContent] : [];
      currentStart = index + 1;
      return;
    }

    if (currentTitle === 'overview') {
      currentContent.push(line);
      return;
    }

    currentContent.push(line);
  });

  flush();

  const skillCandidates = sections
    .filter(section => section.title === 'skills')
    .flatMap(section => section.content)
    .flatMap(line => line.split(/[,;]+/))
    .map(token => token.trim())
    .filter(Boolean)
    .filter(token => !token.toLowerCase().startsWith('summary:'))
    .filter(token => !token.toLowerCase().startsWith('title:'))
    .filter(token => !token.toLowerCase().startsWith('name:'));

  const experienceCandidates = sections
    .filter(section => section.title === 'experience')
    .flatMap(section => section.content)
    .filter(Boolean);

  const parsedDocument: ParsedDocument = {
    rawText: text,
    sections,
    metadata: {
      sectionCount: sections.length,
      skillCount: skillCandidates.length
    }
  };

  const structuredResume: StructuredResume = {
    skills: skillCandidates.map((raw, index) => ({ raw, confidence: 100 - index })),
    experience: experienceCandidates.length ? [{ role: experienceCandidates[0], company: 'Unknown', dates: 'Unknown', description: experienceCandidates.slice(1).join(' ') }] : []
  };

  return { parsedDocument, structuredResume };
}
