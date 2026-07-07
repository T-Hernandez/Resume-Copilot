# Specification: Job without explicit skills

Given:
- Resume: `examples/resume-frontend-junior.txt` (or similar)
- Job: a Job description lacking `Required Skills` field (minimal text)

When:
- GenerateAnalysis

Then (Acceptance Criteria):
- `Analysis` is produced (no hard failure)
- System emits a warning in `metadata` indicating low job signal
- `analysis.confidence` is low (e.g. < 60)

Notes:
- Tests system behaviour when job description is underspecified.
