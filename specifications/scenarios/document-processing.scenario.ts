import { Scenario } from '../runner/runner';

Scenario({
  name: 'Document processing pipeline detects sections and extracts skills',
  given: {
    resumeText: 'Technical Competencies\nReact\nNode\nDocker\n\nExperience\nFrontend Developer at Acme Corp\n2022-2025\nBuilt React and Node services',
    jobText: 'Required Skills: React\nMinExperienceYears: 1',
    pipelineConfig: {
      algorithmVersion: '0.2.0',
      weights: { skills: 0.8, experience: 0.2 },
      thresholds: { skillMatch: 90 },
      partialMatchScore: 70
    }
  },
  expect: {
    'parsedDocument.metadata.sectionCount': '>= 2',
    'parsedDocument.metadata.skillCount': '>= 3',
    'parsedResumeDocument.skills.length': '>= 3',
    overall: 'greaterThan:60'
  },
  rationale: [
    'The document processor should detect section boundaries from headings.',
    'Skills should be extracted from the structured sections instead of relying on a single line.',
    'The analysis should remain meaningful when the document is parsed through the new pipeline.',
    'parsedResumeDocument (not the legacy parsedResume/Resume DTO) - generateAnalysis() is V2-backed as of the 2026-07-18 migration, see public-api.scenario.ts.'
  ]
});
