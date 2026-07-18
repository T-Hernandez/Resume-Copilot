// Was an unused placeholder (EvidenceItem/Evidence = EvidenceItem[]) before
// this - nothing in the domain referenced it, so it's redefined here rather
// than added alongside as a second, competing Evidence type.
export type EvidenceSource =
  | 'resume.skills'
  | 'resume.experience'
  | 'resume.education'
  | 'resume.projects'
  | 'resume.summary';

export interface EvidenceLocation {
  experienceIndex?: number;
  educationIndex?: number;
  projectIndex?: number;
}

// One concrete fact found in the resume that bears on some query ("does
// this candidate know React?"). Evidence only reports what it found and
// how sure it is of *that specific fact* - it doesn't decide whether the
// query as a whole is satisfied. That's Match's job.
export interface Evidence {
  source: EvidenceSource;
  value: string;
  confidence: number; // 0..100
  location?: EvidenceLocation;
}
