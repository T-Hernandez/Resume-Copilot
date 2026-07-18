export interface Experience {
  id?: string;
  company?: string;
  title?: string;
  startDate?: string; // ISO date
  endDate?: string; // ISO date or 'present'
  description?: string;
  bullets?: string[]; // individual accomplishment/responsibility lines
  skills?: string[]; // canonical skill names or raw
  // How confident the *parser* is that company/title/dates were split
  // correctly, 0..100 (same scale as value-objects/confidence.ts). This is
  // NOT match confidence - it exists so an ambiguous CV can say so instead
  // of silently pretending it was parsed perfectly.
  parseConfidence?: number;
}
