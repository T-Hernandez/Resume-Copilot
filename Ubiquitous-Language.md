# Ubiquitous Language

Propósito: definir los sustantivos y verbos oficiales del dominio para evitar ambigüedades durante el diseño e implementación.

## Sustantivos (Entities)
- Resume
- Job
- Skill
- Keyword
- Experience
- Education
- Certification
- Project
- MatchResult
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
- ParseResume(rawInput) -> ParsedResume
- NormalizeResume(parsedResume) -> NormalizedResume
- ExtractSkills(resume) -> SkillInstance[]
- ExtractRequirements(jobText) -> Job
- CompareSkill(resumeSkill, jobSkill) -> MatchResult
- MatchResumeToJob(resume, job) -> MatchResult[]
- CalculateSubscore(matchResults, category) -> number
- CalculateOverallScore(breakdown, pipelineConfig) -> number
- GenerateAnalysis(resume, job, pipelineConfig) -> Analysis

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

## Nota
Mantener este archivo como la referencia canónica del lenguaje del dominio; cualquier nueva función o nombre debe añadirse aquí y discutirse en un ADR si cambia el significado.
