import { Evidence } from '../value-objects/evidence';
import { ParsedResumeDocument } from '../services/parse-resume-document';
import { DefaultSkillNormalizer } from '../services/skill-normalizer';
import { textMentions as mentionsSkill } from './text-mentions';

function collectSkillEvidenceFromSkills(
  skillQuery: string,
  queryCanonical: string | undefined,
  resume: ParsedResumeDocument
): Evidence[] {
  return resume.skills
    .filter(skill => (queryCanonical && skill.canonical === queryCanonical) || skill.raw.toLowerCase() === skillQuery.toLowerCase())
    .map(skill => ({
      source: 'resume.skills' as const,
      value: skill.raw,
      confidence: skill.confidence ?? 100
    }));
}

function collectSkillEvidenceFromExperience(skillQuery: string, resume: ParsedResumeDocument): Evidence[] {
  const evidence: Evidence[] = [];

  resume.experience.forEach((entry, experienceIndex) => {
    const matchingBullet = (entry.bullets || []).find(bullet => mentionsSkill(bullet, skillQuery));
    if (matchingBullet) {
      evidence.push({
        source: 'resume.experience',
        value: matchingBullet,
        confidence: 80,
        location: { experienceIndex }
      });
      return;
    }

    if (mentionsSkill(entry.title, skillQuery) || mentionsSkill(entry.company, skillQuery)) {
      evidence.push({
        source: 'resume.experience',
        value: [entry.title, entry.company].filter(Boolean).join(' - '),
        confidence: 60,
        location: { experienceIndex }
      });
    }
  });

  return evidence;
}

function collectSkillEvidenceFromSummary(skillQuery: string, resume: ParsedResumeDocument): Evidence[] {
  return mentionsSkill(resume.summary, skillQuery)
    ? [{ source: 'resume.summary' as const, value: resume.summary!, confidence: 60 }]
    : [];
}

function collectSkillEvidenceFromProjects(skillQuery: string, resume: ParsedResumeDocument): Evidence[] {
  // Projects don't have a structured parser yet (still raw text on
  // ParsedResumeDocument) - scanned the same way as summary until one exists.
  return mentionsSkill(resume.projects, skillQuery)
    ? [{ source: 'resume.projects' as const, value: resume.projects!, confidence: 55 }]
    : [];
}

// Evidence Builder: finds every place in the resume that bears on whether
// the candidate has `skillQuery`, and how sure each individual finding is.
// It does not decide whether the skill counts as "matched" overall -
// that's matchSkill()'s job, in match-skill.ts. Each source gets its own
// small extractor so adding a new one (technologies, achievements, ...) is
// adding a function and a line here, not editing a monolith.
export function buildSkillEvidence(skillQuery: string, resume: ParsedResumeDocument): Evidence[] {
  const normalizer = new DefaultSkillNormalizer();
  const queryCanonical = normalizer.normalizeSkill(skillQuery).canonical;

  return [
    ...collectSkillEvidenceFromSkills(skillQuery, queryCanonical, resume),
    ...collectSkillEvidenceFromExperience(skillQuery, resume),
    ...collectSkillEvidenceFromSummary(skillQuery, resume),
    ...collectSkillEvidenceFromProjects(skillQuery, resume)
  ];
}
