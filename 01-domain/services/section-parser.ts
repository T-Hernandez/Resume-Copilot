export interface SectionBlock {
  title: string;
  startLine: number;
  endLine: number;
  content: string[];
}

export interface ParsedSections {
  sections: SectionBlock[];
  byTitle: Record<string, SectionBlock>;
}

export function parseSections(text: string): ParsedSections {
  const lines = text.split(/\r?\n/);
  const sections: SectionBlock[] = [];
  const byTitle: Record<string, SectionBlock> = {};

  let currentTitle = 'Overview';
  let currentStart = 0;
  const currentContent: string[] = [];

  const sectionHeaders = ['Skills', 'Experience', 'Education', 'Projects', 'Languages', 'Certifications'];

  const pushSection = () => {
    if (!currentContent.length && currentTitle === 'Overview') return;
    const block = {
      title: currentTitle,
      startLine: currentStart,
      endLine: currentStart + currentContent.length,
      content: currentContent.filter(Boolean)
    };
    sections.push(block);
    byTitle[currentTitle.toLowerCase()] = block;
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const normalized = trimmed.toLowerCase();
    const matchedHeader = sectionHeaders.find(header => normalized === header.toLowerCase());

    if (matchedHeader) {
      if (currentTitle !== 'Overview' || currentContent.length) {
        pushSection();
      }
      currentTitle = matchedHeader;
      currentStart = index + 1;
      currentContent.length = 0;
      return;
    }

    currentContent.push(trimmed);
  });

  pushSection();

  return { sections, byTitle };
}
