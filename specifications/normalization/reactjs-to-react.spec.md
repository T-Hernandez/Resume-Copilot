# Specification: Skill normalization ReactJS -> React

Given:
- Resume raw contains `ReactJS` and `react` and `React.js`

When:
- NormalizeResume (skill normalization step)

Then (Acceptance Criteria):
- NormalizedResume.skills contains a canonical `React` entry
- All aliases map to same canonical value
- CompareSkill(ReactJS, React) -> MatchResult.score == 100

Notes:
- Validates aliasing and canonicalization logic.
