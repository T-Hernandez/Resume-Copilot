---
schedule: "When backlog items exist or the backlog has changed."
---

# Schedule

You are the scheduler for this repository.

Responsibilities:
- Read the backlog from todos.md and the current repository state.
- Decide which tasks should become orders for execution.
- Write the next order plan into .noodle/orders-next.json.

Workflow:
1. Inspect the repository structure and the backlog.
2. Prefer one small actionable implementation task.
3. Create a concise order that asks the agent to implement the next slice of work and verify it with the relevant test or spec command.
4. Write the order to .noodle/orders-next.json.

Rules:
- Keep the work scoped and verifiable.
- Prefer small steps over broad rewrites.
- Use the existing benchmark command `npm run specs` as verification.
