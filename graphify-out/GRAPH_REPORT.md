# Graph Report - .  (2026-07-17)

## Corpus Check
- Corpus is ~12,275 words - fits in a single context window. You may not need a graph.

## Summary
- 290 nodes · 446 edges · 44 communities (15 shown, 29 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 40 edges (avg confidence: 0.87)
- Token cost: 182,174 input · 0 output

## Community Hubs (Navigation)
- Matching & Analysis Core
- Resume Parsing & Normalization
- Frontend Skill Match Fixtures
- Document Processing Pipeline
- Backend/DevOps Skill Fixtures
- Domain Spec & ADRs
- Spec Runner & Scenarios
- Noodle Agent Tooling
- TypeScript Config
- Project Docs & READMEs
- NPM Package Config
- Deterministic Scoring Principle
- Resume Section Parser
- Backlog Sync Adapter
- Top-Level Domain Docs
- Domain Value Rules
- Algorithm Versioning
- Golden Dataset Fixtures
- Backlog Add Adapter
- Backlog Done Adapter
- Backlog Edit Adapter
- Skill Authoring Concepts
- Fixture Format Convention
- ExtractSkills Use Case
- GenerateRecommendations Use Case
- NormalizeResume Use Case
- Java/Backend Golden Fixtures
- Noodle Adapters Config
- Noodle Routing Defaults
- Noodle Runtime Config
- Noodle Stage Composition
- Noodle General Skill Type
- Keyword Concept
- Pipeline Stages Concept
- DevOps Golden Fixture
- Product Roadmap
- Tech Stack Notes
- CalculateSubscore Use Case
- CompareSkill Use Case
- ExportAnalysis Use Case
- ExtractRequirements Use Case
- ParseResume Use Case
- PresentAnalysis Use Case
- VersionAlgorithm Use Case

## God Nodes (most connected - your core abstractions)
1. `MatchResult` - 13 edges
2. `SkillInstance` - 13 edges
3. `Resume` - 12 edges
4. `Ana Perez - Frontend Developer Resume` - 10 edges
5. `Job` - 9 edges
6. `NormalizedResume` - 9 edges
7. `runScenario()` - 9 edges
8. `compilerOptions` - 9 edges
9. `Scenario()` - 8 edges
10. `Frontend React Developer Job Posting` - 8 edges

## Surprising Connections (you probably didn't know these)
- `AuditAnalysis(analysisId, resume, job, algorithmVersion) -> reproducibleResult` --semantically_similar_to--> `Golden Dataset (Benchmark oficial)`  [INFERRED] [semantically similar]
  Ubiquitous-Language.md → Golden-Dataset.md
- `Resume-Copilot (project README)` --references--> `Golden Dataset (Benchmark oficial)`  [AMBIGUOUS]
  README.md → Golden-Dataset.md
- `Golden Dataset (Benchmark oficial)` --references--> `Normalización y Ontología de Skills`  [INFERRED]
  Golden-Dataset.md → Especificacion-del-Dominio.md
- `Experimental Benchmark` --conceptually_related_to--> `Golden Dataset (Benchmark oficial)`  [INFERRED]
  benchmark/experimental/README.md → Golden-Dataset.md
- `Set up initial domain engine benchmark and keep it green` --references--> `Golden Dataset (Benchmark oficial)`  [INFERRED]
  todos.md → Golden-Dataset.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **ADR Trio Defining the Deterministic Analysis Architecture** — adr_adr_001_deterministic_scoring_deterministic_scoring, adr_adr_002_analysis_model_analysis, adr_adr_003_matchresult_evidence_matchresult [INFERRED 0.85]
- **Noodle Orders Pipeline (mise.json -> orders-next.json -> schedule/execute agents)** — agents_skills_noodle_skill_mise_json, agents_skills_noodle_skill_orders_next_json, agents_skills_schedule_skill_schedule_agent, agents_skills_execute_skill_execute_agent [EXTRACTED 1.00]
- **GenerateAnalysis Use Case Flow (ExtractSkills -> MatchResumeToJob -> CalculateOverallScore -> GenerateAnalysis)** — domain_use_cases_generateanalysis, domain_use_cases_extractskills, domain_use_cases_matchresumetojob, domain_use_cases_calculateoverallscore [EXTRACTED 1.00]
- **Matching Specs Sharing GenerateAnalysis + PipelineConfig** — specifications_matching_backend_senior_spec, specifications_matching_frontend_junior_vs_devops_spec, specifications_matching_frontend_junior_spec, specifications_matching_job_without_skills_spec, concept_generateanalysis, concept_pipelineconfig [INFERRED 0.85]
- **Duplicate Fixture Pairing Between examples/ and fixtures/** — examples_job_react, fixtures_job_react_junior, examples_resume_frontend_junior, fixtures_resume_frontend_junior [INFERRED 0.95]
- **Skill Normalization Spec Pattern** — specifications_normalization_node_normalization_spec, specifications_normalization_reactjs_to_react_spec, concept_normalizeresume, concept_compareskill [INFERRED 0.85]

## Communities (44 total, 29 thin omitted)

### Community 0 - "Matching & Analysis Core"
Cohesion: 0.09
Nodes (22): Analysis, Breakdown, Job, ParsedJob, MatchResult, MatchType, PipelineConfig, compareExperience() (+14 more)

### Community 1 - "Resume Parsing & Normalization"
Cohesion: 0.12
Nodes (17): Education, Experience, NormalizedResume, ParsedResume, Resume, SkillDictionaryEntry, SkillInstance, SkillComparer (+9 more)

### Community 2 - "Frontend Skill Match Fixtures"
Cohesion: 0.16
Nodes (27): Analysis, CompareSkill, CSS, GenerateAnalysis, HTML, JavaScript, Jest, MatchResult (+19 more)

### Community 3 - "Document Processing Pipeline"
Cohesion: 0.17
Nodes (16): buildDocumentPipeline(), DocumentPipelineResult, ParsedDocument, ParsedSection, StructuredResume, generateAnalysis(), parseJobText(), parseResumeText() (+8 more)

### Community 4 - "Backend/DevOps Skill Fixtures"
Cohesion: 0.12
Nodes (20): AWS, CI/CD, Docker, Java, Kubernetes, Machine Learning, PipelineConfig, PostgreSQL (+12 more)

### Community 5 - "Domain Spec & ADRs"
Cohesion: 0.12
Nodes (18): pipelineConfig, Analysis (central object, ADR-002), MatchResult con evidencia (ADR-003), CalculateOverallScore (Use Case 004), GenerateAnalysis (Use Case 001), MatchResumeToJob (Use Case 003), Analysis (entity), Confidence (concept) (+10 more)

### Community 6 - "Spec Runner & Scenarios"
Cohesion: 0.27
Nodes (7): evaluateExpectation(), Expect, Given, runAll(), Scenario(), ScenarioDef, scenarios

### Community 7 - "Noodle Agent Tooling"
Cohesion: 0.15
Nodes (14): Execute (execution agent skill), .noodle.toml Configuration Reference, Orders Schema, The Pipeline (backlog → mise.json → orders-next.json → orders.json → agent runs), The schedule Field, The Loop (Brief → Schedule → Dispatch → Execute → Merge), mise.json, Noodle (+6 more)

### Community 8 - "TypeScript Config"
Cohesion: 0.14
Nodes (13): 01-domain/**/*.ts, node, specifications/**/*.ts, compilerOptions, esModuleInterop, ignoreDeprecations, module, moduleResolution (+5 more)

### Community 9 - "Project Docs & READMEs"
Cohesion: 0.20
Nodes (12): 01-domain layer (DDD rules), Repositories (persistence interfaces), Experimental Benchmark, Golden Benchmark, Separación Dominio / Infraestructura, Job (entity), Normalización y Ontología de Skills, Skill (entity) (+4 more)

### Community 10 - "NPM Package Config"
Cohesion: 0.25
Nodes (7): devDependencies, ts-node, typescript, scripts, specs, ts-node, typescript

### Community 11 - "Deterministic Scoring Principle"
Cohesion: 0.40
Nodes (5): algorithmVersion, Deterministic Scoring (ADR-001), algorithmVersion / Auditabilidad, Backend como única fuente de verdad para scoring, IA no decide, solo explica

### Community 14 - "Top-Level Domain Docs"
Cohesion: 0.67
Nodes (4): Domain Use Cases, Especificación del Dominio, Resume Analyzer PRD, Ubiquitous Language

### Community 15 - "Domain Value Rules"
Cohesion: 0.50
Nodes (4): Experience (entity), Inmutabilidad del Resume, Resume (entity), SkillInstance (entity)

### Community 17 - "Golden Dataset Fixtures"
Cohesion: 0.67
Nodes (3): job-ai-engineer.txt, job-react.txt, resume-frontend-junior.txt

## Ambiguous Edges - Review These
- `Golden Dataset (Benchmark oficial)` → `Resume-Copilot (project README)`  [AMBIGUOUS]
  README.md · relation: references
- `Ana Perez - Frontend Developer Resume` → `Spec: Job Without Explicit Skills`  [AMBIGUOUS]
  specifications/matching/job-without-skills.spec.md · relation: references

## Knowledge Gaps
- **92 isolated node(s):** `Breakdown`, `MatchType`, `SkillDictionaryEntry`, `AlgorithmVersionInfo`, `ParsedSection` (+87 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Golden Dataset (Benchmark oficial)` and `Resume-Copilot (project README)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Ana Perez - Frontend Developer Resume` and `Spec: Job Without Explicit Skills`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `Resume` connect `Resume Parsing & Normalization` to `Matching & Analysis Core`, `Document Processing Pipeline`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `Spec: Frontend Junior to DevOps Job Mismatch` connect `Backend/DevOps Skill Fixtures` to `Frontend Skill Match Fixtures`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `Breakdown`, `MatchType`, `SkillDictionaryEntry` to the rest of the system?**
  _92 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Matching & Analysis Core` be split into smaller, more focused modules?**
  _Cohesion score 0.08686868686868687 - nodes in this community are weakly interconnected._
- **Should `Resume Parsing & Normalization` be split into smaller, more focused modules?**
  _Cohesion score 0.12121212121212122 - nodes in this community are weakly interconnected._