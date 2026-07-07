# Specification: React Native vs React

Given:
- Resume mentions `React Native` as skill
- Job requires `React`

When:
- MatchResumeToJob

Then (Acceptance Criteria):
- CompareSkill(React Native, React) -> MatchResult.score approx 70
- MatchResult.reason indicates partial overlap ("platform-specific vs library")

Notes:
- Thresholds are configurable; spec asserts approximate expected behavior.
