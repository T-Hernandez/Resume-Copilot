import { SkillInstance } from '../entities/skill';

export interface SkillNormalizer {
  normalizeSkill(skill: string | SkillInstance): SkillInstance;
  normalizeSkills(skills: Array<string | SkillInstance>): SkillInstance[];
}

export class DefaultSkillNormalizer implements SkillNormalizer {
  private readonly aliases = new Map<string, string>([
    ['reactjs', 'react'],
    ['react.js', 'react'],
    ['react', 'react'],
    ['nodejs', 'node.js'],
    ['node.js', 'node.js'],
    ['node', 'node.js'],
    ['postgres', 'postgresql'],
    ['postgresql', 'postgresql'],
    ['typescript', 'typescript'],
    ['ts', 'typescript'],
    ['javascript', 'javascript'],
    ['js', 'javascript'],
    ['csharp', 'csharp'],
    ['c#', 'csharp'],
    ['cpp', 'cpp'],
    ['c++', 'cpp'],
    ['css', 'css'],
    ['css3', 'css'],
    ['html', 'html'],
    ['html5', 'html'],
    ['rest api', 'rest-api'],
    ['restapis', 'rest-api'],
    ['rest-api', 'rest-api']
  ]);

  normalizeSkill(skill: string | SkillInstance): SkillInstance {
    const raw = typeof skill === 'string' ? skill : skill.raw;
    const canonical = this.canonicalize(raw);

    if (typeof skill === 'string') {
      return { raw, canonical, confidence: 100 };
    }

    return {
      ...skill,
      canonical,
      confidence: skill.confidence ?? 100
    };
  }

  normalizeSkills(skills: Array<string | SkillInstance>): SkillInstance[] {
    return skills.map(skill => this.normalizeSkill(skill));
  }

  private canonicalize(raw: string): string {
    const value = raw.trim().toLowerCase();
    const candidates = [
      value,
      value.replace(/\s+/g, ''),
      value.replace(/\./g, ''),
      value.replace(/[^a-z0-9+#]+/g, '')
    ];

    for (const candidate of candidates) {
      if (this.aliases.has(candidate)) {
        return this.aliases.get(candidate)!;
      }
    }

    return value.replace(/[^a-z0-9+#]+/g, ' ').trim();
  }
}
