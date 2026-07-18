import { Evidence } from '../value-objects/evidence';
import { ParsedResumeDocument } from '../services/parse-resume-document';
import { DefaultSkillNormalizer } from '../services/skill-normalizer';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mentionsSkill(text: string | undefined, skillQuery: string): boolean {
  if (!text) return false;
  return new RegExp(`\\b${escapeRegExp(skillQuery)}\\b`, 'i').test(text);
}

// Evidence Builder: finds every place in the resume that bears on whether
// the candidate has `skillQuery`, and how sure each individual finding is.
// It does not decide whether the skill counts as "matched" overall -
// that's matchSkill()'s job, in match-skill.ts. Keeping this split means
// the matching *decision* can change (stricter/looser thresholds, new
// tie-breaking rules) without touching how evidence gets found.
export function buildSkillEvidence(skillQuery: string, resume: ParsedResumeDocument): Evidence[] {
  const normalizer = new DefaultSkillNormalizer();
  const queryCanonical = normalizer.normalizeSkill(skillQuery).canonical;
  const evidence: Evidence[] = [];

  for (const skill of resume.skills) {
    const isCanonicalMatch = queryCanonical && skill.canonical === queryCanonical;
    const isRawMatch = skill.raw.toLowerCase() === skillQuery.toLowerCase();
    if (isCanonicalMatch || isRawMatch) {
      evidence.push({
        source: 'resume.skills',
        value: skill.raw,
        confidence: skill.confidence ?? 100
      });
    }
  }

  resume.experience.forEach((entry, experienceIndex) => {
    const bullets = entry.bullets || [];
    const matchingBullet = bullets.find(bullet => mentionsSkill(bullet, skillQuery));
    const titleOrCompanyMatch = mentionsSkill(entry.title, skillQuery) || mentionsSkill(entry.company, skillQuery);

    if (matchingBullet) {
      evidence.push({
        source: 'resume.experience',
        value: matchingBullet,
        confidence: 80,
        location: { experienceIndex }
      });
    } else if (titleOrCompanyMatch) {
      evidence.push({
        source: 'resume.experience',
        value: [entry.title, entry.company].filter(Boolean).join(' - '),
        confidence: 60,
        location: { experienceIndex }
      });
    }
  });

  if (mentionsSkill(resume.summary, skillQuery)) {
    evidence.push({ source: 'resume.summary', value: resume.summary!, confidence: 60 });
  }

  // Projects don't have a structured parser yet (still raw text on
  // ParsedResumeDocument) - scanned the same way as summary until one exists.
  if (mentionsSkill(resume.projects, skillQuery)) {
    evidence.push({ source: 'resume.projects', value: resume.projects!, confidence: 55 });
  }

  return evidence;
}
