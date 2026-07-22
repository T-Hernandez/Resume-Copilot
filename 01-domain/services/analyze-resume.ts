import { SkillInstance } from '../entities/skill';
import { Experience } from '../entities/experience';
import { Education } from '../entities/education';
import { parseResumeDocument } from './parse-resume-document';
import { totalExperienceYears } from '../matching/experience-duration';
import { deterministicId } from './deterministic-id';

// Same parseConfidence scale as Experience/Education (0..100, base 20 +
// signal-strength increments - see scoreExperienceConfidence/
// scoreEducationConfidence in parse-experience.ts/parse-education.ts).
// Below this, an entry has at most one strong signal (e.g. just a date, or
// just bullets) - genuinely ambiguous, worth surfacing to the reader rather
// than presenting it with the same confidence as a clean entry.
const LOW_PARSE_CONFIDENCE = 50;

export interface ResumeInsight {
  resumeId: string;
  skills: SkillInstance[];
  experience: Experience[];
  education: Education[];
  totalExperienceYears: number;
  warnings: string[];
}

export interface AnalyzeResumeOnlyInput {
  resumeText: string;
  resumeId?: string;
}

// The no-job counterpart to generateAnalysis(): a candidate does not always
// have a specific posting to compare against, and every existing entry
// point (generateAnalysis, compareResumesToJob) requires one. This only
// runs the Parser stage (parseResumeDocument) - there is nothing to match
// or score without a job's requirements, and fabricating an "overall" score
// against no requirements would violate the same honesty ADR-001 already
// commits to for the matched path (see generateAnalysisV2's confidence
// semantics note). What a resume-only reader actually wants is: what did we
// understand from this document, and where is that understanding shaky.
export function analyzeResumeOnly(input: AnalyzeResumeOnlyInput): ResumeInsight {
  const parsed = parseResumeDocument(input.resumeText);
  const resumeId = input.resumeId ?? deterministicId('resume', input.resumeText);

  const warnings: string[] = [];
  const isEmpty = !parsed.skills.length && !parsed.experience.length && !parsed.education.length && !parsed.summary;
  if (isEmpty) {
    warnings.push('Empty resume - nothing could be extracted');
  } else {
    if (!parsed.skills.length) warnings.push('No skills section detected');
    if (!parsed.experience.length) warnings.push('No experience section detected');
    if (!parsed.education.length) warnings.push('No education section detected');
  }

  const lowConfidenceExperience = parsed.experience.filter(
    entry => (entry.parseConfidence ?? 100) < LOW_PARSE_CONFIDENCE
  ).length;
  if (lowConfidenceExperience > 0) {
    const noun = lowConfidenceExperience === 1 ? 'entry' : 'entries';
    warnings.push(`${lowConfidenceExperience} experience ${noun} could not be confidently parsed - dates, company/title, or bullets may be missing or ambiguous`);
  }

  const lowConfidenceEducation = parsed.education.filter(
    entry => (entry.parseConfidence ?? 100) < LOW_PARSE_CONFIDENCE
  ).length;
  if (lowConfidenceEducation > 0) {
    const noun = lowConfidenceEducation === 1 ? 'entry' : 'entries';
    warnings.push(`${lowConfidenceEducation} education ${noun} could not be confidently parsed - institution, degree, or dates may be missing or ambiguous`);
  }

  return {
    resumeId,
    skills: parsed.skills,
    experience: parsed.experience,
    education: parsed.education,
    totalExperienceYears: Math.round(totalExperienceYears(parsed.experience) * 10) / 10,
    warnings
  };
}
