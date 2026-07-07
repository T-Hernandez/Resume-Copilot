# Specification: Frontend Junior → DevOps Job (mismatch)

Given:
- Resume: `examples/resume-frontend-junior.txt`
- Job: `examples/job-ai-engineer.txt` (or a DevOps job)

When:
- GenerateAnalysis with default `PipelineConfig`

Then (Acceptance Criteria):
- `analysis.overall` <= 40
- `gaps` contains `Docker`, `Kubernetes`, `AWS`
- `breakdown.skills` <= 40

Notes:
- Validates clear mismatch and presence of expected gaps.
