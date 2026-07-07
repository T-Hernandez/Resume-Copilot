export interface SkillInstance {
  id?: string; // optional identifier within resume
  raw: string; // raw extracted text
  canonical?: string; // normalized form
  confidence?: number; // 0..100
}

export interface SkillDictionaryEntry {
  alias: string;
  canonical: string;
}
