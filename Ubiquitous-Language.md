# Ubiquitous Language

Propósito: definir los sustantivos y verbos oficiales del dominio para evitar ambigüedades durante el diseño e implementación.

## Sustantivos (Entities)
- Resume *(transicional - vigente mientras exista `generateAnalysisV1`; ver ADR-004)*
- Job *(transicional - vigente mientras exista `generateAnalysisV1`; ver ADR-004)*
- ParsedResumeDocument *(añadido en ADR-004; sustituye a Resume/`ParsedResume` como resultado real de ParseResume)*
- ParsedJobDocument *(añadido en ADR-004; sustituye a Job como resultado real de ExtractRequirements)*
- Skill
- Keyword
- Experience
- Education
- Certification
- Project
- MatchResult *(transicional - vigente mientras exista `generateAnalysisV1`; ver ADR-004)*
- Match<T> *(añadido en ADR-004; representación canónica de "¿se cumplió este requisito, y por qué?" - nunca incluye score. Instancias concretas: SkillMatch, ExperienceMatch, EducationMatch)*
- Analysis
- Gap
- Strength
- Weakness
- Recommendation
- Evidence
- Score
- Confidence
- PipelineConfig

## Verbos oficiales (Behavior / Commands)

### Dominio (Core)
- ParseResume(rawInput) -> ParsedResumeDocument *(ADR-004: antes -> ParsedResume/Resume, transicional mientras exista `generateAnalysisV1`)*
- NormalizeResume(parsedResume) -> NormalizedResume *(transicional, ver nota ADR-004; V2 normaliza dentro del Evidence Builder, no como paso separado)*
- ExtractSkills(resume) -> SkillInstance[]
- ExtractRequirements(jobText) -> ParsedJobDocument *(ADR-004: antes -> Job, transicional mientras exista `generateAnalysisV1`)*
- BuildEvidence(query, parsedResumeDocument) -> Evidence[] *(añadido en ADR-004; el Evidence Builder - encuentra hechos, no decide)*
- Match(query, parsedResumeDocument) -> Match<T> *(añadido en ADR-004; la Matching Engine - decide matched/confidence a partir de Evidence, nunca calcula score. Instancias: MatchSkill, MatchExperience, MatchEducation)*
- CompareSkill(resumeSkill, jobSkill) -> MatchResult *(transicional, ver ADR-004)*
- MatchResumeToJob(resume, job) -> MatchResult[] *(transicional, ver ADR-004)*
- CalculateSubscore(matches, category) -> number *(ADR-004: opera sobre Match<T>[], no sobre MatchResult[])*
- CalculateOverallScore(breakdown, pipelineConfig) -> number
- GenerateAnalysis(resume, job, pipelineConfig) -> Analysis *(hoy implementado por `generateAnalysisV1`; `generateAnalysisV2` es la implementación basada en Match<T> descrita en ADR-004, validada en paralelo vía `npm run compare` - el verbo de dominio no cambia, la implementación detrás sí es una decisión pendiente, ver roadmap)*

### Aplicación / Presentación (externo a dominio)
- GenerateRecommendations(analysis) -> Recommendation[]
- PresentAnalysis(analysis) -> PresentationModel
- ExportAnalysis(analysis, format) -> file
- VersionAlgorithm(versionString) (se registra en metadata)
- AuditAnalysis(analysisId, resume, job, algorithmVersion) -> reproducibleResult

## Verbos prohibidos (no usar)
- Process
- Handle
- Manage
- Do
- RunAnalysis (usar `GenerateAnalysis`)

## Convenciones de nombres
- Usar verbo+Entidad para funciones: `NormalizeResume()`, `ExtractSkills()`.
- Evitar nombres genéricos; preferir claridad sobre concisión.

## Ejemplos de uso (pseudocódigo)

```text
parsed = ParseResume(rawPdf)
normalized = NormalizeResume(parsed)
skills = ExtractSkills(normalized)
job = ExtractRequirements(jobText)
matches = MatchResumeToJob(normalized, job)
breakdown = CalculateSubscore(matches)
overall = CalculateOverallScore(breakdown, pipelineConfig)
analysis = GenerateAnalysis(normalized, job, pipelineConfig)
recommendations = GenerateRecommendations(analysis)
presentation = PresentAnalysis(analysis)
```

Flujo equivalente bajo el modelo de ADR-004 (`generateAnalysisV2`, no vigente por defecto todavía):

```text
resumeDoc = ParseResume(rawText)              // -> ParsedResumeDocument
jobDoc = ExtractRequirements(jobText)          // -> ParsedJobDocument
evidence = BuildEvidence(query, resumeDoc)     // -> Evidence[], por cada requisito
match = Match(query, resumeDoc)                // -> Match<T>, nunca incluye score
breakdown = CalculateSubscore(matches)         // opera sobre Match<T>[]
overall = CalculateOverallScore(breakdown, pipelineConfig)
analysis = GenerateAnalysis(resumeDoc, jobDoc, pipelineConfig)
```

## Nota
Mantener este archivo como la referencia canónica del lenguaje del dominio; cualquier nueva función o nombre debe añadirse aquí y discutirse en un ADR si cambia el significado.

## Nota de transición (2026-07-18, ver ADR-004)
El dominio tiene actualmente dos implementaciones de `GenerateAnalysis` conviviendo: `generateAnalysisV1` (basada en `Resume`/`Job`/`MatchResult`, la que se ejecuta por defecto hoy) y `generateAnalysisV2` (basada en `ParsedResumeDocument`/`ParsedJobDocument`/`Match<T>`, descrita en ADR-004, validada contra fixtures reales vía `npm run compare` pero todavía no es el camino por defecto). Los sustantivos/verbos marcados como *"transicional"* arriba siguen siendo válidos mientras V1 exista; no deben eliminarse de este documento hasta que V1 se retire formalmente. Cuál de las dos implementaciones queda como `GenerateAnalysis` por defecto - y si `Resume`/`Job`/`MatchResult` se retiran del modelo del dominio - es una decisión posterior, explícitamente fuera del alcance de ADR-004.
