export interface Education {
  id?: string;
  institution?: string;
  degree?: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  // See Experience.parseConfidence - same meaning, same 0..100 scale.
  parseConfidence?: number;
}
