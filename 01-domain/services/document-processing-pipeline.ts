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
  const sectionNames = ['skills', 'experience', 'education', 'projects', 'languages', 'certifications'];
  const aliases: Record<string, string[]> = {
    skills: ['skills', 'technical competencies', 'technical skills', 'tech stack', 'core skills', 'competencies'],
    experience: ['experience', 'work experience', 'professional experience'],
    education: ['education', 'academics'],
    projects: ['projects', 'portfolio'],
    languages: ['languages'],
    certifications: ['certifications', 'licenses']
  };

  let currentTitle = 'overview';
  let currentContent: string[] = [];
  let currentStart = 0;

  const flush = () => {
    if (currentTitle === 'overview' && !currentContent.length) return;
    sections.push({ title: currentTitle, content: currentContent, startLine: currentStart, endLine: currentStart + currentContent.length });
  };

  const detectSection = (line: string) => {
    const normalized = line.toLowerCase();
    for (const [canonical, values] of Object.entries(aliases)) {
      if (values.some(value => normalized === value || normalized.startsWith(`${value}:`))) {
        return canonical;
      }
    }
    return undefined;
  };

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
    .filter(Boolean);

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
