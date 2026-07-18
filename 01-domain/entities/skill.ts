export interface SkillInstance {
  id?: string; // optional identifier within resume
  raw: string; // raw extracted text
  canonical?: string; // normalized form
  confidence?: number; // 0..100 - doubles as parse confidence when the
  // instance comes straight out of a parser, and match confidence once it
  // flows into matching. Same field, context tells you which.
  category?: string; // e.g. "frontend", "backend" - from a resume's own
  // sub-headers ("Frontend:", "Backend:"), lowercased. Undefined if the
  // resume didn't group its skills.
}

export interface SkillDictionaryEntry {
  alias: string;
  canonical: string;
}
