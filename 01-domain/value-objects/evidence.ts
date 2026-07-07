export interface EvidenceItem {
  source: string; // e.g. 'Experience #2', 'Skills section'
  snippet?: string; // optional excerpt
}

export type Evidence = EvidenceItem[];
