# Resume-Copilot
An AI copilot to rate and improve your CV

## Repository shape

- Domain engine lives under [01-domain](01-domain)
- Benchmark scenarios live under [specifications](specifications)
- Example fixtures live under [fixtures](fixtures)

## Engine status: v1.0, frozen (2026-07-18)

The deterministic core - Parser → Evidence Builder → `Match<T>` → Score Engine → `Analysis` - is stable and considered done for a first version. Architecture and naming are documented in [ADR-004](ADR/ADR-004-parsed-document-match-model.md) and [Ubiquitous-Language.md](Ubiquitous-Language.md).

What "done" means concretely:
- Parsing (resume + job) is config-driven and covers real-world header/entry/skill shapes, not just synthetic fixtures.
- Matching (`SkillMatch`, `ExperienceMatch`, `EducationMatch`) is evidence-based; `matched` and `confidence` answer different questions on purpose, and never mix a score into the match itself.
- Scoring (`calculateSubscore`, `calculateOverallScore`) is config-driven off `PipelineConfig` weights, with zero hardcoded categories or magic constants.
- `confidence` semantics are decided and documented (`01-domain/services/generate-analysis-v2.ts`): the real average of every produced `Match<T>`'s confidence, or `undefined` - not `0` - when nothing was required at all.
- Validated against 22 real resume/job pairs spanning strong/partial/total mismatch, junior↔senior, incomplete/short/long CVs, alias resolution, symbol-named technologies, overlapping experience, ambiguous dates, and jobs with missing requirement fields (`npm run compare`, `specifications/reports/compare-v1-v2.ts`).
- 33/33 behavioral specs pass (`npm run specs`); `tsc --noEmit` is clean.

**Migration complete (2026-07-18):** `generateAnalysis()` - the public entry point - now runs `generateAnalysisV2` by default. `generateAnalysisV1` is not deleted: it stays `@deprecated`, directly importable, and is exactly what `npm run compare` diffs V2 against on every fixture. Retiring it fully (deleting the code) is a later, separate decision - this migration only changed which engine is the default.

Fase 2 (deterministic explanation facts) has started: `buildWeaknesses`/`buildStrengths` populate `Analysis.weaknesses`/`strengths` across skills, experience, and education; `buildRecommendationInput` packages those facts into the only shape a future recommendation generator may read. The `RecommendationGenerator` port exists (`01-domain/services/recommendation-generator.ts`); no implementation exists yet - that requires a new infrastructure layer, an LLM SDK dependency, and API credentials, none of which exist in this repo, per `01-domain/README.md`'s own no-external-deps rule.

New work past the engine freeze (more `Match<T>` categories beyond skill/experience/education, the LLM adapter, product/UI) continues in project roadmap.
