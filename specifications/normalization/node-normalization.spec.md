# Specification: Skill normalization Node + Node.js -> Node.js

Given:
- Resume raw contains `node`, `NodeJS`, `node.js`

When:
- NormalizeResume

Then (Acceptance Criteria):
- NormalizedResume.skills includes canonical `Node.js`
- CompareSkill(node, Node.js) -> MatchResult.score == 100
