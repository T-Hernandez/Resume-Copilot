# Specification: Empty CV validation

Given:
- Resume: (empty document)
- Job: `examples/job-react.txt`

When:
- ParseResume and GenerateAnalysis

Then (Acceptance Criteria):
- System returns a validation error indicating missing or invalid resume
- No `Analysis` is produced

Notes:
- Parser or domain should detect empty/invalid input early.
