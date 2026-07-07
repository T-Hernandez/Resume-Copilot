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

## How to use
1. Run parser -> normalized resumes and jobs.
2. Run `GenerateAnalysis` for each pair.
3. Compare `Analysis` to expected outcomes (overall, breakdown, gaps).

## Maintenance
- The golden dataset is immutable by default. To update, create an ADR documenting motivation and consequences.
