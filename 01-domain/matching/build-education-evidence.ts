import { Evidence } from '../value-objects/evidence';
import { ParsedResumeDocument } from '../services/parse-resume-document';
import { detectDegreeLevel } from './degree-level';

// Evidence Builder for education-level requirements: one piece of evidence
// per resume Education entry whose degree text resolves to a recognizable
// level. An entry with no recognizable degree text (empty, or a phrase not
// in DEGREE_KEYWORDS) contributes no evidence - it is not assumed to be
// "no degree", it just isn't a fact this builder can state confidently.
//
// Confidence per entry rides on that entry's own parseConfidence (see
// parse-education.ts), same reasoning as build-experience-evidence.ts.
export function buildEducationEvidence(resume: ParsedResumeDocument): Evidence[] {
  const evidence: Evidence[] = [];

  resume.education.forEach((entry, educationIndex) => {
    const level = detectDegreeLevel(entry.degree);
    if (!level) return;

    const value = [entry.degree, entry.institution].filter(Boolean).join(' - ');
    evidence.push({
      source: 'resume.education',
      value,
      confidence: entry.parseConfidence ?? 60,
      location: { educationIndex }
    });
  });

  return evidence;
}
