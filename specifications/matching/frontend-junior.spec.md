# Specification: Frontend Junior → Frontend React Job

Given:
- Resume: `examples/resume-frontend-junior.txt`
- Job: `examples/job-react.txt`

When:
- GenerateAnalysis with default `PipelineConfig` (weights: skills 40, experience 25, education 10, keywords 15, certifications 5, languages 5)

Then (Acceptance Criteria):
- `analysis.overall` >= 90
- `breakdown.skills` >= 90
- `gaps` does not contain `React` or `TypeScript`
- `analysis.confidence` >= 90

Notes:
- This spec validates that a clearly matching resume scores highly and reports high confidence.
