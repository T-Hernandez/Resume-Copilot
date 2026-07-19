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
- 30/30 behavioral specs pass (`npm run specs`); `tsc --noEmit` is clean.

Two implementations of `GenerateAnalysis` currently coexist: `generateAnalysisV1` (still the default, `@deprecated` per ADR-004, kept only so the benchmark can keep diffing it against V2) and `generateAnalysisV2` (the model this freeze describes). Retiring V1 and changing the public entry point is an explicit, separate decision, not yet made.

New work past this point (more `Match<T>` categories, LLM explanation, product/UI) is out of scope for the engine freeze - see project roadmap.
