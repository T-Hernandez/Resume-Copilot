# ADR-004: ParsedDocument model and Match<T> as the domain's matching representation

Date: 2026-07-18

## Status
Accepted

## Context
ADR-003 established `MatchResult` with `score`, `confidence`, `reason`, and `evidence[]` embedded together in one object. Building the resume/job parsers and a real Evidence-based matching path (this session) exposed a structural problem with that shape: embedding `score` directly on a match couples two independent questions - "did the resume satisfy this requirement" and "how many points is that worth" - into one value, decided at the same time, by the same code. In practice this meant the matching logic could not be reasoned about or tested independent of scoring weights, and score-affecting heuristics accumulated directly inside the matching path over time.

That accumulation is not hypothetical. `generateAnalysisV1` (the `MatchResult`-based pipeline this ADR concerns) was benchmarked against a parallel implementation (`generateAnalysisV2`, built on the model this ADR formalizes) across 14 real resume/job fixture pairs (`specifications/reports/compare-v1-v2.ts`, `npm run compare`) and found to have four concrete, reproducible defects, all traceable to score logic living inside the matching/analysis path instead of being separated from it:
1. A single resume skill falling outside a small hardcoded whitelist zeroed the entire analysis (`overall`, every `breakdown` category, and `confidence` all forced to 0), regardless of everything else the candidate had.
2. `breakdown` categories with no actual `Match` producer (`education`, `keywords`, `certifications`, `languages`) were unconditionally reported as a flat 100, inflating scores for candidates who matched nothing in those categories.
3. `breakdown.skills` was floored at 90 the moment any single required skill matched, regardless of how many were actually required.
4. Skills mentioned only in Experience bullets (not a literal `Skills:` line) were invisible to matching entirely.

None of these were fixed by patching `MatchResult` in place; they were absent by construction in the alternative model, because that model does not let scoring logic touch the matching decision at all.

## Decision
The domain's canonical representation for "did the resume satisfy a requirement, and why" is the generic `Match<T>` (`01-domain/value-objects/match.ts`): `{ query: T, matched: boolean, confidence: number, evidence: Evidence[] }`. It never carries a score. `Evidence` (`01-domain/value-objects/evidence.ts`) represents individual facts an Evidence Builder found, one per source (`resume.skills`, `resume.experience`, `resume.education`, `resume.summary`, `resume.projects`).

The canonical parsed intermediate representations are `ParsedResumeDocument` (`01-domain/services/parse-resume-document.ts`) and `ParsedJobDocument` (`01-domain/services/parse-job-document.ts`). These are what `ParseResume`/`ExtractRequirements` actually produce going forward - `Resume`/`Job` (the entities ADR-003 and the original Ubiquitous Language were written against) remain in the codebase only as long as `generateAnalysisV1` is still live. Once V1 is retired, `Resume`/`Job` should be reconsidered as no longer domain-canonical, per the project's own standard that a type not used by the live domain does not belong in the entity model.

Score is computed exclusively by the Score Engine (`calculateSubscore`, `calculateOverallScore` in `01-domain/services/`) from `Match<T>[]`, driven entirely by `PipelineConfig` weights, per ADR-001. No `Match<T>` producer (`matchSkill`, `matchExperience`, `matchEducation`) may compute or embed a score of any kind.

## Alternatives considered
- Keep `MatchResult` with `score` embedded (ADR-003's original design) - rejected. This is the design that produced the four defects above; the coupling of "matched" and "worth how many points" is the root cause, not an implementation detail of it.
- Generalize `MatchResult` in place with a generic `query` field, keeping `score`/`reason`/`resumeRef`/`jobRef` - rejected. `MatchResult`'s shape doesn't generalize cleanly across skill/experience/education requirements without becoming either a bag of mostly-unused optional fields or a discriminated union per category; `Match<T>` with a generic query and no score was validated across three independent instantiations (`SkillMatch`, `ExperienceMatch`, `EducationMatch`) without requiring a single change to the Score Engine, which is the concrete evidence this ADR relies on for "generalizes cleanly."
- Accepted: `Match<T>` + `Evidence` + a separate Score Engine, as implemented and benchmarked.

## Consequences
- Supersedes ADR-003's `MatchResult`-with-`score` design as the domain's canonical matching representation going forward. `MatchResult`, `matching/compare-skill.ts`, and `matching/match-resume-to-job.ts` are not deleted by this ADR - they remain as `generateAnalysisV1`'s implementation until V1 is explicitly retired (see the migration plan in project memory / a future ADR covering that retirement), but they are no longer the model new work should follow.
- `Analysis` (ADR-002) remains the central object. Its `matches: MatchResult[]` field is deliberately left empty by `generateAnalysisV2` rather than populated with a synthesized score - real per-match detail (with evidence) is exposed alongside `analysis` as `skillMatches`/`experienceMatch`/`educationMatch`, not nested inside it. Whether `Analysis` itself should change shape once `MatchResult` has no remaining producer is out of scope here - a decision for whenever V1's retirement is actually executed.
- `Ubiquitous-Language.md` is updated alongside this ADR (companion change) to add `Match<T>`, `ParsedResumeDocument`, and `ParsedJobDocument` as canonical nouns, and to mark `Resume`, `Job`, and `MatchResult` as transitional pending V1's retirement.
- The public API contract - what `01-domain/services/generate-analysis.ts`'s wrapper returns, and whether `Resume`/`Job` are exposed at all - is explicitly out of scope for this ADR. That is a separate decision, to be made only after this ADR and the Ubiquitous Language update exist, per the project's own documentation-before-code-change process for changes of this kind.

## Implementation notes
- `01-domain/value-objects/match.ts` (`Match<T>`), `01-domain/value-objects/evidence.ts` (`Evidence`, `EvidenceSource`, `EvidenceLocation`).
- `01-domain/matching/match-skill.ts`, `match-experience.ts`, `match-education.ts` - Evidence Builder + Matching Engine pairs, one per category, each reusing `matching/match-confidence.ts`'s `matchConfidence(evidence)` unchanged.
- `01-domain/services/calculate-subscore.ts`, `calculate-overall-score.ts` - the Score Engine, the only code allowed to turn `Match<T>[]` into a number.
- `01-domain/services/parse-resume-document.ts` (`ParsedResumeDocument`), `parse-job-document.ts` (`ParsedJobDocument`) - canonical parsed intermediate shapes.
- `01-domain/services/generate-analysis-v2.ts` (`generateAnalysisV2`) - the pipeline composing all of the above into an `Analysis`.
- Empirical evidence for the "Consequences" and "Context" sections above: `specifications/reports/compare-v1-v2.ts` (`npm run compare`), 14 tagged real-fixture pairs, and `specifications/scenarios/generate-analysis-v2.scenario.ts`.
