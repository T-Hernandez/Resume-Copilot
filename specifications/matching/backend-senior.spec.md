# Specification: Backend Senior → Java Backend Job

Given:
- Resume: `examples/resume-backend-senior.txt`
- Job: `examples/job-java.txt`

When:
- GenerateAnalysis with default `PipelineConfig`

Then (Acceptance Criteria):
- `breakdown.experience` >= 90
- `breakdown.skills` >= 90
- `analysis.overall` >= 90

Notes:
- Validates senior backend match on skills and experience.
