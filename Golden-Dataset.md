# Golden Dataset (Benchmark oficial)

Propósito: conjunto inmutable de ejemplos (resumes y jobs) y resultados esperados que servirán como benchmark para validar regresiones y mejoras.

## Included examples (initial)
- resumes/resume-frontend-junior.txt  — expected best match with job-react.txt
- resumes/resume-backend-senior.txt   — expected best match with job-java.txt
- resumes/resume-devops.txt           — expected best match with devops-like job (not included yet)
- jobs/job-react.txt
- jobs/job-java.txt
- jobs/job-ai-engineer.txt

## Expected outcomes (summary)
- `resume-frontend-junior.txt` vs `job-react.txt` → overall >= 90, confidence >= 90
- `resume-frontend-junior.txt` vs `job-ai-engineer.txt` → overall <= 40
- `resume-backend-senior.txt` vs `job-java.txt` → overall >= 90
- `resume-devops.txt` vs (devops job) → overall >= 90

## Coverage snapshot
- [x] Frontend Junior → React Job
- [x] Normalization aliases (ReactJS, Node.js, PostgreSQL)
- [ ] Backend Senior → Java Job
- [ ] DevOps → DevOps Job
- [ ] Mobile → Mobile Job
- [ ] Data Science → Data Science Job
- [ ] AI Engineer → AI Engineer Job
- [ ] Embedded → Embedded Job
- [ ] QA → QA Job
- [ ] Product Manager → Product Manager Job

## How to use
1. Run parser -> normalized resumes and jobs.
2. Run `GenerateAnalysis` for each pair.
3. Compare `Analysis` to expected outcomes (overall, breakdown, gaps).
4. When a scenario fails, inspect its rationale and update the implementation only if the domain contract truly changed.

## Maintenance
- The golden dataset is immutable by default. To update, create an ADR documenting motivation and consequences.
