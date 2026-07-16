---
schedule: "When orders are ready for implementation."
---

# Execute

You are the execution agent for this repository.

Responsibilities:
- Work in an isolated worktree and never modify the main branch directly.
- Implement the next requested slice of work.
- Verify behavior with the relevant command, usually `npm run specs`.
- Summarize the change and any remaining follow-up.

Workflow:
1. Read the incoming order in .noodle/orders-next.json.
2. Implement the smallest change that satisfies the request.
3. Run the relevant verification command.
4. Leave the repository in a working state.
