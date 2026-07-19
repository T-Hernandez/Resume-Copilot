import { Scenario } from '../runner/runner';
import { generateAnalysis } from '../../01-domain/services/generate-analysis';

Scenario({
  name: 'Public generateAnalysis API returns parsed state and analysis',
  given: {
    resumeText: 'Skills: React, TypeScript\nSummary: Frontend developer',
    jobText: 'Required Skills: React; TypeScript\nMinExperienceYears: 2',
    pipelineConfig: {
      algorithmVersion: '0.1.0',
      weights: { skills: 0.8, experience: 0.2 },
      thresholds: { skillMatch: 90 },
      partialMatchScore: 70
    }
  },
  expect: {
    overall: '>= 80',
    'parsedResumeDocument.skills.length': '>= 2',
    'parsedJobDocument.requiredSkills.length': '>= 2'
  },
  rationale: [
    'The public domain API should parse its inputs into intermediate states.' ,
    'The benchmark should be able to inspect parsed state as well as the resulting analysis.',
    'Resolves the public-API contract question left open in ADR-004: generateAnalysis() now returns ParsedResumeDocument/ParsedJobDocument (not the legacy Resume/Job DTO) - the wrapper is V2-backed as of the 2026-07-18 migration, so its parsed intermediate state matches what it actually computes internally instead of a differently-typed shape that happened to share field names.'
  ]
});
