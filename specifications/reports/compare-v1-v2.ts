import * as fs from 'fs';
import * as path from 'path';
import { generateAnalysisV1, parseResumeTextV1, parseJobTextV1 } from '../../01-domain/services/generate-analysis-v1';
import { generateAnalysisV2 } from '../../01-domain/services/generate-analysis-v2';
import { PipelineConfig } from '../../01-domain/entities/pipeline-config';

// Diagnostic report, not a pass/fail spec: runs generateAnalysisV1 and
// generateAnalysisV2 on the same real resume/job pairs from examples/ and
// prints their overall/breakdown/confidence/gaps side by side. This is the
// "compare against a golden dataset" step the user asked for after
// EducationMatch/generateAnalysisV2 shipped.
//
// Calls generateAnalysisV1 directly (not via generateAnalysis()) since that
// wrapper was repointed to V2 in the 2026-07-18 migration (ADR-004) - this
// script's whole job is comparing the two engines, so it needs both by name,
// not whichever one is currently the default.
//
// The goal here is conceptual coverage, not a target count (user's explicit
// reframe: "quiero cubrir todos los comportamientos relevantes" over
// "quiero llegar a 30 ejemplos") - each pair's `coverage` tag names the
// behavior it's meant to exercise, so gaps in the checklist are visible in
// this file directly. See project_resume_copilot_roadmap memory for the
// full checklist and which items are still unchecked.
interface Pair {
  coverage: string;
  label: string;
  resumeFile: string;
  jobFile: string;
}

const pairs: Pair[] = [
  { coverage: 'strong-match', label: 'Frontend Junior -> React Job (expected: strong fit)', resumeFile: 'examples/resume-frontend-junior.txt', jobFile: 'examples/job-react.txt' },
  { coverage: 'partial-match', label: 'Backend Senior -> Java Job (expected: partial fit - PostgreSQL overlaps, Node.js is not Java)', resumeFile: 'examples/resume-backend-senior.txt', jobFile: 'examples/job-java.txt' },
  { coverage: 'total-mismatch', label: 'DevOps -> ML Engineer Job (expected: poor fit - no overlapping required skills)', resumeFile: 'examples/resume-devops.txt', jobFile: 'examples/job-ai-engineer.txt' },
  { coverage: 'total-mismatch', label: 'Frontend Junior -> Java Job (expected: mismatched domain, near-zero fit)', resumeFile: 'examples/resume-frontend-junior.txt', jobFile: 'examples/job-java.txt' },
  { coverage: 'junior-to-senior', label: 'Frontend Junior -> Senior React Job (expected: junior applying to senior - partial skill overlap, real experience gate)', resumeFile: 'examples/resume-frontend-junior.txt', jobFile: 'examples/job-react-senior.txt' },
  { coverage: 'senior-to-junior, no-education-requirement', label: 'Backend Senior -> Junior Node.js Job (expected: senior overqualified for junior - full skill + experience coverage; job also has no Education field at all, so education stays absent from breakdown rather than defaulted)', resumeFile: 'examples/resume-backend-senior.txt', jobFile: 'examples/job-node-junior.txt' },
  { coverage: 'incomplete-cv', label: 'Sparse CV -> React Job (expected: incomplete resume - low confidence, not a confident "no")', resumeFile: 'examples/resume-sparse.txt', jobFile: 'examples/job-react.txt' },
  { coverage: 'education-met (baseline)', label: 'Bachelor\'s CV -> Bachelor\'s-required Job (expected: education requirement exactly met)', resumeFile: 'examples/resume-fullstack-with-degree.txt', jobFile: 'examples/job-node-bachelor.txt' },
  { coverage: 'education-insufficient', label: 'Bachelor\'s CV -> Master\'s-required Job (expected: education requirement not met, but a confident reading, not "no data")', resumeFile: 'examples/resume-fullstack-with-degree.txt', jobFile: 'examples/job-node-master.txt' },
  { coverage: 'education-exceeds', label: 'Bachelor\'s CV -> Associate-required Job (expected: candidate exceeds the education bar)', resumeFile: 'examples/resume-fullstack-with-degree.txt', jobFile: 'examples/job-node-associate.txt' },
  { coverage: 'experience-at-limit', label: 'Backend Senior (8yr) -> Job requiring exactly 8yr (expected: requirement exactly met, not off-by-one)', resumeFile: 'examples/resume-backend-senior.txt', jobFile: 'examples/job-node-exp-limit.txt' },
  { coverage: 'experience-just-below', label: 'Backend Senior (8yr) -> Job requiring 9yr (expected: falls 1 year short - confident no, not uncertain)', resumeFile: 'examples/resume-backend-senior.txt', jobFile: 'examples/job-node-exp-justbelow.txt' },
  { coverage: 'preferred-only', label: 'Frontend Junior -> Job with only Preferred skills, no Required (expected: skills subscore reads as "nothing required" - exposes that preferredSkills isn\'t fed into matching yet)', resumeFile: 'examples/resume-frontend-junior.txt', jobFile: 'examples/job-react-preferred-only.txt' },
  { coverage: 'skills-in-experience-only', label: 'Resume with no Skills section, tech only in Experience bullets -> React Job (expected: evidence still found via the experience-bullet extractor)', resumeFile: 'examples/resume-skills-in-bullets.txt', jobFile: 'examples/job-react.txt' },
  { coverage: 'alias-resolution', label: 'Resume with raw aliases (ReactJS, Postgres, Node) -> Job requiring canonical names (React, Node.js, PostgreSQL)', resumeFile: 'examples/resume-alias-skills.txt', jobFile: 'examples/job-react-node-required.txt' },
  { coverage: 'symbol-named-tech', label: 'C++/C# resume -> C++/C# Job (expected: symbol-suffixed skill names resolve correctly, not missed by a naive word-boundary match)', resumeFile: 'examples/resume-cpp-dev.txt', jobFile: 'examples/job-cpp.txt' },
  { coverage: 'overlapping-experience', label: 'Two overlapping Experience entries (concurrent full-time + freelance) -> Job requiring 5yr (known limitation: totalExperienceYears double-counts the overlap, 4 real years reads as 6)', resumeFile: 'examples/resume-overlapping-experience.txt', jobFile: 'examples/job-node-exp-overlap-check.txt' },
  { coverage: 'ambiguous-dates', label: 'Experience entry with a non-standard date phrase ("Desde 2021 hasta la actualidad") -> React Job (expected: no evidence extracted, not a fabricated duration - "no data" not "confident no")', resumeFile: 'examples/resume-ambiguous-dates.txt', jobFile: 'examples/job-react.txt' },
  { coverage: 'no-experience-requirement', label: 'Job with Required Skills but no MinExperienceYears at all (expected: experience category absent from breakdown entirely, not scored as 0 or 100)', resumeFile: 'examples/resume-frontend-junior.txt', jobFile: 'examples/job-react-no-exp.txt' },
  { coverage: 'keywords-without-skills', label: 'Job with only a Keywords field, no Required Skills, no MinExperienceYears (expected: exposes that Keywords are not consumed by matching at all yet, in either engine)', resumeFile: 'examples/resume-devops.txt', jobFile: 'examples/job-devops-keywords-only.txt' },
  { coverage: 'long-cv', label: 'Long resume - 3 roles, 10 skills, education, projects -> Job requiring a subset (expected: parses fully and scores correctly at scale, not just on short fixtures)', resumeFile: 'examples/resume-long.txt', jobFile: 'examples/job-node-bachelor.txt' },
  { coverage: 'short-cv', label: 'Short but well-formed resume (1 skill line, 1 clean 1yr role) -> React Job (expected: low breadth but high parse confidence - distinct from the sparse/ambiguous incomplete-cv case)', resumeFile: 'examples/resume-short-clean.txt', jobFile: 'examples/job-react.txt' }
];

const pipelineConfig: PipelineConfig = {
  algorithmVersion: '0.0.0',
  weights: { skills: 0.4, experience: 0.25, education: 0.1, keywords: 0.15 }
};

function readFixture(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '../../', relativePath), 'utf8');
}

function formatBreakdown(breakdown: Record<string, number>): string {
  return Object.entries(breakdown).map(([k, v]) => `${k}=${v}`).join(', ');
}

function run() {
  console.log('V1 vs V2 - same input, both engines, real fixtures from examples/\n');

  for (const pair of pairs) {
    const resumeText = readFixture(pair.resumeFile);
    const jobText = readFixture(pair.jobFile);

    const v1 = generateAnalysisV1(parseResumeTextV1(resumeText), parseJobTextV1(jobText), pipelineConfig);
    const v2 = generateAnalysisV2({ resumeText, jobText, pipelineConfig }).analysis;

    console.log(`## [${pair.coverage}] ${pair.label}`);
    console.log(`   resume=${pair.resumeFile}  job=${pair.jobFile}`);
    console.log(`   V1  overall=${v1.overall}  confidence=${v1.confidence}  breakdown={ ${formatBreakdown(v1.breakdown)} }`);
    console.log(`   V2  overall=${v2.overall}  confidence=${v2.confidence}  breakdown={ ${formatBreakdown(v2.breakdown)} }`);
    const confidenceDelta = typeof v2.confidence === 'number' && typeof v1.confidence === 'number'
      ? String(v2.confidence - v1.confidence)
      : 'n/a (V2 confidence is undefined - nothing was evaluated, not a number to diff)';
    console.log(`   Delta  overall=${v2.overall - v1.overall}  confidence=${confidenceDelta}`);
    console.log(`   V1 gaps=${JSON.stringify(v1.gaps)}`);
    console.log(`   V2 gaps=${JSON.stringify(v2.gaps)}`);
    console.log('');
  }
}

run();
