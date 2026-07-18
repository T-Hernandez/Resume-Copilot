import { Evidence } from '../value-objects/evidence';
import { ParsedResumeDocument } from '../services/parse-resume-document';
import { experienceDurationYears } from './experience-duration';

// Evidence Builder for experience-years requirements: one piece of evidence
// per resume Experience entry that has a computable duration. An entry
// whose dates parseExperienceSection couldn't find contributes no evidence
// - it's neither assumed to be 0 years nor silently dropped from view, it
// just isn't a fact this builder can state.
//
// Confidence per entry rides on that entry's own parseConfidence (see
// parse-experience.ts) - an entry the parser was unsure how to split
// (ambiguous company/title, no connector) is exactly the entry whose
// duration should carry less weight into the overall match.
export function buildExperienceEvidence(resume: ParsedResumeDocument): Evidence[] {
  const evidence: Evidence[] = [];

  resume.experience.forEach((entry, experienceIndex) => {
    const years = experienceDurationYears(entry);
    if (years === undefined) return;

    const label = [entry.title, entry.company].filter(Boolean).join(' at ') || `Experience #${experienceIndex + 1}`;
    evidence.push({
      source: 'resume.experience',
      value: `${label}: ${years.toFixed(1)} years`,
      confidence: entry.parseConfidence ?? 60,
      location: { experienceIndex }
    });
  });

  return evidence;
}
